/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrWindowState } from './window-state';

/**
 * One window as `WrWindowManager.saveLayout()` recorded it — the geometry the
 * window really had, not the geometry it happens to be showing while maximized
 * or minimized.
 *
 * Public because `readLayout()` returns an array of these; a consumer that
 * stores or forwards that result has to be able to name the element type.
 */
export interface WrWindowLayoutSnapshot {
  readonly id: string;
  readonly state: WrWindowState;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: string;
}
