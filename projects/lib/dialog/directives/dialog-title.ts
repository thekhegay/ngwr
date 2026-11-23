/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, ElementRef, inject } from '@angular/core';

import { wrCheckStyles } from 'ngwr/utils';

let uid = 0;

/**
 * Styles a dialog title row. Use on a heading inside an opened dialog.
 * Keeps an `id` of your own and otherwise assigns one, so the dialog panel
 * can reference it via `aria-labelledby`.
 *
 * @example
 * ```html
 * <h2 wrDialogTitle>Confirm delete</h2>
 * ```
 */
@Directive({
  selector: '[wrDialogTitle]',
  exportAs: 'wrDialogTitle',
  host: { class: 'wr-dialog__title', '[attr.id]': 'id' },
})
export class WrDialogTitle {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('dialog');
  }

  /** @internal */
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly fallbackId = `wr-dialog-title-${++uid}`;

  /**
   * The id the dialog's `aria-labelledby` points at: the element's own `id` when
   * the consumer set one, a generated one otherwise. A getter, read fresh by the
   * host binding, so a bound `[id]` is honoured too.
   */
  get id(): string {
    const own = this.elementRef.nativeElement.id;
    return own === '' ? this.fallbackId : own;
  }
}
