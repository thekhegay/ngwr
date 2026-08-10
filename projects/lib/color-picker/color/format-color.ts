/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrColorFormat } from '../interfaces';

import { rgbToHsl } from './rgb-to-hsl';
import { toHex } from './to-hex';
import type { WrRgb } from './wr-rgb';

/** Alpha with at most two decimals, and no trailing zeroes: `0.5`, not `0.50`. */
function alphaText(a: number): string {
  return String(Math.round(a * 100) / 100);
}

/**
 * Render a colour in the format a `<wr-color-picker>` was asked for.
 *
 * `withAlpha` follows the picker's own `alpha` input, so each format has an
 * opaque and a translucent spelling — `#3969e2` / `#3969e2ff`,
 * `rgb(…)` / `rgba(…)`, `hsl(…)` / `hsla(…)` — and a picker with the alpha
 * slider turned off never emits a channel the caller cannot see or edit.
 */
export function formatColor(rgb: WrRgb, format: WrColorFormat, withAlpha: boolean): string {
  if (format === 'hex') return toHex(rgb, withAlpha);

  if (format === 'rgba') {
    const { r, g, b } = rgb;
    return withAlpha ? `rgba(${r}, ${g}, ${b}, ${alphaText(rgb.a)})` : `rgb(${r}, ${g}, ${b})`;
  }

  const { h, s, l } = rgbToHsl(rgb);
  const parts = `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  return withAlpha ? `hsla(${parts}, ${alphaText(rgb.a)})` : `hsl(${parts})`;
}
