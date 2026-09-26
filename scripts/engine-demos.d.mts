/**
 * Types for the engine demo definitions.
 *
 * The definitions stay JavaScript because the build script is plain Node and imports
 * them directly, with no compile step in front of it. This is what lets the test that
 * holds them against the element catalogue be written in TypeScript like the rest.
 */

export interface EngineDemo {
  /** Matches the element id in the catalogue. */
  id: string;
  /** The selector its element's markup must provide for the demo to find anything. */
  root: string;
  /** Runs with `root` already bound; `return` is an early exit. */
  source: string;
  /** Imports only this demo needs. Used by engines built split. */
  imports?: string;
}

export interface EngineBundle {
  imports: string;
  demos: EngineDemo[];
  /** Shared setup spliced above each demo of this engine. */
  helpers?: string;
  /** One bundle per demo, named after the demo, instead of one for the engine. */
  split?: boolean;
  /** Build `<engine>-three.js` with only the Three.js exports the demos reference, bound as `THREE`. */
  threeSubset?: boolean;
}

export declare const ENGINES: Record<string, EngineBundle>;
export declare const ENGINE_DEMO_LIST: { id: string; engine: string; root: string; bundles: string[] }[];
