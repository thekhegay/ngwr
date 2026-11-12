/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * A limit on the size: pixels as a number, or a percentage of the parent's
 * matching dimension as a string (`'40%'`).
 */
export type WrResizableLimit = number | `${number}%`;
