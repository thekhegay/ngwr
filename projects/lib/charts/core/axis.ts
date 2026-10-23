/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { round } from 'ngwr/utils';

import type { WrChartAxis, WrChartAxisOptions } from './types';

/** How many gaps an axis aims for by default. Five labels, four gaps. */
const TICK_COUNT = 4;

/** The axis drawn when there is no data to fit: 0 to 1 in quarters, the line chart's empty frame. */
const EMPTY: WrChartAxis = { min: 0, max: 1, step: 0.25, ticks: [1, 0.75, 0.5, 0.25, 0] };

/** The rungs of the {@link niceStep} ladder within one decade, from the top: 1, 0.5, 0.25 and 0.2 of it. */
const LADDER = [1, 0.5, 0.25, 0.2] as const;

/**
 * The `symmetric` axis for data with no span: the value in the MIDDLE, as a tick of
 * its own, with one step either side.
 *
 * Snapped outward, a flat range keeps its value inside the frame but not at its
 * centre: a lone 120 lands on an axis from 100 to 150, two fifths of the way up. The
 * step here is the largest rung of the same ladder that is at most a quarter of the
 * value and divides it exactly, so all three ticks are round: 100 / 120 / 140,
 * 4 / 5 / 6, 1234 / 1234.5 / 1235. Zero has no magnitude to take a quarter of, and
 * reads −1 / 0 / 1; a value no rung divides within twelve decades takes a quarter
 * of itself.
 */
function centredAxis(value: number): WrChartAxis {
  const magnitude = Math.abs(value);
  let step = magnitude === 0 ? 1 : magnitude / 4;
  if (magnitude > 0) {
    const top = Math.ceil(Math.log10(magnitude / 4));
    search: for (let exponent = top; exponent > top - 12; exponent--) {
      for (const rung of LADDER) {
        const candidate = rung * 10 ** exponent;
        if (candidate > magnitude / 4) continue;
        const ratio = value / candidate;
        if (Math.abs(ratio - Math.round(ratio)) < 1e-9) {
          step = candidate;
          break search;
        }
      }
    }
  }
  return { min: value - step, max: value + step, step, ticks: [round(value + step, 6), value, round(value - step, 6)] };
}

/**
 * The smallest 1 / 2 / 2.5 / 5 × 10ⁿ at or above `raw` — the conventional
 * nice-number ladder every plotting library uses to pick an axis step.
 *
 * `2.5` earns its place on the small end: without it a span that wants a step
 * of 2.1 jumps to 5 and the axis loses half its labels.
 */
export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const nice = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * A value axis for data running from `min` to `max`, SNAPPED to a readable step —
 * and the snapping is the point.
 *
 * The line chart's axis used to be "the data's max plus 10%, divided into four",
 * which lands on a round number almost never: seven integers between 3 and 35 gave
 * an axis reading 38.2 / 28.7 / 19.1 / 9.6 / 0. A chart's axis is the one part of it
 * a reader is supposed to do arithmetic against.
 *
 * So the step is rounded UP to the nearest 1, 2, 2.5 or 5 times a power of ten —
 * the conventional nice-number ladder — and the bounds are then snapped outward to
 * whole multiples of it. The same 3..35 reads 0 / 10 / 20 / 30 / 40. Snapping
 * outward replaces the old 10% padding, and where the peak still lands exactly on
 * the top it is lifted a step, since a line that ends on the frame reads as clipped.
 * `symmetric` does the same at the bottom.
 *
 * A flat range has no span to divide, so it is given its own magnitude as one (or 1,
 * at zero). With `symmetric` it is centred instead: the value is the middle of three
 * ticks, a round step on either side, whatever `tickCount` asks for. Non-finite
 * bounds, the `Math.min()` / `Math.max()` of no data, give the empty frame from 0 to
 * 1. Bounds handed in the wrong order are swapped.
 *
 * The line chart's own rule, which floors its axis at zero and never lifts it to
 * zero from below, is `chartAxis(Math.min(0, min), max)`: an all-negative series
 * keeps an axis that ends just above its peak. `includeZero` is the other reading,
 * zero inside the range on either side, which an area needs for its baseline.
 *
 * @internal
 */
export function chartAxis(min: number, max: number, options: WrChartAxisOptions = {}): WrChartAxis {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return EMPTY;
  const dataLo = Math.min(min, max);
  const dataHi = Math.max(min, max);
  const lo = options.includeZero ? Math.min(0, dataLo) : dataLo;
  const hi = options.includeZero ? Math.max(0, dataHi) : dataHi;
  // A scale with no baseline has no reason to put a lone value anywhere but the middle.
  if (options.symmetric && lo === hi) return centredAxis(lo);

  const count = options.tickCount !== undefined && options.tickCount >= 1 ? Math.round(options.tickCount) : TICK_COUNT;
  // A flat series has no span to divide, so give it one rather than a zero step.
  const span = hi - lo || Math.abs(hi) || 1;
  const step = niceStep(span / count);
  let bottom = Math.floor(lo / step) * step;
  let top = Math.ceil(hi / step) * step;
  // The data's peak sitting exactly on the frame reads as clipped, so lift the
  // ceiling by one step when the snap did not already do it. Measured against the
  // DATA, so a zero that only `includeZero` put at the top is not lifted: nothing
  // sits on it. `symmetric` holds the bottom to the same rule.
  if (top === dataHi) top += step;
  if (options.symmetric && bottom === dataLo) bottom -= step;

  // Floating-point: 0.1 + 0.2 walks past an exact bound, so count in integers and
  // multiply, and stop on the count rather than on `value >= min`.
  const gaps = Math.round((top - bottom) / step);
  const ticks: number[] = [];
  for (let i = 0; i <= gaps; i++) ticks.push(round(top - i * step, 6));
  return { min: bottom, max: top, step, ticks };
}
