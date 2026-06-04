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
 *
 * Need Figma-style smooth corners? Wrap the button in `[wrSquircle]` —
 * the directive is the only way ngwr ships squircle clip-paths.
 */
export type WrButtonShape = 'rounded' | 'pill';
