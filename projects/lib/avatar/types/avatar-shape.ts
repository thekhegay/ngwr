/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Corner treatment for `<wr-avatar>`.
 *
 * - `rounded` (default) — soft rounded square (~10% radius).
 * - `square` — hard corners.
 * - `circle` — fully circular (replaces the old `[rounded]` boolean).
 * - `squircle` — iOS-style smooth corners via `corner-shape: squircle`.
 */
export type WrAvatarShape = 'rounded' | 'square' | 'circle' | 'squircle';
