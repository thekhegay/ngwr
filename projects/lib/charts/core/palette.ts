/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Default series colours, in order: what a series, a slice or a segment with no
 * `color` of its own takes. Each is a token of the chart theme (`--wr-chart-1` to
 * `--wr-chart-8`, declared by `ngwr/charts/core`'s stylesheet), so an app retints
 * every chart by setting the tokens and a chart's markup never names a hex.
 *
 * The palette is not the status intents: a second series is not a success and a
 * fourth is not a danger. The first is the brand colour and the last the neutral
 * role; neighbours alternate between a deep and a mid tone, so two series next to
 * each other differ in lightness as well as in hue. The stylesheet carries the
 * measured contrast of each.
 *
 * A chart that draws lines still pairs each with a dash (`WR_CHART_DASHES`), and
 * one that draws points with a shape (`WR_CHART_MARKERS`): colour is never the
 * only thing that tells two series apart.
 *
 * @internal
 */
export const WR_CHART_PALETTE: readonly string[] = [
  'var(--wr-chart-1)',
  'var(--wr-chart-2)',
  'var(--wr-chart-3)',
  'var(--wr-chart-4)',
  'var(--wr-chart-5)',
  'var(--wr-chart-6)',
  'var(--wr-chart-7)',
  'var(--wr-chart-8)',
];

/**
 * The palette colour for the series at `index`, wrapping past the end.
 *
 * @internal
 */
export function wrChartColor(index: number): string {
  return WR_CHART_PALETTE[wrap(index, WR_CHART_PALETTE.length)];
}

/**
 * The series colours every chart took before the chart theme: four status intents and
 * the neutral role. Kept for the charts that have not moved onto `--wr-chart-*` yet,
 * so each keeps its look until it does; a chart on the theme reads
 * {@link WR_CHART_PALETTE}.
 *
 * `warning` measures 1.71:1 on a white surface, under the 3:1 a graphic needs, which
 * is one of the reasons the theme's palette replaced it.
 *
 * @internal
 */
export const WR_CHART_LEGACY_PALETTE: readonly string[] = [
  'var(--wr-color-primary)',
  'var(--wr-color-success)',
  'var(--wr-color-warning)',
  'var(--wr-color-danger)',
  'var(--wr-color-on-surface-muted)',
];

/**
 * The {@link WR_CHART_LEGACY_PALETTE} colour for the series at `index`, wrapping past
 * the end.
 *
 * @internal
 */
export function wrChartLegacyColor(index: number): string {
  return WR_CHART_LEGACY_PALETTE[wrap(index, WR_CHART_LEGACY_PALETTE.length)];
}

/**
 * A dash pattern per series, so lines are told apart by SHAPE and not only by hue.
 *
 * A reader with red-green colour blindness can see two strokes of similar lightness
 * as one grey, and a legend that pairs a coloured dot with a name does not rescue it:
 * matching the dot to the line is exactly the step that needs hue. Distinguishing
 * series by dash is the standard remedy and the only one that survives greyscale,
 * printing and a monochrome display.
 *
 * The FIRST entry is solid on purpose. A single-series chart is the common case
 * and there is nothing to tell apart in it; the patterns only appear once a second
 * series does. Each value is an SVG `stroke-dasharray`, `''` meaning none.
 *
 * @internal
 */
export const WR_CHART_DASHES: readonly string[] = ['', '7 4', '2 3', '10 4 2 4', '1 4', '6 3 2 3'];

/**
 * The dash pattern for the series at `index`, wrapping past the end.
 *
 * @internal
 */
export function wrChartDash(index: number): string {
  return WR_CHART_DASHES[wrap(index, WR_CHART_DASHES.length)];
}

/** `index` folded into `[0, length)`, negatives included, so a bad index still picks an entry. */
export function wrap(index: number, length: number): number {
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((i % length) + length) % length;
}
