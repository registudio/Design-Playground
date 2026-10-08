import type { SourceId } from "./sources";

/**
 * The licence each registry publishes its components under.
 *
 * Kept per source because that is how the publishers state it: a registry item has no
 * licence field (the shadcn item format carries none), and each of these repositories
 * licenses everything it publishes in one file. Each entry was read from the licence
 * file itself, not inferred — which is why some are `null`: neither Sora UI nor
 * Componentry publishes a licence anywhere that could be found, and a guess here would
 * be the one wrong answer that looks right. Those are exported with a warning instead.
 *
 * `checked` is when the file was last read. Licences change; re-read them when it ages.
 */
export interface SourceLicence {
  /** As the publisher names it. */
  name: string;
  /** The licence file that was read. */
  url: string;
  /** In plain words, when it restricts more than MIT does. */
  restriction?: string;
  checked: string;
}

export const SOURCE_LICENCES: Record<SourceId, SourceLicence | null> = {
  bklit: {
    name: "MIT",
    // The chart components live in bklit/bklit-ui. bklit/bklit — the analytics product —
    // is CC BY-NC 4.0 and is a different project; it does not cover these.
    url: "https://github.com/bklit/bklit-ui/blob/main/LICENSE",
    checked: "2026-09-26",
  },
  kokonutui: {
    name: "MIT",
    url: "https://github.com/kokonut-labs/kokonutui/blob/main/LICENSE",
    checked: "2026-09-26",
  },
  "react-bits": {
    name: "MIT + Commons Clause",
    url: "https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md",
    restriction: "Free to use in a client's website, app or product, commercially included. The components themselves may not be sold, sublicensed or redistributed — alone, in a bundle, or ported.",
    checked: "2026-09-26",
  },
  soralabs: null,
  componentry: null,
  // Read from each repository's own licence file on 2026-10-08.
  magicui: { name: "MIT", url: "https://github.com/magicuidesign/magicui/blob/main/LICENSE.md", checked: "2026-10-08" },
  // No public repository, and no licence file found to read. Exported with a warning.
  aceternity: null,
  "motion-primitives": { name: "MIT", url: "https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md", checked: "2026-10-08" },
  "animate-ui": {
    name: "MIT + Commons Clause",
    url: "https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md",
    restriction: "Free to use, commercially included. The components themselves may not be sold or redistributed in their original form, alone or in a bundle.",
    checked: "2026-10-08",
  },
  tailark: { name: "MIT", url: "https://github.com/tailark/blocks/blob/main/LICENCE.md", checked: "2026-10-08" },
  "kibo-ui": { name: "MIT", url: "https://github.com/haydenbleasel/kibo/blob/main/license.md", checked: "2026-10-08" },
  reui: { name: "MIT", url: "https://github.com/keenthemes/reui/blob/main/LICENSE.md", checked: "2026-10-08" },
  "cult-ui": { name: "MIT", url: "https://github.com/nolly-studio/cult-ui/blob/main/LICENSE.md", checked: "2026-10-08" },
  eldoraui: { name: "MIT", url: "https://github.com/karthikmudunuri/eldoraui/blob/main/LICENSE.md", checked: "2026-10-08" },
  smoothui: { name: "MIT", url: "https://github.com/educlopez/smoothui/blob/main/LICENSE", checked: "2026-10-08" },
  // Each 21st.dev component carries its own author's terms; there is no one licence to
  // read. Exported with a warning, so the terms are checked per component.
  "21st": null,
};

export const licenceFor = (source: SourceId): SourceLicence | null => SOURCE_LICENCES[source] ?? null;

/** One line for a person: "MIT", or what to do when nothing could be verified. */
export function licenceLabel(source: SourceId): string {
  const licence = licenceFor(source);
  return licence ? licence.name : "Licence not stated — check with the publisher";
}
