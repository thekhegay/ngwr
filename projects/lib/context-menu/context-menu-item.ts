/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';

/**
 * Single row inside a `<wr-context-menu>`. Mirrors `<wr-dropdown-item>` —
 * rendered as a menu item with optional leading icon.
 *
 * @example
 * ```html
 * <wr-context-menu-item icon="copy" (click)="copy()">Copy</wr-context-menu-item>
 * <wr-context-menu-item icon="trash" disabled>Delete</wr-context-menu-item>
 * ```
 */
@Component({
  selector: 'wr-context-menu-item',
  templateUrl: './context-menu-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class WrContextMenuItem {
  /** Optional leading icon name. @default null */
  readonly icon = input<WrIconName | null>(null);

  /** Disable interaction (suppresses pointer + keyboard). @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-context-menu-item'];
    if (this.disabled()) parts.push('wr-context-menu-item--disabled');
    return parts.join(' ');
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal Keyboard activation. */
  protected activate(event: Event): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.host.nativeElement.click();
  }
}
