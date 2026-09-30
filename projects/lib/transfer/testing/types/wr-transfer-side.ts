/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Which pane of a `<wr-transfer>` a call is about — the left one (`'source'`, the
 * rows NOT in the value) or the right one (`'target'`, the rows that are).
 *
 * These are the component's own two names for the panes, `[sourceTitle]` /
 * `[targetTitle]` and the `wr-transfer__pane--target` modifier, rather than
 * left / right: a pane's side is a fact about the value it stands for, and under
 * `dir="rtl"` the left pane is on the right.
 */
export type WrTransferSide = 'source' | 'target';
