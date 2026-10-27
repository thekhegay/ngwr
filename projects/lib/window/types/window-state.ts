/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Visual state of a `<wr-window>`:
 * - `normal` — free-floating, drag / resize allowed (a snapped window is `normal` too; see `WrWindowRef.snap`)
 * - `minimized` — hidden, and listed in `<wr-window-taskbar>` to come back from
 * - `maximized` — fills the work area, up to `maxWidth` / `maxHeight`, with no resize handles
 */
export type WrWindowState = 'normal' | 'minimized' | 'maximized';
