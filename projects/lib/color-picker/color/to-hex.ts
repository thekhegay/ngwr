/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrRgb } from './wr-rgb';

function channelToHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0');
}

/**
 * Format a {@link WrRgb} as a CSS hex string with a leading `#`. When
 * `withAlpha` is `true` the result is 8 digits (`#rrggbbaa`); otherwise
 * 6 digits.
 *
 * @example
 * ```ts
 * toHex({ r: 57, g: 105, b: 226, a: 1 });         // '#3969e2'
 * toHex({ r: 57, g: 105, b: 226, a: 0.5 }, true); // '#3969e280'
 * ```
 */
export function toHex(rgb: WrRgb, withAlpha = false): string {
  const r = channelToHex(rgb.r);
  const g = channelToHex(rgb.g);
  const b = channelToHex(rgb.b);
  if (withAlpha) {
    const a = channelToHex(rgb.a * 255);
    return `#${r}${g}${b}${a}`;
  }
  return `#${r}${g}${b}`;
}
