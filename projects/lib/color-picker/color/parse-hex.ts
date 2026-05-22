/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrRgb } from './wr-rgb';

/**
 * Parse a CSS hex colour into {@link WrRgb}. Accepts 3, 4, 6, or 8 digit
 * forms with or without a leading `#`. Returns `null` for anything that
 * isn't a valid hex string.
 *
 * @example
 * ```ts
 * parseHex('#f00');       // { r: 255, g: 0, b: 0, a: 1 }
 * parseHex('3969e2');     // { r: 57,  g: 105, b: 226, a: 1 }
 * parseHex('#3969e2ff');  // { r: 57,  g: 105, b: 226, a: 1 }
 * parseHex('nope');       // null
 * ```
 */
export function parseHex(input: string): WrRgb | null {
  if (typeof input !== 'string') return null;

  let str = input.trim().replace(/^#/, '').toLowerCase();

  // Expand shorthand: rgb → rrggbb, rgba → rrggbbaa
  if (str.length === 3 || str.length === 4) {
    str = str
      .split('')
      .map(c => c + c)
      .join('');
  }

  if (str.length !== 6 && str.length !== 8) return null;
  if (!/^[0-9a-f]+$/.test(str)) return null;

  const r = parseInt(str.slice(0, 2), 16);
  const g = parseInt(str.slice(2, 4), 16);
  const b = parseInt(str.slice(4, 6), 16);
  const a = str.length === 8 ? parseInt(str.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}
