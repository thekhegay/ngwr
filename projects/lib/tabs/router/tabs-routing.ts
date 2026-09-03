/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LocationStrategy } from '@angular/common';
import { Directive, forwardRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type IsActiveMatchOptions, NavigationEnd, Router, type UrlTree } from '@angular/router';

import { filter, map, startWith } from 'rxjs';

import { WR_TABS_ROUTING, type WrTabsRoutingAdapter } from 'ngwr/tabs';

/**
 * How `routerLinkActive` matches when no `[routerLinkActiveOptions]` is given:
 * a path PREFIX, so `/settings/profile` still selects a `/settings` tab, and a
 * fragment or a matrix param never unselects one.
 */
const MATCH: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'subset',
  fragment: 'ignored',
  matrixParams: 'ignored',
};

/**
 * Router support for `<wr-tabs>`. Add it to the `imports` of the component that
 * declares a strip whose `<wr-tab>`s carry a `routerLink`:
 *
 * @example
 * ```ts
 * import { WrTab, WrTabs } from 'ngwr/tabs';
 * import { WrTabsRouting } from 'ngwr/tabs/router';
 *
 * @Component({ imports: [WrTabs, WrTab, WrTabsRouting], template: `
 *   <wr-tabs wrTabsRouting>
 *     <wr-tab title="Overview" routerLink="overview" />
 *     <wr-tab title="Details" routerLink="details" />
 *   </wr-tabs>
 *   <router-outlet />
 * ` })
 * export class SettingsPage {}
 * ```
 *
 * Two mechanical edits per strip, both codemoddable: the symbol in `imports`,
 * and `wrTabsRouting` on the element. An attribute rather than a selector on
 * `wr-tabs` itself, for two reasons — where the router enters a template should
 * be visible in that template, and the sandbox's selector map keys a `wr-` tag
 * even when it is qualified, so `wr-tabs[wrTabsRouting]` would be a second claim
 * on the `wr-tabs` tag. Putting it on an ANCESTOR of the strip also works: the
 * token is read through the element injector, which walks up.
 *
 * **Why it is a separate entry point.** A directive listed in `imports: []`
 * lands in the compiled component's `dependencies` whether or not the branch of
 * the template that matches it ever runs, so `RouterLink` + `RouterLinkActive`
 * on the strip charged every CONTENT tab strip 73.9 kB of `@angular/router` —
 * 51% of what `ngwr/tabs` cost in an app that declares no routes. Measured with
 * source-map attribution against a routerless baseline. `@angular/router` is
 * already an optional peer dependency of the package; this is what makes that
 * true in bytes.
 *
 * **Why a directive rather than a provider function.** A relative `routerLink`
 * (`routerLink="overview"`) resolves against the `ActivatedRoute` of the
 * component that declares the strip. A root-level provider would resolve every
 * one of them against the root route instead, and quietly build the wrong
 * hrefs; a directive on the element reads the same `ActivatedRoute` the old
 * `RouterLink` inside the strip's template did.
 */
@Directive({
  selector: '[wrTabsRouting]',
  exportAs: 'wrTabsRouting',
  providers: [
    {
      provide: WR_TABS_ROUTING,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrTabsRouting),
    },
  ],
})
export class WrTabsRouting implements WrTabsRoutingAdapter {
  private readonly router = inject(Router);
  private readonly locationStrategy = inject(LocationStrategy);
  private readonly route = inject(ActivatedRoute);

  /**
   * The current URL, as a signal, so `href()` and `isActive()` are reactive to
   * navigation when read from a computed. `isActive` obviously has to be; so
   * does `href`, because a RELATIVE link is resolved against the active route
   * and its target moves when the route does — which is why `RouterLink`
   * recomputes its own href on every navigation too.
   */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  href(commands: string | readonly string[]): string {
    // Read for the dependency, the same reason `isActive` does: a RELATIVE link
    // resolves against the active route, so its target moves when the route
    // does. Without this a strip inside `/users/:id` kept rendering
    // `/users/1/profile` after navigating to user 2 — the click still routed,
    // because `navigate()` rebuilds the tree, but the visible href pointed at
    // the previous user. The docblock above already promised this; the code did
    // not do it.
    this.url();

    // `prepareExternalUrl`, not a bare `serializeUrl`, because that is what
    // `RouterLink` writes and the href exists precisely so the BROWSER can use
    // it. Under `withHashLocation()` a serialized `/one` renders as an href the
    // app does not serve: a plain click survives (`navigateByUrl` ignores the
    // strategy and `preventDefault` stops the bad navigation) but cmd-click,
    // middle-click, "open in new tab" and "copy link address" all take the href
    // at face value — the four things rendering one is for. A `--base-href` is
    // the same defect by another door.
    return this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.tree(commands)));
  }

  isActive(commands: string | readonly string[]): boolean {
    // Read for the dependency, not for the value: `isActive` asks the router,
    // which is not a signal, so without this the computed that calls it would
    // never recompute and the strip would announce its first selection forever.
    this.url();
    return this.router.isActive(this.tree(commands), MATCH);
  }

  navigate(commands: string | readonly string[], event: MouseEvent): void {
    // Exactly the guard `RouterLink` applies: a middle click, or any click with
    // a modifier held, belongs to the browser — preventing it would make a tab
    // the one link on the page that cannot be opened in a new window.
    if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    void this.router.navigateByUrl(this.tree(commands));
  }

  private tree(commands: string | readonly string[]): UrlTree {
    // A bare string is one command, the way `[routerLink]="'overview'"` is —
    // spread as characters it would navigate to `/o/v/e/r/v/i/e/w`.
    const segments = typeof commands === 'string' ? [commands] : [...commands];
    return this.router.createUrlTree(segments, { relativeTo: this.route });
  }
}
