/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

import type { WrDrawerPosition } from './drawer-position';

/**
 * What a drawer does with focus when it opens: `'first-tabbable'` focuses the
 * first tabbable element, `'dialog'` focuses the panel itself (no ring, so the
 * first Tab reaches the first control), `false` moves nothing. An element with
 * `cdkFocusInitial` wins in every mode.
 */
export type WrDrawerAutoFocus = 'first-tabbable' | 'dialog' | false;

/**
 * Options accepted by `WrDrawerManager.open()`.
 *
 * Mirrors the `<wr-drawer>` inputs, plus `data` and `closeOnNavigation` and
 * minus `open`, which the ref owns.
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
  /**
   * Show the dimming backdrop, and with it make the drawer MODAL: focus is
   * trapped inside, the panel is announced with `aria-modal="true"`, and the
   * page behind it does not scroll.
   *
   * `false` makes it a NON-MODAL side panel (since v15): no trap, no
   * `aria-modal`, the page stays clickable and scrollable. Focus still moves
   * into the panel on open, Escape closes it unless focus has moved on to the
   * page, and on close focus goes back to the opener unless the reader has
   * moved on likewise.
   * @default true
   */
  readonly hasBackdrop?: boolean;
  /** When `true`, clicks on the backdrop close the drawer. @default true */
  readonly closeOnBackdropClick?: boolean;
  /** When `true`, the Escape key closes the drawer. @default true */
  readonly closeOnEscape?: boolean;
  /**
   * When `true`, the drawer closes as soon as the URL changes — the Back button
   * and any `router.navigate()` alike. Nothing else ties a drawer to the route
   * it was opened on, so turning this off leaves the panel, its backdrop, its
   * focus trap and the page-wide scroll block over whatever page the app
   * navigates to. Turn it off only for a drawer that OWNS the navigation (a
   * filter panel that keeps its state in the query string).
   * @default true
   */
  readonly closeOnNavigation?: boolean;
  /**
   * Render a dismiss (×) button in the panel's top-right corner. Set `false`
   * when the content supplies its own close affordance. @default true
   */
  readonly closable?: boolean;
  /** Accessible name for the dismiss button. Falls back to the `drawer.close` catalog key. */
  readonly closeLabel?: string;
  /** Extra CSS class(es) added to the panel. */
  /**
   * Extra CSS classes for the panel. A space-separated string works as well as
   * an array — the CDK would throw `InvalidCharacterError` on the first, so the
   * splitting happens here.
   */
  readonly panelClass?: WrClassInput;
  /**
   * Where the global toast stack paints while this drawer is open. `'below'`
   * keeps it under the drawer and its backdrop. Toasts in a
   * `<wr-toast-outlet>` are page content and are under every drawer anyway.
   * With overlays stacked, the top one decides.
   * @default 'above'
   */
  readonly toasts?: 'above' | 'below';
  /**
   * Where focus goes when the drawer opens. `'dialog'` focuses the panel itself,
   * with no ring, so the first Tab goes to the first control. `'first-tabbable'`
   * focuses the first tabbable element, which lights the focus ring on a button
   * when the user pressed nothing. `false` leaves focus where it was. The default is `'dialog'`: a modal that moves no focus strands keyboard
   * users, and `'first-tabbable'` is the explicit opt-in. An
   * element marked `cdkFocusInitial` wins in every mode. The trap of a modal
   * drawer and the return of focus on close do not change.
   * @default 'dialog'
   */
  readonly autoFocus?: WrDrawerAutoFocus;
}
