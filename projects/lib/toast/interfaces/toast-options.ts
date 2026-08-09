/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastPosition } from './toast-position';
import type { WrToastType } from './toast-type';

/**
 * Per-toast options passed to {@link WrToast.show}. Any field
 * omitted falls back to the global {@link WrToastConfig}.
 */
export interface WrToastOptions {
  /** Visual type. @default 'info' */
  readonly type?: WrToastType;
  /** Heading shown at the top of the toast. */
  readonly title?: string;
  /** Body message. */
  readonly message: string;
  /** Auto-dismiss after N ms. `0` disables auto-dismiss. Default from global config. */
  readonly duration?: number;
  /** Show a close (×) button. @default true */
  readonly dismissible?: boolean;
  /**
   * Corner this toast opens in. The whole stack shares one host, so this is
   * not per-toast: passing a different corner relocates the toasts already on
   * screen along with this one.
   */
  readonly position?: WrToastPosition;
  /** Override the progress bar visibility for this toast only. */
  readonly showProgress?: boolean;
  /** Override the copy button visibility for this toast only. */
  readonly showCopy?: boolean;
}
