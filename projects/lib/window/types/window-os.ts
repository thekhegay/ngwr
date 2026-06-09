/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Chrome style preset. Picks the side, glyphs, and button look of the
 * minimize / maximize / close cluster.
 *
 * - `macos` — traffic-light dots on the LEFT (red close, yellow minimize,
 *   green maximize). Colors emerge on hover.
 * - `windows` — monochrome glyph buttons on the RIGHT (default).
 * - `linux` — close-only on the right; minimize / maximize hidden unless
 *   explicitly requested.
 */
export type WrWindowOs = 'macos' | 'windows' | 'linux';
