/**
 * A count as the site prints it: grouped the English way, whatever the
 * visitor's locale, because the docs are written in English.
 *
 * A floor — a number the real figure is at least, such as a spec count where
 * one `it.each` stands for an unknown number of cases — reads `4,950+`. Never
 * "at least 4,950" or "~4,950": one spelling, so a reader learns it once.
 *
 * @example
 * ```ts
 * formatCount(4950); // '4,950'
 * formatCount(4950, { floor: true }); // '4,950+'
 * ```
 */
export function formatCount(n: number, options: { floor?: boolean } = {}): string {
  return new Intl.NumberFormat('en').format(n) + (options.floor ? '+' : '');
}
