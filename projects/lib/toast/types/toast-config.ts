/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastPosition } from './toast-position';

/**
 * Global toast configuration registered through {@link provideWrToastConfig}.
 *
 * Per-toast {@link WrToastOptions} can override individual fields at call
 * time (`position`, `duration`, `showProgress`, `showCopy`).
 */
export type WrToastConfig = {
  /** Corner the stack renders in. @default 'top-end' */
  readonly position: WrToastPosition;
  /** Auto-dismiss after N ms. `0` disables auto-dismiss. @default 4000 */
  readonly duration: number;
  /** Render a countdown progress bar that pauses on hover. @default true */
  readonly showProgress: boolean;
  /** Render a "copy message" button on each toast. @default false */
  readonly showCopy: boolean;
  /** Render a "Close all" button when the stack reaches the threshold. @default true */
  readonly showCloseAll: boolean;
  /** Minimum number of stacked toasts before "Close all" appears. @default 2 */
  readonly closeAllThreshold: number;
  /** Maximum toasts visible at once. Oldest is dismissed when exceeded. `0` = unlimited. @default 5 */
  readonly maxStack: number;
  /** Labels rendered in the UI. Keep short — meant to be overridden for i18n. */
  readonly labels: {
    readonly close: string;
    readonly copy: string;
    readonly copied: string;
    readonly closeAll: string;
  };
};
