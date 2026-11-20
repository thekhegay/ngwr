/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A point on the track of `<wr-progress>`: a tick at `value`, with an optional label under it. */
export interface WrProgressMark {
  /** Where the mark sits, on the scale of `value`: 0 to 100. */
  readonly value: number;
  /** Text under the mark. */
  readonly label?: string;
}
