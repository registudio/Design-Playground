export type PreviewStatus = "queued" | "rendering" | "ready" | "fallback" | "failed";
export interface PreviewObservation { status: PreviewStatus; observedAt: number }
export const previewStatuses = new Map<string, PreviewObservation>();
export function previewKey(element: { id: string; variant?: { language: string; styling: string } }): string {
  return `${element.id}:${element.variant?.language ?? "default"}:${element.variant?.styling ?? "default"}`;
}
export function recordPreview(key: string, status: PreviewStatus) {
  previewStatuses.set(key, { status, observedAt: Date.now() });
}
