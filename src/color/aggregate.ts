import type { Oklch } from "@/schema/primitives";
import type { AssetEntry, AssetKind } from "@/schema/assets";
import type { DetectedColor } from "@/schema/project";
import { classify, describe } from "./extract";

/**
 * Combines colour signals across every analysed asset into one ranked list, rather
 * than letting the most recently uploaded file simply overwrite whatever the palette
 * suggestion already reflected.
 *
 * Two things are meant to win a colour's ranking, and both are literal product
 * requirements rather than a guess:
 *
 *   1. Colours that belong to a logo outrank colours from decorative assets — a
 *      gradient background shouldn't out-vote the actual brand mark.
 *   2. Colours that recur across several assets outrank a colour that only appears
 *      once, even in a high-weight asset — "the most used colour" is a frequency
 *      claim, and frequency has to be measured across the whole library, not one file.
 *
 * Both signals multiply into one weight per colour, which is what lets a colour that
 * is merely common (appears in three photos) compete fairly against a colour that is
 * merely important (the logo's primary fill) without either one always winning.
 */

/** How much an asset's own kind counts toward the colours it contributes. */
const KIND_WEIGHT: Record<AssetKind, number> = {
  logo: 3,
  "logo-mark": 3,
  "logo-light": 2.5,
  "logo-dark": 2.5,
  icon: 1.5,
  "hero-image": 1,
  "product-screenshot": 0.8,
  illustration: 1,
  photography: 0.7,
  font: 0,
  other: 0.9,
};

/** Rung of a colour within its own asset's detected list decays geometrically. */
const rankDecay = (index: number) => 1 / (index + 1);

/**
 * Perceptual proximity for clustering. Thresholds are generous on purpose: two
 * near-identical brand blues sampled from different files (one raster, one vector)
 * should merge into a single ranked colour rather than split their votes.
 */
function sameCluster(a: Oklch, b: Oklch): boolean {
  const dl = Math.abs(a.l - b.l);
  const dc = Math.abs(a.c - b.c);
  let dh = Math.abs(a.h - b.h) % 360;
  dh = Math.min(dh, 360 - dh);
  return dl < 0.08 && dc < 0.05 && dh < 14;
}

interface WeightedSample {
  color: Oklch;
  weight: number;
  fromLogo: boolean;
}

/**
 * Groups perceptually-close samples and sums their weight. The cluster keeps its
 * highest-weight member's exact colour as the representative, rather than averaging —
 * blurring an exact brand hex toward a mean would defeat the point of sampling it
 * precisely in the first place (see extractFromSvg).
 */
function clusterColors(samples: WeightedSample[]): WeightedSample[] {
  const clusters: WeightedSample[][] = [];

  for (const sample of samples) {
    const cluster = clusters.find((c) => c.some((member) => sameCluster(member.color, sample.color)));
    if (cluster) cluster.push(sample);
    else clusters.push([sample]);
  }

  return clusters.map((members) => {
    const totalWeight = members.reduce((sum, m) => sum + m.weight, 0);
    const representative = members.reduce((best, m) => (m.weight > best.weight ? m : best));
    return {
      color: representative.color,
      weight: totalWeight,
      fromLogo: members.some((m) => m.fromLogo),
    };
  });
}

const LOGO_KINDS: readonly AssetKind[] = ["logo", "logo-mark", "logo-light", "logo-dark"];

/**
 * Ranks colours across every analysed asset, weighting by the asset's kind and by
 * how many assets a colour recurs in. Returns the same DetectedColor shape the
 * single-asset extractors produce, so callers don't need to know whether a palette
 * suggestion came from one file or twelve.
 */
export function aggregateAssetColors(assets: AssetEntry[], maxColors = 8): DetectedColor[] {
  const samples: WeightedSample[] = [];

  for (const asset of assets) {
    if (!asset.detectedColors?.length) continue;
    const kindWeight = KIND_WEIGHT[asset.kind] ?? 0.5;
    const fromLogo = LOGO_KINDS.includes(asset.kind);
    asset.detectedColors.forEach((color, index) => {
      samples.push({ color, weight: kindWeight * rankDecay(index), fromLogo });
    });
  }

  if (samples.length === 0) return [];

  const clustered = clusterColors(samples).sort((a, b) => b.weight - a.weight);
  const totalWeight = clustered.reduce((sum, c) => sum + c.weight, 0) || 1;

  return clustered.slice(0, maxColors).map((cluster, index) => ({
    color: cluster.color,
    weight: cluster.weight / totalWeight,
    role: classify(cluster.color),
    label: cluster.fromLogo ? `Brand ${describe(cluster.color, 0).replace(/^Brand /, "")}` : describe(cluster.color, index),
  }));
}
