/**
 * Clamps `value` into the inclusive `[min, max]` range.
 *
 * @example
 * ```ts
 * wrClamp(140, 0, 100); // 100
 * wrClamp(-3, 0, 100);  // 0
 * wrClamp(42, 0, 100);  // 42
 * ```
 */
export function wrClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
