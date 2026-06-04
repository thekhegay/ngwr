/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';

/**
 * Single row inside a `<wr-dropdown-menu>`.
 *
 * @example
 * ```html
 * <wr-dropdown-item icon="copy" (click)="copy()">Copy</wr-dropdown-item>
 * <wr-dropdown-item icon="trash" disabled>Delete</wr-dropdown-item>
 * ```
 */
@Component({
  selector: 'wr-dropdown-item',
  templateUrl: './dropdown-item.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'menuitem',
    '[class]': 'classes()',
    '[attr.tabindex]': '-1',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
  imports: [WrIcon],
})
export class WrDropdownItem {
  /** Optional leading icon name. @default null */
  readonly icon = input<WrIconName | null>(null);

  /** Disable interaction (suppresses pointer + keyboard). @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-dropdown-item'];
    if (this.disabled()) parts.push('wr-dropdown-item--disabled');
    return parts.join(' ');
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal Keyboard activation — fires the same click consumers bind to. */
  protected activate(event: Event): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.host.nativeElement.click();
  }
}
