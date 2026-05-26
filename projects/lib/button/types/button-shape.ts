/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Corner treatment for `<wr-btn>`.
 *
 * - `rounded` (default) — small radius, matches the rest of the form vocabulary.
 * - `pill` — fully rounded ends; ideal for solitary CTAs.
 * - `squircle` — Figma-style smooth corners via the {@link WrSquircle} directive.
 */
export type WrButtonShape = 'rounded' | 'pill' | 'squircle';
