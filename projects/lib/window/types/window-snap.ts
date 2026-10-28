/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Edge / corner snap behaviour. Activated by dragging the title bar
 * close to an edge of the work area.
 *
 * - `none` — no snapping.
 * - `edges` — left / right / top edges snap to halves; top snaps to maximise.
 * - `all` — adds the four corners → quarter-screen snaps.
 */
export type WrWindowSnap = 'none' | 'edges' | 'all';

/**
 * A region of the work area a window can snap to: a half, a quarter, or `top`,
 * which maximizes. Read it from `WrWindowRef.snap()`, set it with `snapTo()`.
 */
export type WrWindowSnapTarget = 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
