/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One segment of a {@link WrMeterGroupComponent}. */
export type WrMeterSegment = {
  /** Label shown in the legend. */
  readonly label: string;
  /** Magnitude — interpreted as a portion of the sum of all segments. */
  readonly value: number;
  /** CSS color for the bar slice and legend swatch. Defaults to `--wr-color-primary` etc. */
  readonly color?: string;
};
