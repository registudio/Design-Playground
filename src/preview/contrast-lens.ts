import { converter, parse } from "culori";

/**
 * The contrast lens: every piece of text in the preview, checked against what is
 * actually behind it, with the failures outlined in place.
 *
 * The colour editor already checks token pairs (color/contrast.ts), but a pair of tokens
 * is not what a visitor reads. The accent on a button, body text over a tinted section,
 * a muted caption on a card — those are the combinations that fail, and they only exist
 * once a section variant has put one colour on top of another. So this reads the page as
 * rendered: the computed colour of each text run, and the background it sits on, found by
 * walking up through ancestors and compositing any translucency along the way.
 *
 * Text over an image or gradient cannot be judged from styles alone. It is counted as
 * "check by eye" rather than guessed at — a guess would be the one failure it hides.
 */

const toRgb = converter("rgb");

export interface Rgba { r: number; g: number; b: number; alpha: number }

/** Any CSS colour a browser computes (rgb(), oklch(), color(srgb …)) as sRGB 0..1. */
export function parseCssColor(value: string): Rgba | null {
  if (!value || value === "transparent") return { r: 0, g: 0, b: 0, alpha: 0 };
  const parsed = parse(value);
  const rgb = parsed && toRgb(parsed);
  if (!rgb) return null;
  const clamp = (v: number) => Math.min(1, Math.max(0, v || 0));
  return { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b), alpha: rgb.alpha ?? 1 };
}

/** `top` painted over an opaque `bottom`. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.alpha;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    alpha: 1,
  };
}

function luminance({ r, g, b }: Rgba): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 contrast ratio of two opaque colours, 1..21. */
export function ratio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG "large text": 24px, or 18.66px (14pt) when bold. */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
}

/** The AA minimum for text of this size. */
export const requiredRatio = (large: boolean) => (large ? 3 : 4.5);

export interface LensFinding {
  element: Element;
  ratio: number;
  required: number;
}

export interface LensReport {
  /** Text runs measured. */
  checked: number;
  /** Below AA for their size. */
  failing: LensFinding[];
  /** Over an image or gradient: not judged. */
  unknown: number;
}

const WHITE: Rgba = { r: 1, g: 1, b: 1, alpha: 1 };
const SKIP = "script,style,noscript,template,iframe,svg,canvas,video,[data-dp-lens]";

function ownText(element: Element): boolean {
  for (const node of element.childNodes) if (node.nodeType === 3 && node.textContent?.trim()) return true;
  return false;
}

/**
 * The opaque colour behind `element`, or null when an image or gradient is part of it.
 * Walks outward compositing translucent backgrounds, and treats a zero opacity or an
 * unpainted canvas as the white a browser would show.
 */
function backdrop(element: Element, view: Window): Rgba | null {
  const layers: Rgba[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (style.backgroundImage && style.backgroundImage !== "none") return null;
    const colour = parseCssColor(style.backgroundColor);
    if (colour && colour.alpha > 0) {
      layers.push(colour);
      if (colour.alpha >= 1) break;
    }
  }
  return layers.reduceRight((under, layer) => composite(layer, under), WHITE);
}

export function scanContrast(doc: Document): LensReport {
  const view = doc.defaultView;
  const report: LensReport = { checked: 0, failing: [], unknown: 0 };
  if (!view) return report;
  for (const element of doc.body.querySelectorAll("*")) {
    if (element.closest(SKIP) || !ownText(element)) continue;
    const style = view.getComputedStyle(element);
    if (style.visibility !== "visible" || Number(style.opacity) === 0) continue;
    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const text = parseCssColor(style.color);
    if (!text || text.alpha === 0) continue;
    const behind = backdrop(element, view);
    if (!behind) { report.unknown += 1; continue; }
    report.checked += 1;
    const measured = ratio(composite(text, behind), behind);
    const required = requiredRatio(isLargeText(Number.parseFloat(style.fontSize), Number(style.fontWeight)));
    // Rounded as displayed, so a badge never reads "4.50:1" on something that failed.
    if (Math.floor(measured * 100) / 100 < required) report.failing.push({ element, ratio: measured, required });
  }
  return report;
}

/** Outlines each failing text run with its ratio. Replaces any previous overlay. */
export function drawLens(doc: Document, report: LensReport): void {
  clearLens(doc);
  const view = doc.defaultView;
  if (!view) return;
  const layer = doc.createElement("div");
  layer.dataset.dpLens = "";
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483646;pointer-events:none";
  for (const { element, ratio: value, required } of report.failing) {
    const box = element.getBoundingClientRect();
    const mark = doc.createElement("div");
    mark.style.cssText = `position:absolute;left:${box.left + view.scrollX - 2}px;top:${box.top + view.scrollY - 2}px;width:${box.width + 4}px;height:${box.height + 4}px;outline:2px dashed #e5484d;outline-offset:0;border-radius:3px;background:rgba(229,72,77,.08)`;
    const badge = doc.createElement("span");
    badge.textContent = `${value.toFixed(2)}:1 · needs ${required}`;
    // Above the outline, unless that would put it off the top of the page.
    const room = box.top + view.scrollY >= 22;
    badge.style.cssText = `position:absolute;left:-2px;${room ? "top:-20px" : "top:calc(100% + 2px)"};white-space:nowrap;font:600 11px/16px system-ui,sans-serif;padding:1px 6px;border-radius:3px;background:#e5484d;color:#fff`;
    mark.appendChild(badge);
    layer.appendChild(mark);
  }
  doc.body.appendChild(layer);
}

export function clearLens(doc: Document): void {
  for (const node of doc.querySelectorAll("[data-dp-lens]")) node.remove();
}

/**
 * Keeps the lens current while it is on: re-scans after the page changes, fonts load or
 * the frame resizes, debounced so a slider drag is one scan, not sixty. Returns the stop
 * function, which also removes the overlay.
 */
export function watchContrast(doc: Document, onReport: (report: LensReport) => void): () => void {
  const view = doc.defaultView;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    timer = undefined;
    const report = scanContrast(doc);
    drawLens(doc, report);
    onReport(report);
  };
  const schedule = () => { if (timer === undefined) timer = setTimeout(run, 250); };
  // The overlay is itself a mutation; ignore it, or every scan would schedule the next.
  const lens = (node: Node) => (node as HTMLElement).dataset?.dpLens !== undefined;
  const ours = (record: MutationRecord) => record.type === "childList"
    ? [...record.addedNodes, ...record.removedNodes].length > 0 && [...record.addedNodes, ...record.removedNodes].every(lens)
    : !!(record.target as Element).closest?.("[data-dp-lens]");
  const observer = new MutationObserver(records => { if (!records.every(ours)) schedule(); });
  // Classes, not `style`: animation libraries write inline styles every frame, and a
  // lens re-scanning at frame rate would cost more than the page it is checking.
  observer.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  view?.addEventListener("resize", schedule);
  void doc.fonts?.ready.then(schedule);
  // Token changes land in a <style> in <head>, outside the body observer.
  const head = new MutationObserver(schedule);
  head.observe(doc.head, { subtree: true, childList: true, characterData: true });
  run();
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    observer.disconnect();
    head.disconnect();
    view?.removeEventListener("resize", schedule);
    clearLens(doc);
  };
}
