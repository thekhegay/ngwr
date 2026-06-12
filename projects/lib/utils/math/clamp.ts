/**
 * Clamps `value` into the inclusive `[min, max]` range.
 *
 * @example
 * ```ts
 * clamp(140, 0, 100); // 100
 * clamp(-3, 0, 100);  // 0
 * clamp(42, 0, 100);  // 42
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
