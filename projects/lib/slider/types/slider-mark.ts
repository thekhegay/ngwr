/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** A stop on the track of `<wr-slider>`: a tick at `value`, with an optional label. */
export interface WrSliderMark {
  /** Where the mark sits, in the slider's own units. */
  readonly value: number;
  /** Text under the mark, and the thumb's `aria-valuetext` while it stands on it. */
  readonly label?: string;
}
