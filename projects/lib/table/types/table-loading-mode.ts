/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * How `<wr-table>` shows `[loading]`.
 *
 * - `'auto'` — the overlay while no row is shown, the bar once rows are
 * - `'overlay'` — a veil with a spinner over the whole table
 * - `'bar'` — a thin progress bar along the top edge, rows left as they are
 */
export type WrTableLoadingMode = 'auto' | 'overlay' | 'bar';
