/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * How `<wr-table>` sizes its columns.
 *
 * - `'auto'` - the browser sizes each column to its content
 * - `'fixed'` - a column keeps its `width`, the rest share what is left, and text wraps
 */
export type WrTableLayout = 'auto' | 'fixed';
