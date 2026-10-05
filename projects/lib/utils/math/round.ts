/**
 * Rounds `value` to `decimals` fraction digits, compensating the usual
 * floating point drift (`0.1 + 0.2` rounds to `0.3`, not `0.30000000000000004`).
 *
 * The `Number.EPSILON` nudge only bites while `|value| < 2`: it is an absolute
 * 2^-52, which is one ulp in `[1, 2)` and a fraction of one above it, so
 * `value + Number.EPSILON === value` for anything larger and the result is
 * plain `Math.round`. Correct for what this is used for — step maths and
 * fraction digits on human-sized numbers — and not a general fixed-point
 * rounder.
 *
 * @example
 * ```ts
 * round(0.1 + 0.2, 2); // 0.3
 * round(1.005, 2);     // 1.01
 * round(7.4);          // 7
 * ```
 */
export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
