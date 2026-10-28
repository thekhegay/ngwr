/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrWindowBounds } from './window-bounds';

/** App-wide window defaults, passed to `provideWr(withWindows(...))`. */
export interface WrWindowDefaults {
  /**
   * The work area every window keeps inside, unless its own
   * `WrWindowConfig.bounds` says otherwise. @default 'viewport'
   */
  readonly bounds?: WrWindowBounds;
}
