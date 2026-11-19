/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LocationStrategy } from '@angular/common';
import { Directive, forwardRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, type UrlTree } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { WR_TABLE_ROUTING, type WrTableRoutingAdapter } from 'ngwr/table';

/**
 * Router support for the row links of `<wr-table>`. Add it to the `imports` of
 * the component that declares the table, and `wrTableRouting` to the table:
 *
 * @example
 * ```ts
 * import { WrTable } from 'ngwr/table';
 * import { WrTableRouting } from 'ngwr/table/router';
 *
 * @Component({ imports: [WrTable, WrTableRouting], template: `
 *   <wr-table wrTableRouting [columns]="columns" [items]="orders" [rowLink]="orderLink" />
 * ` })
 * export class OrdersPage {
 *   protected readonly orderLink = (order: Order) => ['/orders', order.id];
 * }
 * ```
 *
 * `rowLink` then returns what `routerLink` takes: a URL string or an array of
 * commands, relative to the route of the component that declares the table
 * unless it starts with `/`. A plain click navigates in the app; a middle
 * click or a click with a modifier stays the browser's, on a real href. A
 * string with a scheme or a host of its own (`https://…`, `mailto:…`, `//…`)
 * stays a plain link.
 *
 * A separate entry point, so a table that links nowhere does not carry
 * `@angular/router`; a directive rather than a provider function, so a
 * relative link resolves against the declaring component's route. Both for
 * the reasons `WrTabsRouting` gives.
 */
@Directive({
  selector: '[wrTableRouting]',
  exportAs: 'wrTableRouting',
  providers: [
    {
      provide: WR_TABLE_ROUTING,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTableRouting),
    },
  ],
})
export class WrTableRouting implements WrTableRoutingAdapter {
  private readonly router = inject(Router);
  private readonly locationStrategy = inject(LocationStrategy);
  private readonly route = inject(ActivatedRoute);

  /** The current URL as a signal: a relative link's target moves when the route does. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  href(link: string | readonly unknown[]): string {
    // Read for the dependency, so the table's links recompute on navigation.
    this.url();
    // `prepareExternalUrl`, as `RouterLink` writes it: the href is what a middle
    // click and "copy link" use, under a hash location or a base href too.
    return this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.tree(link)));
  }

  navigate(link: string | readonly unknown[], event: MouseEvent): void {
    // The guard `RouterLink` applies: a middle click or a modified one belongs
    // to the browser.
    if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    void this.router.navigateByUrl(this.tree(link));
  }

  private tree(link: string | readonly unknown[]): UrlTree {
    // A string is a URL, query and fragment included, the way `routerLink="/a?b=1"`
    // is not: as one command its `?` would be encoded into the path.
    if (typeof link === 'string' && link.startsWith('/')) return this.router.parseUrl(link);
    return this.router.createUrlTree(typeof link === 'string' ? [link] : [...link], { relativeTo: this.route });
  }
}
