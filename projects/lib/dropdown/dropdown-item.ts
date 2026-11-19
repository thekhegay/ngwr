/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ElementRef, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { wrCheckStyles } from 'ngwr/utils';

/**
 * Single row inside a `<wr-dropdown-menu>`.
 *
 * @example
 * ```html
 * <wr-dropdown-item icon="copy" (click)="copy()">Copy</wr-dropdown-item>
 * <wr-dropdown-item icon="trash" disabled>Delete</wr-dropdown-item>
 * <wr-dropdown-item [checked]="grid()" (click)="grid.set(!grid())">Show grid</wr-dropdown-item>
 * <wr-dropdown-item radio [checked]="view() === 'list'" (click)="view.set('list')">List</wr-dropdown-item>
 * ```
 *
 * Set `checked` to `true` or `false` and the row reserves a check column and
 * announces itself as `menuitemcheckbox` (or `menuitemradio` with `radio`),
 * with `aria-checked`. The item never flips the state: bind `(click)` and
 * update what `checked` reads. A click still leaves the menu open.
 */
@Component({
  selector: 'wr-dropdown-item',
  templateUrl: './dropdown-item.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.role]': 'role()',
    class: 'wr-dropdown-item',
    '[class]': 'classes()',
    '[attr.tabindex]': '-1',
    '[attr.aria-checked]': 'checked() === null ? null : checked()',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
  imports: [WrIcon],
})
export class WrDropdownItem {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('dropdown');
  }

  /** Optional leading icon name. @default null */
  readonly icon = input<WrIconName | null>(null);

  /** Disable interaction (suppresses pointer + keyboard). @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Checked state. `null` (default) is a plain `menuitem` with no check column;
   * `true` / `false` turn it into a `menuitemcheckbox` (or `menuitemradio` with
   * `radio`) that shows a check mark while `true`. The item does not toggle
   * itself: flip the state you bind here from `(click)`.
   *
   * @default null
   */
  readonly checked = input<boolean | null>(null);

  /** With `checked` set, announce as `menuitemradio` instead of `menuitemcheckbox`. @default false */
  readonly radio = input(false, { transform: coerceBooleanProperty });

  protected readonly role = computed(() => {
    if (this.checked() === null) return 'menuitem';
    return this.radio() ? 'menuitemradio' : 'menuitemcheckbox';
  });

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    if (this.checked() !== null) parts.push('wr-dropdown-item--checkable');
    if (this.checked()) parts.push('wr-dropdown-item--checked');
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
