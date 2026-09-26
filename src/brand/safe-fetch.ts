import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

/**
 * Fetches a URL someone typed, from the server, without letting it reach the server's
 * own network.
 *
 * A route that fetches arbitrary URLs is a way in to whatever the server can see:
 * localhost, the cloud metadata endpoint, the private network. So every connection —
 * the first and each redirect — is checked against the address it actually connects to,
 * in the socket's own DNS lookup. Checking the hostname beforehand and then connecting
 * is not enough: a name can resolve to a public address for the check and a private one
 * for the connection (DNS rebinding). Here there is only one lookup, and it is the one
 * that is checked.
 *
 * Bounded in size and time, http(s) only, three redirects at most.
 *
 * DP_BRAND_ALLOW_ADDRESSES (comma-separated, e.g. "127.0.0.1") exempts exactly those
 * addresses, for tests against a local fixture site. Everything else stays refused, so
 * a test can still prove that a redirect inward is caught. Never set it on a deployment.
 */

export class FetchRefused extends Error {}

/** Private, loopback, link-local, carrier-grade NAT, multicast, reserved — anything not the public internet. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number) as [number, number];
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)?.[1];
    if (mapped) return isPrivateAddress(mapped);
    return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff") || lower.startsWith("64:ff9b:");
  }
  return true;
}

const allowed = (address: string) =>
  (process.env.DP_BRAND_ALLOW_ADDRESSES ?? "").split(",").map((a) => a.trim()).filter(Boolean).includes(address);
const refused = (address: string) => isPrivateAddress(address) && !allowed(address);

/** The socket's own lookup, refusing any private answer. */
function guardedLookup(hostname: string, options: object, callback: (error: Error | null, address: string | LookupAddress[], family?: number) => void) {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    const list = addresses as LookupAddress[];
    const blocked = list.some((entry) => refused(entry.address));
    if (blocked || !list.length) return callback(new FetchRefused(`${hostname} is not a public address`), "");
    if ((options as { all?: boolean }).all) return callback(null, list);
    return callback(null, list[0]!.address, list[0]!.family);
  });
}

export interface SafeResponse {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
}

export async function safeFetch(input: string, { maxBytes = 2_000_000, timeoutMs = 8000, accept = "*/*" } = {}): Promise<SafeResponse> {
  let url: URL;
  try { url = new URL(input); } catch { throw new FetchRefused("That is not a web address."); }
  for (let hop = 0; hop <= 3; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchRefused("Only http and https addresses can be read.");
    if (url.username || url.password) throw new FetchRefused("Addresses with credentials are not read.");
    // A literal IP never goes through the lookup, so it is checked here instead.
    const literal = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(literal) && refused(literal)) throw new FetchRefused(`${literal} is not a public address`);

    const response = await request(url, { maxBytes, timeoutMs, accept });
    if (response.status >= 300 && response.status < 400 && response.location) {
      url = new URL(response.location, url);
      continue;
    }
    return { url: url.href, status: response.status, contentType: response.contentType, body: response.body };
  }
  throw new FetchRefused("Too many redirects.");
}

function request(url: URL, { maxBytes, timeoutMs, accept }: { maxBytes: number; timeoutMs: number; accept: string }) {
  return new Promise<{ status: number; contentType: string; location?: string; body: Buffer }>((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(url, {
      method: "GET",
      lookup: guardedLookup as never,
      headers: { accept, "user-agent": "DesignPlayground/1.0 (brand reader)" },
      timeout: timeoutMs,
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) { req.destroy(new FetchRefused("That page is too large to read.")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({
        status: res.statusCode ?? 0,
        contentType: String(res.headers["content-type"] ?? ""),
        location: typeof res.headers.location === "string" ? res.headers.location : undefined,
        body: Buffer.concat(chunks),
      }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new FetchRefused("The site took too long to answer.")));
    req.on("error", reject);
    req.end();
  });
}
