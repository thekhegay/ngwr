/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrap } from './palette';
import type { WrChartMarkerExtent, WrChartMarkerShape } from './types';

/** Half the side of a square with the area of a circle of radius 1: √π / 2. */
const SQUARE = Math.sqrt(Math.PI) / 2;

/** Half the diagonal of that square, standing on a corner. */
const DIAMOND = SQUARE * Math.SQRT2;

/** The side of an equilateral triangle with the area of a circle of radius 1: √(4π / √3). */
const TRIANGLE_SIDE = Math.sqrt((4 * Math.PI) / Math.sqrt(3));

/** The distance from that triangle's centroid to a corner (two thirds of its height). */
const TRIANGLE_APEX = (TRIANGLE_SIDE * Math.sqrt(3)) / 3;

/**
 * A plus with arms 0.35 of their length thick, half-length `L` and half-thickness
 * `0.35 L`, has an area of `8·0.35·L² − 4·0.35²·L²`; this is the `L` that makes it π.
 */
const CROSS_ARM = Math.sqrt(Math.PI / (8 * 0.35 - 4 * 0.35 ** 2));
const CROSS_THICKNESS = CROSS_ARM * 0.35;

/**
 * How far each shape reaches from its centre at `r = 1`, read off the corners
 * {@link chartMarkerPath} draws: up, down, to either side, and to the farthest
 * corner.
 */
const EXTENTS: Readonly<Record<WrChartMarkerShape, WrChartMarkerExtent>> = {
  circle: { top: 1, bottom: 1, side: 1, radius: 1 },
  square: { top: SQUARE, bottom: SQUARE, side: SQUARE, radius: SQUARE * Math.SQRT2 },
  diamond: { top: DIAMOND, bottom: DIAMOND, side: DIAMOND, radius: DIAMOND },
  triangle: { top: TRIANGLE_APEX, bottom: TRIANGLE_APEX / 2, side: TRIANGLE_SIDE / 2, radius: TRIANGLE_APEX },
  'triangle-down': { top: TRIANGLE_APEX / 2, bottom: TRIANGLE_APEX, side: TRIANGLE_SIDE / 2, radius: TRIANGLE_APEX },
  cross: { top: CROSS_ARM, bottom: CROSS_ARM, side: CROSS_ARM, radius: Math.hypot(CROSS_ARM, CROSS_THICKNESS) },
};

/** A coordinate to three decimals, without trailing zeros, so a path stays short. */
const n = (value: number): string => String(Math.round(value * 1000) / 1000 || 0);

/** `M x y L … Z` through the given corners. */
const polygon = (points: readonly (readonly [number, number])[]): string =>
  `M ${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L ')} Z`;

/**
 * A marker shape per series, so points are told apart by SHAPE and not only by
 * hue — the dash list's job, for a chart that draws points rather than lines.
 *
 * The circle comes first for the reason the solid dash does: a single-series chart
 * has nothing to tell apart. The order then alternates corners and points, so two
 * neighbouring series never differ by a rotation alone (a square beside a diamond
 * is the pair a small marker blurs into one).
 *
 * @internal
 */
export const CHART_MARKERS: readonly WrChartMarkerShape[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'cross',
  'triangle-down',
];

/**
 * The marker shape for the series at `index`, wrapping past the end.
 *
 * @internal
 */
export function chartMarker(index: number): WrChartMarkerShape {
  return CHART_MARKERS[wrap(index, CHART_MARKERS.length)];
}

/**
 * The SVG path `d` of a marker centred on the origin, as large as a circle of
 * radius `r` — every shape has that circle's area, so a triangle reaches past it
 * and a square stays inside it, and the eye weighs them the same.
 *
 * Drawn about the origin so a chart can place it with a `transform`, or inside a
 * nested `<svg x y overflow="visible">`, and size it in pixels whatever the plot's
 * own scale. A non-finite or negative `r` draws nothing rather than a path of
 * `NaN`.
 *
 * @internal
 */
export function chartMarkerPath(shape: WrChartMarkerShape, r: number): string {
  if (!Number.isFinite(r) || r <= 0) return '';
  switch (shape) {
    case 'square': {
      const h = r * SQUARE;
      return polygon([
        [-h, -h],
        [h, -h],
        [h, h],
        [-h, h],
      ]);
    }
    case 'diamond': {
      const d = r * DIAMOND;
      return polygon([
        [0, -d],
        [d, 0],
        [0, d],
        [-d, 0],
      ]);
    }
    case 'triangle':
    case 'triangle-down': {
      // Centred on the centroid, not on the box, so a triangle sits on the same
      // point a circle would.
      const flip = shape === 'triangle' ? 1 : -1;
      const apex = r * TRIANGLE_APEX;
      const half = (r * TRIANGLE_SIDE) / 2;
      return polygon([
        [0, -apex * flip],
        [half, (apex / 2) * flip],
        [-half, (apex / 2) * flip],
      ]);
    }
    case 'cross': {
      const a = r * CROSS_ARM;
      const t = r * CROSS_THICKNESS;
      return polygon([
        [-t, -a],
        [t, -a],
        [t, -t],
        [a, -t],
        [a, t],
        [t, t],
        [t, a],
        [-t, a],
        [-t, t],
        [-a, t],
        [-a, -t],
        [-t, -t],
      ]);
    }
    case 'circle':
    default:
      // Two arcs, since one arc from a point back to itself draws nothing.
      return `M ${n(-r)} 0 A ${n(r)} ${n(r)} 0 1 0 ${n(r)} 0 A ${n(r)} ${n(r)} 0 1 0 ${n(-r)} 0 Z`;
  }
}

/**
 * How far the marker {@link chartMarkerPath} draws at `r` reaches from its centre,
 * in px, before any stroke: up, down, to either side, and to its farthest corner.
 *
 * Every shape has the circle's AREA, so `r` is not how far a marker reaches: a
 * triangle's point stands 1.56 r above its centroid, a diamond's tips 1.25 r out
 * and a cross's corners 1.24 r, while a square's sides sit 0.89 r in. A box, a hit
 * area or a margin sized by `r` alone cuts the tips off. A non-finite or negative
 * `r` reaches nowhere, as it draws nothing.
 *
 * @internal
 */
export function chartMarkerExtent(shape: WrChartMarkerShape, r: number): WrChartMarkerExtent {
  const size = Number.isFinite(r) && r > 0 ? r : 0;
  const unit = EXTENTS[shape] ?? EXTENTS.circle;
  return { top: unit.top * size, bottom: unit.bottom * size, side: unit.side * size, radius: unit.radius * size };
}
