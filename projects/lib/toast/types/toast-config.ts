/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastType } from './toast-type';

/**
 * Options passed to `WrToastService.show()`.
 */
export type WrToastConfig = {
  /** Visual type. @default 'info' */
  readonly type?: WrToastType;
  /** Heading shown at the top of the toast. */
  readonly title?: string;
  /** Body message. */
  readonly message: string;
  /** Auto-dismiss after N ms. `0` disables auto-dismiss. @default 4000 */
  readonly duration?: number;
  /** Show a close button. @default true */
  readonly dismissible?: boolean;
};
