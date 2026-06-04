/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Row inside `<wr-list>`. Three projection slots:
 *
 *  - `[wrListItemLeading]` — icon, avatar, status dot, etc.
 *  - default — main label / body
 *  - `[wrListItemTrailing]` — meta value, action button, chevron
 *
 * Set `interactive` to get hover, cursor, keyboard activation, and the
 * appropriate ARIA role for click handling.
 *
 * @example
 * ```html
 * <wr-list-item>Plain row</wr-list-item>
 *
 * <wr-list-item interactive (click)="onPick(item)">
 *   <wr-icon ngProjectAs="[wrListItemLeading]" name="folder" />
 *   Reports
 *   <span ngProjectAs="[wrListItemTrailing]">12</span>
 * </wr-list-item>
 * ```
 */
@Component({
  selector: 'wr-list-item',
  templateUrl: './list-item.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'listitem',
    '[attr.tabindex]': 'interactive() ? "0" : null',
    '[attr.aria-disabled]': 'disabled() || null',
    '(keydown.enter)': 'onActivate($event)',
    '(keydown.space)': 'onActivate($event)',
  },
})
export class WrListItem {
  /** Adds hover / cursor styles + keyboard activation. @default false */
  readonly interactive = input(false, { transform: coerceBooleanProperty });

  /** Visual disabled state. Suppresses hover + keyboard activation. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-list__item'];
    if (this.interactive()) parts.push('wr-list__item--interactive');
    if (this.disabled()) parts.push('wr-list__item--disabled');
    return parts.join(' ');
  });

  protected onActivate(event: Event): void {
    if (!this.interactive() || this.disabled()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }
}
