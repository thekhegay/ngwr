/** Cubic ease-out — the shared tween curve for counter / count-up. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
