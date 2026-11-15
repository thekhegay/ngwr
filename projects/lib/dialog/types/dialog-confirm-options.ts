/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrColor } from 'ngwr/theme';

import type { WrDialogOptions } from './dialog-options';

/** The `WrDialogOptions` that `confirm()` and `alert()` pass through to the dialog. */
export type WrDialogMessageOptions = Pick<
  WrDialogOptions,
  | 'width'
  | 'maxWidth'
  | 'panelClass'
  | 'closeOnBackdropClick'
  | 'closeOnEscape'
  | 'closeOnNavigation'
  | 'tabTitle'
  | 'autoFocus'
  | 'toasts'
>;

/** The meaning a `confirm()` or an `alert()` dialog shows as an icon before its title. */
export type WrDialogIntent = 'info' | 'success' | 'warning' | 'danger';

/**
 * Options accepted by `WrDialog.confirm()`.
 *
 * The layout is the dialog's own: a `[wrDialogTitle]`, a `[wrDialogContent]`
 * and a `[wrDialogFooter]` with two `wr-btn`. Anything richer than a title and
 * a line of text is a component of your own through `open()`.
 */
export interface WrDialogConfirmOptions extends WrDialogMessageOptions {
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
   * @default 'primary', or the `intent` when that is `danger` or `warning`
   */
  readonly confirmColor?: WrColor;
  /**
   * An icon before the title, in the intent's color. It is decorative: the
   * title and the message say what happened. `danger` and `warning` also color
   * the confirm button unless `confirmColor` is set.
   */
  readonly intent?: WrDialogIntent;
}

/**
 * Options accepted by `WrDialog.alert()`.
 *
 * The layout is `confirm()`'s with one `wr-btn`: a message the user reads and
 * acknowledges.
 */
export interface WrDialogAlertOptions extends WrDialogMessageOptions {
  /** The message's headline. Names the dialog through `aria-labelledby`. */
  readonly title: string;
  /**
   * Plain text under the title, rendered as text and never as HTML. Describes
   * the dialog through `aria-describedby`.
   */
  readonly message?: string;
  /** Button text. Falls back to the `common.ok` catalog key. */
  readonly okLabel?: string;
  /** An icon before the title, in the intent's color. It is decorative. */
  readonly intent?: WrDialogIntent;
}
