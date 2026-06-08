/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrIcon, type WrIconName } from 'ngwr/icon';

/**
 * One row inside `<wr-breadcrumbs>`. Renders as a `<li>` containing
 * either an `<a>` (when `[href]` or `[routerLink]` is set) or a plain
 * `<span aria-current="page">` (when neither is set — typically the last
 * crumb).
 *
 * @example
 * ```html
 * <wr-breadcrumbs-item icon="home" routerLink="/">Home</wr-breadcrumbs-item>
 * <wr-breadcrumbs-item href="https://ngwr.dev">External</wr-breadcrumbs-item>
 * <wr-breadcrumbs-item>Current page</wr-breadcrumbs-item>
 * ```
 */
@Component({
  selector: 'wr-breadcrumbs-item',
  templateUrl: './breadcrumbs-item.html',
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, WrIcon],
  host: { class: 'wr-breadcrumbs__item', role: 'listitem' },
})
export class WrBreadcrumbsItem {
  /** Plain anchor href. Overridden by `routerLink` when both are set. */
  readonly href = input<string | null>(null);

  /** Angular router target. Anything `RouterLink` accepts (string or `any[]`). */
  readonly routerLink = input<string | readonly unknown[] | null>(null);

  /** Open external `href` in a new tab. Ignored when `routerLink` is set. @default false */
  readonly external = input(false);

  /** Optional leading icon rendered inline before the label. @default null */
  readonly icon = input<WrIconName | null>(null);

  protected readonly isLink = computed(() => this.href() != null || this.routerLink() != null);
  protected readonly isRouter = computed(() => this.routerLink() != null);

  protected readonly rootClass = computed(() =>
    this.isLink() ? 'wr-breadcrumbs__link' : 'wr-breadcrumbs__current'
  );
}
