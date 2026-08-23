/**
 * Deterministic JSON serialization (§15.7: "identical configurations produce
 * equivalent files").
 *
 * The spec asserts determinism without defining it, which is exactly how it gets lost.
 * The concrete rules enforced here:
 *
 *   1. Object keys are emitted in sorted order, at every depth.
 *   2. Numbers are emitted at fixed precision, so floating-point drift in the colour
 *      maths cannot change a byte.
 *   3. Nothing time-varying is ever written — no timestamps, no UUIDs, no build IDs.
 *   4. Two-space indent and a trailing newline, LF endings.
 *
 * Rule 3 is a property of what the callers put in, so `assertDeterministic` exists to
 * catch a regression the moment one leaks in.
 */

const NUMBER_PRECISION = 6;

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeValue(value), null, 2) + "\n";
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number in export: ${value}`);
    // `+ 0` collapses -0, which would otherwise serialise as "-0".
    const rounded = Number(value.toFixed(NUMBER_PRECISION)) + 0;
    return rounded;
  }

  if (Array.isArray(value)) return value.map(normalizeValue);

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const normalized = normalizeValue(source[key]);
      // Drop undefined so optional fields never produce key-order-dependent output.
      if (normalized !== undefined) out[key] = normalized;
    }
    return out;
  }

  return value;
}

/** Fields whose presence would make an export non-reproducible. */
const FORBIDDEN_KEYS = ["generatedAt", "createdAt", "updatedAt", "timestamp", "buildId", "nonce"];

export function assertDeterministic(value: unknown, path = "$"): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertDeterministic(item, `${path}[${i}]`));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error(`Non-deterministic field "${key}" at ${path} would break reproducible export`);
    }
    assertDeterministic(child, `${path}.${key}`);
  }
}
