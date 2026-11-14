/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type WrChartMarkerExtent,
  type WrChartMarkerShape,
  wrChartMarkerExtent,
  wrChartMarkerPath,
  wrChartRound,
} from 'ngwr/charts/core';

/** The most markers a cache holds before it starts over: a bubble chart has a radius per size. */
const CACHE_LIMIT = 4096;

/** How many numbers follow each command `wrChartMarkerPath` writes. */
const ARGUMENTS: Readonly<Record<string, number>> = { M: 2, L: 2, A: 7, Z: 0 };

const write = (value: number): string => String(wrChartRound(value, 3));

/** What a marker of one shape and one radius is drawn and measured with. */
export interface WrScatterMarker {
  /** Its path about the origin. */
  readonly d: string;
  /** The same path in relative commands from its centre: what follows an `M` to the centre in a path of many markers. */
  readonly relative: string;
  /** How far it reaches from its centre, in px. */
  readonly extent: WrChartMarkerExtent;
}

/**
 * A marker path in relative commands: `M -3 0 A 3 3 0 1 0 3 0 …` as `m-3 0a3 3 0 1 0 6 0…`.
 * After an `M` to a point, it draws the marker about that point, so a thousand markers
 * are a thousand short prefixes on one cached string rather than a thousand paths. Reads
 * the `M`, `L`, `A` and `Z` the shared marker paths are written in.
 */
export function wrScatterRelativePath(d: string): string {
  const tokens = d.split(/\s+/).filter(Boolean);
  let out = '';
  let x = 0;
  let y = 0;
  for (let at = 0; at < tokens.length;) {
    const command = tokens[at++];
    const count = ARGUMENTS[command];
    if (count === undefined) return '';
    const values = tokens.slice(at, at + count).map(Number);
    at += count;
    if (command === 'Z') {
      out += 'z';
      continue;
    }
    const toX = values[count - 2];
    const toY = values[count - 1];
    const lead = command === 'A' ? `${values.slice(0, 5).map(write).join(' ')} ` : '';
    out += `${command.toLowerCase()}${lead}${write(toX - x)} ${write(toY - y)}`;
    x = toX;
    y = toY;
  }
  return out;
}

/**
 * The marker for each (shape, radius), built once. A plain scatter has one radius per
 * series and built the same path and the same extent for every point of it.
 */
export function wrScatterMarkerCache(): (shape: WrChartMarkerShape, r: number) => WrScatterMarker {
  const cache = new Map<string, WrScatterMarker>();
  return (shape, r) => {
    const key = `${shape}:${r}`;
    let marker = cache.get(key);
    if (!marker) {
      const d = wrChartMarkerPath(shape, r);
      marker = { d, relative: wrScatterRelativePath(d), extent: wrChartMarkerExtent(shape, r) };
      if (cache.size >= CACHE_LIMIT) cache.clear();
      cache.set(key, marker);
    }
    return marker;
  };
}

/** One marker of a path of many: its centre in percent of the drawing, and its relative path. */
export interface WrScatterDensePoint {
  readonly left: number;
  readonly top: number;
  readonly relative: string;
}

/**
 * Every marker of one series as ONE path, a subpath each, in px of a drawing `width` by
 * `height`: a centre is a percentage, which a path cannot take, so the path is written
 * for a size and written again when the size changes.
 */
export function wrScatterDensePath(points: readonly WrScatterDensePoint[], width: number, height: number): string {
  let d = '';
  for (const point of points) {
    d += `M${wrChartRound((point.left / 100) * width, 1)} ${wrChartRound((point.top / 100) * height, 1)}${point.relative}`;
  }
  return d;
}
