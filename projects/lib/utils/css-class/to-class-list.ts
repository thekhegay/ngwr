/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from '../interfaces';

/**
 * Flattens class inputs into the de-duplicated token array `classList.add()`
 * and the CDK both require.
 *
 * **Splitting on whitespace is the point of this function, not a nicety.** The
 * CDK hands `panelClass` to `element.classList.add(...coerceArray(value))`, and
 * `coerceArray` wraps a string rather than splitting it — so one `'p-4 rounded'`
 * reaches `classList.add('p-4 rounded')`, which throws `InvalidCharacterError`
 * and takes the whole overlay down with it. Which is the first thing anyone
 * writes: a Tailwind user reaches for a space-separated string before an array.
 *
 * `false` is accepted so a call site can spell a conditional class inline
 * (`asSheet && 'wr-overlay-sheet'`) instead of building an array first.
 *
 * @example
 * ```ts
 * toClassList('wr-select-overlay', asSheet && 'wr-overlay-sheet', this.panelClass());
 * // ['wr-select-overlay', 'wr-overlay-sheet', 'p-4', 'rounded-xl']
 * ```
 */
export function toClassList(...values: readonly (WrClassInput | false)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) continue;
    // Entries of an ARRAY are split too, not only a bare string: nothing stops
    // `['btn', 'p-4 rounded']`, and the entry holding the space would throw in
    // exactly the same place a bare `'p-4 rounded'` does.
    for (const entry of typeof value === 'string' ? [value] : value) {
      if (!entry) continue;
      for (const part of entry.split(/\s+/)) {
        // A token can still be empty here: `' a '.split(/\s+/)` keeps the ends.
        if (!part || seen.has(part)) continue;
        seen.add(part);
        out.push(part);
      }
    }
  }

  return out;
}
