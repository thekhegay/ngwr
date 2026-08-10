/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { clamp } from 'ngwr/utils';

import { hslToRgb } from './hsl-to-rgb';
import { parseHex } from './parse-hex';
import type { WrRgb } from './wr-rgb';

/**
 * `rgb(…)` / `rgba(…)`, comma- or space-separated, with an optional `/ alpha`.
 * Signs are accepted so an out-of-range channel CLAMPS the way CSS clamps it,
 * rather than failing to parse and reading as black.
 */
const RGB_RE = /^rgba?\(\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)\s*[,\s]\s*(-?[\d.]+)\s*(?:[,/]\s*(-?[\d.]+%?)\s*)?\)$/i;

/** `hsl(…)` / `hsla(…)`, with `%` optional on saturation and lightness. */
const HSL_RE =
  /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[,\s]\s*(-?[\d.]+)%?\s*[,\s]\s*(-?[\d.]+)%?\s*(?:[,/]\s*(-?[\d.]+%?)\s*)?\)$/i;

/** `0.5` and `50%` are the same alpha; anything absent is fully opaque. */
function alphaOf(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const value = raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
  return Number.isFinite(value) ? clamp(value, 0, 1) : 1;
}

function channel(raw: string): number {
  return clamp(Math.round(Number(raw)), 0, 255);
}

/**
 * Read a colour written in any format `<wr-color-picker>` can emit — hex,
 * `rgb()` / `rgba()`, `hsl()` / `hsla()` — or `null` when it is none of them.
 *
 * The picker emits in whichever format it was given, so a `[(value)]` binding
 * hands its own output straight back on the next external write. Accepting only
 * hex there (which is what it used to do) turned every non-hex value into black.
 *
 * `null` rather than a throw or a black fallback: the caller is often a text
 * field mid-typing, where "not valid yet" is the normal state.
 */
export function parseColor(input: string): WrRgb | null {
  const value = input.trim();
  if (value === '') return null;

  const hex = parseHex(value);
  if (hex) return hex;

  const rgb = RGB_RE.exec(value);
  if (rgb) {
    return { r: channel(rgb[1]), g: channel(rgb[2]), b: channel(rgb[3]), a: alphaOf(rgb[4]) };
  }

  const hsl = HSL_RE.exec(value);
  if (hsl) {
    return hslToRgb({
      // Normalised here rather than trusted downstream: `hslToRgb` happens to
      // absorb one negative turn inside `hueToChannel`, which is an internal
      // detail this function should not be leaning on.
      h: ((Number(hsl[1]) % 360) + 360) % 360,
      s: clamp(Number(hsl[2]) / 100, 0, 1),
      l: clamp(Number(hsl[3]) / 100, 0, 1),
      a: alphaOf(hsl[4]),
    });
  }

  return null;
}
