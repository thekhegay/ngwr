/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

/**
 * Generic list container. Renders `<ul role="list">` with optional
 * borders, dividers between items, and dense (compact) padding. Project
 * `<wr-list-item>` children — they pick up the container's settings
 * through CSS cascade, no DI needed.
 *
 * @example
 * ```html
 * <wr-list bordered dividers>
 *   <wr-list-item>
 *     <wr-icon ngProjectAs="[wrListItemLeading]" name="folder" />
 *     Reports
 *     <span ngProjectAs="[wrListItemTrailing]">12</span>
 *   </wr-list-item>
 *   <wr-list-item interactive (click)="open(item)">
 *     Click anywhere on this row
 *   </wr-list-item>
 * </wr-list>
 * ```
 *
 * @see https://ngwr.dev/reference/components/list
 */
@Component({
  selector: 'wr-list',
  // The label goes on the `<ul role="list">`, not on the host. `<wr-list>` is a
  // role-less generic element, and ARIA 1.2 prohibits `aria-label` on one — so
  // the attribute was legal-looking, axe-reportable (`aria-prohibited-attr`)
  // and, worse, silent: the list it was written for stayed nameless, and a page
  // with three of them announced three identical unnamed lists.
  template: '<ul class="wr-list__items" role="list" [attr.aria-label]="ariaLabel() || null"><ng-content /></ul>',
  styleUrl: './list.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
  },
})
export class WrList {
  /** Wrap the list in a card-style border + radius. @default false */
  readonly bordered = input(false, { transform: coerceBooleanProperty });

  /** Draw a thin divider between items. @default false */
  readonly dividers = input(false, { transform: coerceBooleanProperty });

  /** Use compact padding on every item. @default false */
  readonly dense = input(false, { transform: coerceBooleanProperty });

  /** Optional accessible label for the list. */
  readonly ariaLabel = input<string>('');

  protected readonly classes = computed(() => {
    const parts = ['wr-list'];
    if (this.bordered()) parts.push('wr-list--bordered');
    if (this.dividers()) parts.push('wr-list--dividers');
    if (this.dense()) parts.push('wr-list--dense');
    return parts.join(' ');
  });
}
