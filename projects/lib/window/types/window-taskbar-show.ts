/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Which windows `<wr-window-taskbar>` lists.
 *
 * - `minimized` (default) — only the minimized ones, as a strip of restore tabs.
 * - `all` — every open window, with the active one marked: a tab switches to
 *   its window, and the active window's tab minimizes it.
 */
export type WrWindowTaskbarShow = 'minimized' | 'all';
