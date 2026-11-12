/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The edge of the element that drags. `start` and `end` are logical, so they
 * swap sides under `dir="rtl"`; `top` and `bottom` never move.
 */
export type WrResizableEdge = 'start' | 'end' | 'top' | 'bottom';
