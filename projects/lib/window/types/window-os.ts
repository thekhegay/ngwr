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
 * - `auto` (default) — read the user's OS from the browser and pick
 *   `macos` / `windows` / `linux`. Unknown platforms fall back to
 *   `windows`. SSR-safe (resolves to `windows` on the server).
 * - `macos` — traffic-light dots on the LEFT (red close, yellow minimize,
 *   green maximize). Glyphs (×, −, +) appear when the cluster is hovered.
 * - `windows` — monochrome glyph buttons on the RIGHT.
 * - `linux` — close-only on the right, the GNOME convention. That is a DEFAULT
 *   and not a rule: `showMinimize` / `showMaximize` set to `true` put the
 *   buttons back, which is what a Linux user needs before a window can be
 *   minimized into `<wr-window-taskbar>`.
 */
export type WrWindowOs = 'auto' | 'macos' | 'windows' | 'linux';

/** Resolved OS — what `'auto'` collapses to. */
export type WrWindowResolvedOs = Exclude<WrWindowOs, 'auto'>;
