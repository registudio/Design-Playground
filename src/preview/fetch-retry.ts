/**
 * Fetching a package for a preview, patiently.
 *
 * Registry item documents are small static JSON, so a short timeout is right for them
 * (an unresponsive host should resolve to a visible outcome quickly). Packages are
 * different: esm.sh builds a package on first request, and for a large one — a WebGPU
 * library, a three.js wrapper — that cold build takes far longer than any ordinary
 * response, and sometimes answers 5xx while it finishes. Giving those the registry
 * timeout meant such an item could never compile: every attempt was cut off at the same
 * point, and the next attempt started the build over from the same cold state. A longer
 * budget plus one retry lets the CDN's build finish and the second request hit it warm.
 */

export interface RetryOptions {
  /** Per-attempt limit. */
  timeoutMs: number;
  /** Total attempts, including the first. */
  attempts: number;
  /** Pause between attempts, so a build in progress has a moment to land. */
  backoffMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
}

const RETRYABLE_STATUS = (status: number) => status === 408 || status === 425 || status === 429 || status >= 500;

const isTimeout = (cause: unknown) =>
  cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Returns the response body text, or throws an error that says what happened and where.
 *
 * Retries only what a second try can plausibly fix: a timeout, a dropped connection, or a
 * retryable status. A 404 is a fact about the package, not about timing, and fails at once.
 */
export async function fetchTextWithRetry(url: string, options: RetryOptions): Promise<string> {
  const { timeoutMs, attempts, backoffMs = 1_500, fetchImpl = fetch } = options;
  let failure = `Could not fetch ${url}`;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return await response.text();
      failure = `Could not fetch ${url} (HTTP ${response.status})`;
      if (!RETRYABLE_STATUS(response.status)) break;
    } catch (cause) {
      failure = isTimeout(cause)
        ? `Timed out after ${Math.round(timeoutMs / 1000)}s fetching ${url}`
        : `Could not fetch ${url} (${cause instanceof Error ? cause.message : String(cause)})`;
    }
    if (attempt < attempts) await wait(backoffMs);
  }
  throw new Error(failure);
}
