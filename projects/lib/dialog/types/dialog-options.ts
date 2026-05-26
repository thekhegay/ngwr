/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

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
  /** Width applied to the panel — any valid CSS length. */
  readonly width?: string;
  /** Maximum width applied to the panel. */
  readonly maxWidth?: string;
  /** Extra CSS class(es) added to the panel. */
  readonly panelClass?: string | readonly string[];
}
