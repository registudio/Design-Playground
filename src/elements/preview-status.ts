/**
 * `blank` is distinct from `failed` on purpose: the component compiled and mounted
 * without error, it simply painted nothing a viewer can see. Reporting that as "ready"
 * was the bug — a card claiming success over an empty rectangle.
 */
export type PreviewStatus = "queued" | "rendering" | "ready" | "fallback" | "blank" | "failed";
export interface PreviewObservation { status: PreviewStatus; observedAt: number }
export const previewStatuses = new Map<string, PreviewObservation>();
export function previewKey(element: { id: string; variant?: { language: string; styling: string } }): string {
  return `${element.id}:${element.variant?.language ?? "default"}:${element.variant?.styling ?? "default"}`;
}
export function recordPreview(key: string, status: PreviewStatus) {
  previewStatuses.set(key, { status, observedAt: Date.now() });
}
