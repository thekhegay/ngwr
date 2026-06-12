/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Corner treatment for `<wr-badge>`.
 *
 * - `rounded` (default) — small radius, matches the rest of the form vocabulary.
 * - `pill` — fully rounded ends; common for count chips and status pills.
 * - `squircle` — iOS-style continuous-curvature corners via the
 *   `corner-shape: squircle` CSS spec (Chrome 145+, falls back to a
 *   plain rounded corner elsewhere).
 */
export type WrBadgeShape = 'rounded' | 'pill' | 'squircle';
