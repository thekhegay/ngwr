/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * One row inside `<wr-breadcrumb>`. Renders as a `<li>` containing
 * either an `<a>` (when `[href]` or `[routerLink]` is set) or a plain
 * `<span aria-current="page">` (when neither is set — typically the last
 * crumb).
 *
 * @example
 * ```html
 * <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
 * <wr-breadcrumb-item href="https://ngwr.dev">External</wr-breadcrumb-item>
 * <wr-breadcrumb-item>Current page</wr-breadcrumb-item>
 * ```
 */
@Component({
  selector: 'wr-breadcrumb-item',
  templateUrl: './breadcrumb-item.html',
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink],
  host: { class: 'wr-breadcrumb__item', role: 'listitem' },
})
export class WrBreadcrumbItem {
  /** Plain anchor href. Overridden by `routerLink` when both are set. */
  readonly href = input<string | null>(null);

  /** Angular router target. Anything `RouterLink` accepts (string or `any[]`). */
  readonly routerLink = input<string | readonly unknown[] | null>(null);

  /** Open external `href` in a new tab. Ignored when `routerLink` is set. @default false */
  readonly external = input(false);

  protected readonly isLink = computed(() => this.href() != null || this.routerLink() != null);
  protected readonly isRouter = computed(() => this.routerLink() != null);
}
