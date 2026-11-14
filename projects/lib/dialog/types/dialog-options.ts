/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrClassInput } from 'ngwr/utils';

/** The ARIA role a dialog panel announces. */
export type WrDialogRole = 'dialog' | 'alertdialog';

/**
 * What a dialog does with focus when it opens: `'first-tabbable'` focuses the
 * first tabbable element, `'dialog'` focuses the panel itself (no ring, so the
 * first Tab reaches the first control), `false` moves nothing. An element with
 * `cdkFocusInitial` wins in every mode.
 */
export type WrDialogAutoFocus = 'first-tabbable' | 'dialog' | false;

/**
 * Options accepted by `WrDialog.open()`.
 */
export interface WrDialogOptions<D = unknown> {
  /** Data payload exposed to the dialog content via `WR_DIALOG_DATA`. */
  readonly data?: D;
  /**
   * `alertdialog` for a dialog that interrupts with a question and expects an
   * answer. It is also described by its `[wrDialogContent]`, which `dialog` is
   * not: a form body read out as a description is noise, a one-line message is
   * the point.
   * @default 'dialog'
   */
  readonly role?: WrDialogRole;
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
   * When `true`, the browser tab reads the dialog's title in front of the page
   * title while the dialog is open, and the page title comes back when it
   * closes. The text is read from the `[wrDialogTitle]` element, so it is
   * already translated; a dialog without one leaves the tab alone. With dialogs
   * stacked, the top one names the tab. It is written through `WrMeta` from
   * `ngwr/meta`, as a `titlePrefix` layer, so `titleTemplate` and
   * `titleSeparator` from `withMeta()` apply.
   * @default false, or what `withDialog()` sets
   */
  readonly tabTitle?: boolean;
  /**
   * Where the global toast stack paints while this dialog is open. `'below'`
   * keeps it under the dialog and its backdrop, so a toast neither covers the
   * dialog nor can be reached until the dialog closes. Toasts in a
   * `<wr-toast-outlet>` are page content and are under every dialog anyway.
   * With dialogs stacked, the top one decides.
   * @default 'above'
   */
  readonly toasts?: 'above' | 'below';
  /**
   * Where focus goes when the dialog opens. `'dialog'` focuses the panel itself,
   * with no ring, so the first Tab goes to the first control. `'first-tabbable'`
   * focuses the first tabbable element, which lights the focus ring on a button
   * when the user pressed nothing. `false` leaves focus where it was. The default is `'dialog'`: a modal that moves no focus strands keyboard
   * users, and `'first-tabbable'` is the explicit opt-in. An
   * element marked `cdkFocusInitial` wins in every mode. The focus trap and the
   * return of focus to the opener on close do not change.
   * @default 'dialog', or what `withDialog()` sets
   */
  readonly autoFocus?: WrDialogAutoFocus;
}
