/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * QR code error correction level.
 *
 * - `'L'` — Low (~7%)
 * - `'M'` — Medium (~15%)
 * - `'Q'` — Quartile (~25%)
 * - `'H'` — High (~30%) — needed if overlaying a center icon
 */
export type WrQrErrorLevel = 'L' | 'M' | 'Q' | 'H';
