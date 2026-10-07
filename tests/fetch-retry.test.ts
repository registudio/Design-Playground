import { describe, expect, it, vi } from "vitest";
import { fetchTextWithRetry } from "@/preview/fetch-retry";

const ok = (body: string) => new Response(body, { status: 200 });
const status = (code: number) => new Response("", { status: code });
const timeout = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
const options = { timeoutMs: 1000, attempts: 2, backoffMs: 0 };

describe("fetchTextWithRetry", () => {
  it("returns the body on the first success without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("export default 1"));
    await expect(fetchTextWithRetry("https://esm.sh/x", { ...options, fetchImpl })).resolves.toBe("export default 1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a timeout, because the CDN's cold build is usually done by the second try", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(timeout()).mockResolvedValueOnce(ok("built"));
    await expect(fetchTextWithRetry("https://esm.sh/vgpu", { ...options, fetchImpl })).resolves.toBe("built");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx while a build finishes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(status(502)).mockResolvedValueOnce(ok("built"));
    await expect(fetchTextWithRetry("https://esm.sh/x", { ...options, fetchImpl })).resolves.toBe("built");
  });

  it("does not retry a 404, which is a fact about the package rather than timing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(status(404));
    await expect(fetchTextWithRetry("https://esm.sh/nope", { ...options, fetchImpl })).rejects.toThrow("HTTP 404");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("says which URL timed out and after how long, instead of the bare abort message", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(timeout());
    await expect(fetchTextWithRetry("https://esm.sh/vgpu", { ...options, fetchImpl }))
      .rejects.toThrow("Timed out after 1s fetching https://esm.sh/vgpu");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports a dropped connection with its cause", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("socket hang up"));
    await expect(fetchTextWithRetry("https://esm.sh/x", { ...options, fetchImpl })).rejects.toThrow("socket hang up");
  });
});
