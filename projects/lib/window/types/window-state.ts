/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Visual state of a `<wr-window>`:
 * - `normal` — free-floating, drag / resize allowed
 * - `minimized` — collapsed to a small bar (only the header is shown)
 * - `maximized` — pinned to the full viewport, drag / resize disabled
 */
export type WrWindowState = 'normal' | 'minimized' | 'maximized';
