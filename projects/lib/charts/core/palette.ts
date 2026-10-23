/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Default series colours, in order: what a series, a slice or a segment with no
 * `color` of its own takes.
 *
 * Four intents and the neutral role, and `info` is deliberately absent: it is the
 * same blue as `primary` to every reader (1.061:1 apart in light, 1.004:1 in
 * dark, and the same hue), so two adjacent series would be one series with a
 * seam. The neutral closes the list because it is the one tone here that no
 * intent is near — it used to be the `medium` intent, which v15 removed, and the
 * role resolves to the same step of the gray ramp.
 *
 * The four that sit within 1.061:1 of each other are told apart by hue alone,
 * which is why a chart that draws lines pairs each with a dash
 * (`CHART_DASHES`) and one that draws points with a shape (`CHART_MARKERS`).
 *
 * The line chart, the donut chart and the meter group each kept an identical
 * copy of this list until 15.1.
 *
 * @internal
 */
export const CHART_PALETTE: readonly string[] = [
  'var(--wr-color-primary)',
  'var(--wr-color-success)',
  'var(--wr-color-warning)',
  'var(--wr-color-danger)',
  'var(--wr-color-on-surface-muted)',
];

/**
 * The palette colour for the series at `index`, wrapping past the end.
 *
 * @internal
 */
export function chartColor(index: number): string {
  return CHART_PALETTE[wrap(index, CHART_PALETTE.length)];
}

/**
 * A dash pattern per series, so lines are told apart by SHAPE and not only by hue.
 *
 * The default palette's colours sit within about 1.06:1 of each other in relative
 * luminance, which means a reader with red-green colour blindness sees several of
 * these strokes as one grey. A legend that pairs a coloured square with a name
 * does not rescue it: matching the square to the line is exactly the step that
 * needs hue. Distinguishing series by dash is the standard remedy and the only one
 * that survives greyscale, printing and a monochrome display.
 *
 * The FIRST entry is solid on purpose. A single-series chart is the common case
 * and there is nothing to tell apart in it; the patterns only appear once a second
 * series does. Each value is an SVG `stroke-dasharray`, `''` meaning none.
 *
 * @internal
 */
export const CHART_DASHES: readonly string[] = ['', '7 4', '2 3', '10 4 2 4', '1 4', '6 3 2 3'];

/**
 * The dash pattern for the series at `index`, wrapping past the end.
 *
 * @internal
 */
export function chartDash(index: number): string {
  return CHART_DASHES[wrap(index, CHART_DASHES.length)];
}

/** `index` folded into `[0, length)`, negatives included, so a bad index still picks an entry. */
export function wrap(index: number, length: number): number {
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((i % length) + length) % length;
}
