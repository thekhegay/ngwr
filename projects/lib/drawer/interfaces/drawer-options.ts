/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrDrawerPosition } from './drawer-position';

/**
 * Options accepted by `WrDrawerManager.open()`.
 *
 * Mirrors the `<wr-drawer>` inputs, minus the ones that need the component's
 * own wrapper markup (`showHandle` / swipe-to-dismiss).
 */
export interface WrDrawerOptions<D = unknown> {
  /** Data payload exposed to the drawer content via `WR_DRAWER_DATA`. */
  readonly data?: D;
  /** Side the drawer slides in from. @default 'right' */
  readonly position?: WrDrawerPosition;
  /** Width when position is left/right. Any CSS length. @default '20rem' */
  readonly width?: string;
  /** Height when position is top/bottom. Any CSS length. @default '16rem' */
  readonly height?: string;
  /** Upper cap on height (top/bottom positions). Any CSS length. @default null (no cap) */
  readonly maxHeight?: string | null;
  /** Round the leading corners — the edge facing the viewport interior. @default false */
  readonly rounded?: boolean;
  /** Pad the trailing edge with `env(safe-area-inset-*)`. @default false */
  readonly safeArea?: boolean;
  /** Show the dimming backdrop. @default true */
  readonly hasBackdrop?: boolean;
  /** When `true`, clicks on the backdrop close the drawer. @default true */
  readonly closeOnBackdropClick?: boolean;
  /** When `true`, the Escape key closes the drawer. @default true */
  readonly closeOnEscape?: boolean;
  /**
   * Render a dismiss (×) button in the panel's top-right corner. Set `false`
   * when the content supplies its own close affordance. @default true
   */
  readonly closable?: boolean;
  /** Accessible name for the dismiss button. Falls back to the `drawer.close` catalog key. */
  readonly closeLabel?: string;
  /** Extra CSS class(es) added to the panel. */
  readonly panelClass?: string | readonly string[];
}
