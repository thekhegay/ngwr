/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * How close, in px, `withPush` may park a pane to the viewport edge — 8px, the
 * `--wr-space-sm` step. Without it a 224px panel opened `bottom-end` from a
 * phone's header landed at exactly `x = 0`, its border and corner on the glass,
 * and a chart's tooltip for the last candle of a candlestick ran 0.7px past the
 * right edge of a 390px screen.
 *
 * The CDK measures the right and bottom edges against the viewport width and
 * height with the margin taken off BOTH sides, so a pane pushed back from one
 * of those stops 16px short of it rather than 8 — measured, and left alone.
 *
 * Shared by `[wrPopover]` and `useChartTooltip()`, so the two cannot drift.
 */
export const VIEWPORT_MARGIN = 8;
