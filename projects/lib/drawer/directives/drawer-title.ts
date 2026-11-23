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
 * Marks an element as the drawer's title row. Applies the `wr-drawer__title`
 * class so the drawer's stylesheet can lay it out alongside content and
 * footer slots. Keeps an `id` of your own and otherwise assigns one, so the drawer panel
 * references it via `aria-labelledby`.
 *
 * @example
 * ```html
 * <wr-drawer [(open)]="open">
 *   <h2 wrDrawerTitle>Settings</h2>
 *   <div wrDrawerContent>…</div>
 * </wr-drawer>
 * ```
 */
@Directive({
  selector: '[wrDrawerTitle]',
  exportAs: 'wrDrawerTitle',
  host: { class: 'wr-drawer__title', '[attr.id]': 'id' },
})
export class WrDrawerTitle {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('drawer');
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fallbackId = `wr-drawer-title-${++uid}`;

  /**
   * The id the drawer panel's `aria-labelledby` points at: the element's own
   * `id` when the consumer set one, a generated one otherwise. A getter, read
   * fresh by the host binding, so a bound `[id]` is honoured too.
   */
  get id(): string {
    return this.host.nativeElement.id || this.fallbackId;
  }
}
