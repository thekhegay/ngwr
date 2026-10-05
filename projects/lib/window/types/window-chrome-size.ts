/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Chrome bar density.
 *
 * - `md` (default) — 2.25rem bar, regular title font.
 * - `sm` — 1.625rem bar, smaller title + tighter action dots; useful for
 *   utility / docked panels where vertical space is precious.
 *
 * Spelled `sm` / `md` rather than `compact` / `normal` because this is a
 * density, and v8 renamed every density value in the library to the `sm` /
 * `md` / `lg` scale. This union was missed by that migration and kept the
 * retired vocabulary for three majors; `migration-v14` finishes the job.
 * `WrWindowState`'s own `'normal'` is NOT this word — a window state is not a
 * size — and stays as it is.
 */
export type WrWindowChromeSize = 'sm' | 'md';
