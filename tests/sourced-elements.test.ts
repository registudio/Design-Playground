import { describe, expect, it } from "vitest";
import { ELEMENTS, elementDocument, elementOrigin } from "@/elements/catalogue";
import { CULT_ELEMENTS } from "@/elements/cult-elements";
import { SHADER_ELEMENTS } from "@/elements/shader-elements";
import { ENGINE_SOURCES, PORT_SOURCES } from "@/elements/extended-catalogue";

/**
 * The originals that come from somewhere else.
 *
 * Two different relationships, and the difference is the thing worth protecting. The
 * shader elements run an engine bundle this project wrote, from a technique published
 * by ShaderGradient. The cult-ui elements run their own scripts, rebuilt from cult-ui's
 * React source. Neither ships the library it credits, so what each card claims has to
 * stay accurate as either set grows.
 */
describe("attribution", () => {
  it("credits cult-ui for the ports rather than calling them ours", () => {
    for (const element of CULT_ELEMENTS) {
      const origin = elementOrigin(element.id);
      expect(origin.name, element.id).toBe("cult-ui · Playground port");
      expect(origin.url, element.id).toBe("https://www.cult-ui.com/docs/components");
    }
  });

  it("names ShaderGradient as the source and WebGL as the runtime", () => {
    // These two must not collapse into one another. No ShaderGradient code ships here,
    // so naming it as the runtime would be a claim about what executes that is untrue —
    // and dropping it from the source would take the credit for the technique.
    for (const element of SHADER_ELEMENTS) {
      const origin = elementOrigin(element.id);
      expect(origin.name, element.id).toBe("ShaderGradient · Playground demo");
      expect(origin.runtime, element.id).toBe("WebGL");
    }
  });

  it("still reports an engine that does ship its library as that library", () => {
    for (const engine of ENGINE_SOURCES.filter(source => source.id !== "shader")) {
      expect(engine.runtime, engine.id).toBe(engine.label);
    }
  });

  it("keeps engine and port prefixes from colliding", () => {
    // Both are matched by `${id}-`, so one prefix that is a prefix of another would send
    // a card's credit to whichever list happened to be checked first.
    const prefixes = [...ENGINE_SOURCES, ...PORT_SOURCES].map(source => source.id);
    for (const one of prefixes) {
      for (const other of prefixes) {
        if (one !== other) expect(other.startsWith(one), `${other} starts with ${one}`).toBe(false);
      }
    }
  });

  it("shows every element's own tag, so the card says where it came from", () => {
    for (const element of CULT_ELEMENTS) expect(element.tag, element.id).toBe("cult-ui");
    for (const element of SHADER_ELEMENTS) expect(element.tag, element.id).toBe("ShaderGradient");
  });
});

describe("cult-ui ports", () => {
  it("offers eight of them", () => {
    expect(CULT_ELEMENTS.length).toBeGreaterThanOrEqual(8);
  });

  it("runs their scripts under reduced motion instead of skipping them", () => {
    // These are controls, not decoration. Dropping one out of INTERACTION_ONLY would
    // leave a tab strip that cannot change tabs and a list that cannot be reordered,
    // and nothing would throw to say so.
    for (const element of CULT_ELEMENTS) {
      expect(elementDocument(element.id), element.id).toContain(`<script>${element.js}</script>`);
    }
  });

  it("makes any script that schedules motion read the setting itself", () => {
    // The corollary of the rule above: nothing upstream will damp these, so a timer or
    // an animation in one of these scripts has to check for itself.
    for (const element of CULT_ELEMENTS) {
      if (!/setInterval|setTimeout|animate\(/.test(element.js)) continue;
      expect(element.js, element.id).toContain("prefers-reduced-motion");
    }
  });

  it("gives every button an accessible name", () => {
    // Upstream these are React components taking children, so a name is the caller's
    // problem. Here the markup is the element, so an icon-only button with nothing to
    // read is a defect in the element itself — the dock and the list handles are all
    // glyphs, and each needs its own label.
    for (const element of CULT_ELEMENTS) {
      for (const [, attributes, content] of element.html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) {
        const text = content.replace(/<[^>]*>/g, "").replace(/[\s\u2190-\u21ff\u25a0-\u27bf\u2800-\u28ff]/g, "");
        const named = /aria-label=/.test(attributes) || text.length > 0;
        expect(named, `${element.id}: <button${attributes}>${content}`).toBe(true);
      }
    }
  });
});

describe("shader gradients", () => {
  it("offers eight of them", () => {
    expect(SHADER_ELEMENTS.length).toBeGreaterThanOrEqual(8);
  });

  it("leaves their js empty, since the shader bundle carries it", () => {
    for (const element of SHADER_ELEMENTS) expect(element.js, element.id).toBe("");
  });

  it("gives the runtime the canvas it looks for", () => {
    // scripts/shader-runtime.mjs returns silently on a root with no canvas.sg-canvas,
    // which looks exactly like a card that simply has no animation.
    for (const element of SHADER_ELEMENTS) {
      expect(element.html, element.id).toContain('class="sg-canvas"');
    }
  });

  it("paints a fallback of the same colours under every canvas", () => {
    // A machine with no WebGL gets the palette rather than an empty rectangle — the
    // palette being the whole point of the element.
    for (const element of SHADER_ELEMENTS) {
      expect(element.css, element.id).toMatch(/\.sg\{background:(linear|radial)-gradient\(/);
    }
  });

  it("never colours a gradient with the project accent", () => {
    // Same rule the charts follow: an arbitrary brand colour dropped into a three-stop
    // ramp is not guaranteed to still read as a gradient.
    for (const element of SHADER_ELEMENTS) {
      expect(element.css.split(".sg{background:")[1] ?? "", element.id).not.toContain("var(--accent)");
    }
  });

  it("gives each one a different palette, so eight cards are eight pictures", () => {
    const fallbacks = SHADER_ELEMENTS.map(element => element.css.split(".sg{background:")[1]);
    expect(new Set(fallbacks).size).toBe(SHADER_ELEMENTS.length);
  });
});

describe("the library after both additions", () => {
  it("keeps every id unique", () => {
    expect(new Set(ELEMENTS.map(element => element.id)).size).toBe(ELEMENTS.length);
  });

  it("puts the sixteen new elements in categories the browse list already has", () => {
    for (const element of [...CULT_ELEMENTS, ...SHADER_ELEMENTS]) {
      expect(ELEMENTS.some(other => other.id === element.id), element.id).toBe(true);
    }
  });
});
