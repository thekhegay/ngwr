/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrWindowConfig } from './window-config';

/**
 * The options `WrWindowRef.update()` can change on an open window. Everything
 * else in `WrWindowConfig` is read once, when the window opens.
 */
export type WrWindowUpdate = Partial<
  Pick<
    WrWindowConfig,
    | 'title'
    | 'movable'
    | 'resizable'
    | 'snap'
    | 'minWidth'
    | 'minHeight'
    | 'maxWidth'
    | 'maxHeight'
    | 'showMinimize'
    | 'showMaximize'
    | 'showClose'
    | 'closeOnEscape'
  >
>;
