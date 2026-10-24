/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One segment of a {@link WrMeterGroup}. */
export interface WrMeterSegment {
  /** Label shown in the legend. */
  readonly label: string;
  /** Its share of the bar: of `max` when set, else of the sum of the segments shown. */
  readonly value: number;
  /** CSS color for the bar slice and legend swatch. Defaults to `--wr-color-primary` etc. */
  readonly color?: string;
}
