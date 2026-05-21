/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WR_BREADCRUMBS } from './tokens';

/**
 * Single breadcrumb. When a `routerLink` is set, the item is a link;
 * otherwise it renders as a plain (typically current-page) label.
 */
@Component({
  selector: 'wr-breadcrumb-item',
  templateUrl: './breadcrumb-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-breadcrumb-item' },
  imports: [RouterLink],
})
export class WrBreadcrumbItemComponent {
  /** Optional router target. Omit on the current/last item. */
  readonly routerLink = input<string | readonly string[] | null>(null);

  private readonly parent = inject(WR_BREADCRUMBS, { optional: true });

  protected readonly separator = computed(() => this.parent?.separator() ?? '/');

  protected readonly isLink = computed(() => this.routerLink() !== null);
}
