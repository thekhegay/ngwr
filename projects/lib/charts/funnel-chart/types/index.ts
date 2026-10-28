/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One stage of a `<wr-funnel-chart>`: a name, how many reached it, and optionally its own colour. */
interface WrFunnelStage {
  /** The stage's name, beside its bar, in the tooltip and as its row header in the data table. */
  readonly label: string;
  /**
   * How many reached the stage. A value that is not a finite number is MISSING: the stage
   * draws no bar and no figure, and no conversion is worked out to or from it. Zero and a
   * negative value draw a hairline, and a negative value is printed as given but gets no
   * conversion, since a share of a negative count means nothing.
   */
  readonly value: number;
  /** Any CSS colour, `var(--wr-…)` included. Left out, the stage takes the chart's `color`. */
  readonly color?: string;
}

/**
 * Which conversions a `<wr-funnel-chart>` prints on its drawing: `previous` puts each
 * stage's share of the stage before it between the two bars, `first` puts its share of
 * the first stage under its value, `both` does both and `none` neither. The tooltip, the
 * accessible names and the data table carry both whatever this says.
 */
type WrFunnelConversion = 'both' | 'previous' | 'first' | 'none';

export type { WrFunnelConversion, WrFunnelStage };
