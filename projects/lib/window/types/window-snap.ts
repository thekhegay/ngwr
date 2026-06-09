/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Edge / corner snap behaviour. Activated by dragging the title bar
 * close to a viewport edge.
 *
 * - `none` — no snapping.
 * - `edges` — left / right / top edges snap to halves; top snaps to maximise.
 * - `all` — adds the four corners → quarter-screen snaps.
 */
export type WrWindowSnap = 'none' | 'edges' | 'all';

/** Internal snap target — resolved by the drag handler. */
export type WrWindowSnapTarget =
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
