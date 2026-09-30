/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

/**
 * Options accepted by `WrDialog.open()`.
 */
export interface WrDialogOptions<D = unknown> {
  /** Data payload exposed to the dialog content via `WR_DIALOG_DATA`. */
  readonly data?: D;
  /** When `true`, clicks on the backdrop close the dialog. @default true */
  readonly closeOnBackdropClick?: boolean;
  /** When `true`, the Escape key closes the dialog. @default true */
  readonly closeOnEscape?: boolean;
  /**
   * When `true`, the dialog closes as soon as the URL changes — the Back button
   * and any `router.navigate()` alike. Nothing else ties a dialog to the route
   * it was opened on, so turning this off leaves the pane, its backdrop and its
   * focus trap over whatever page the app navigates to. Turn it off only for a
   * dialog that OWNS the navigation (a wizard that keeps its step in the URL).
   * @default true
   */
  readonly closeOnNavigation?: boolean;
  /**
   * Render a dismiss (×) button in the panel's top-right corner. Set `false`
   * when the content supplies its own close affordance, or when the dialog must
   * be resolved through its own actions. @default true
   */
  readonly closable?: boolean;
  /** Accessible name for the dismiss button. Falls back to the `dialog.close` catalog key. */
  readonly closeLabel?: string;
  /** Width applied to the panel — any valid CSS length. */
  readonly width?: string;
  /** Maximum width applied to the panel. */
  readonly maxWidth?: string;
  /**
   * Extra CSS classes for the panel. A space-separated string works as well as
   * an array — the CDK would throw `InvalidCharacterError` on the first, so the
   * splitting happens here.
   */
  readonly panelClass?: WrClassInput;
  /**
   * Present as a full-width bottom-sheet on small viewports instead of a
   * centred modal. `undefined` follows the app-wide
   * `provideWrResponsiveOverlays()` setting; `true`/`false` overrides it.
   */
  readonly responsive?: boolean;
}
