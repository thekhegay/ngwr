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
 * - `macos` — traffic lights on the LEFT (red close, yellow minimize, green
 *   zoom). Their glyphs (×, −, and the full-screen arrows, pointing in once
 *   the window is maximized) appear while the cluster is hovered or focused.
 * - `windows` — Windows 11 caption buttons on the RIGHT: full-height, 46px
 *   wide, flush with the frame, with a red close on hover.
 * - `linux` — GNOME's round buttons on the right, close-only by convention.
 *   That is a DEFAULT and not a rule: `showMinimize` / `showMaximize` set to
 *   `true` put the buttons back, which is what a Linux user needs before a
 *   window can be minimized into `<wr-window-taskbar>`.
 *
 * Every preset moves to the other edge in a right-to-left page, as each of
 * the three platforms does in a right-to-left UI.
 */
export type WrWindowOs = 'auto' | 'macos' | 'windows' | 'linux';

/** Resolved OS — what `'auto'` collapses to. */
export type WrWindowResolvedOs = Exclude<WrWindowOs, 'auto'>;
