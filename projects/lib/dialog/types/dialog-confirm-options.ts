/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrColor } from 'ngwr/theme';

import type { WrDialogOptions } from './dialog-options';

/**
 * Options accepted by `WrDialog.confirm()`.
 *
 * The layout is the dialog's own: a `[wrDialogTitle]`, a `[wrDialogContent]`
 * and a `[wrDialogFooter]` with two `wr-btn`. Anything richer than a title and
 * a line of text is a component of your own through `open()`.
 */
export interface WrDialogConfirmOptions extends Pick<
  WrDialogOptions,
  'width' | 'maxWidth' | 'panelClass' | 'closeOnBackdropClick' | 'closeOnEscape' | 'closeOnNavigation' | 'tabTitle'
> {
  /** The question. Names the dialog through `aria-labelledby`. */
  readonly title: string;
  /**
   * Plain text under the title, rendered as text and never as HTML. Describes
   * the dialog through `aria-describedby`.
   */
  readonly message?: string;
  /** Confirm button text. Falls back to the `common.ok` catalog key. */
  readonly confirmLabel?: string;
  /** Cancel button text. Falls back to the `common.cancel` catalog key. */
  readonly cancelLabel?: string;
  /**
   * Color of the confirm button, the way `confirmColor` on `[wrPopconfirm]`
   * reads. `danger` also moves the initial focus to the cancel button, so a
   * stray Enter does not delete; every other color focuses the confirm button.
   * @default 'primary'
   */
  readonly confirmColor?: WrColor;
}
