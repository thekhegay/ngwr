/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  type EnvironmentProviders,
  PLATFORM_ID,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

import { WrLoadingBar } from 'ngwr/loading-bar';

/**
 * Drive {@link WrLoadingBar} from router navigations: `NavigationStart` takes a
 * slot, and each of `NavigationEnd` / `NavigationCancel` / `NavigationError`
 * releases one.
 *
 * @example
 * ```ts
 * import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';
 *
 * bootstrapApplication(App, {
 *   providers: [provideRouter(routes), provideWrLoadingBarRouter()],
 * });
 * ```
 *
 * **Why this is a call and not the default.** `WrLoadingBar` used to inject
 * `Router` itself, so navigations drove the bar with no configuration — and
 * every app that rendered `<wr-loading-bar>` paid 66.3 kB of `@angular/router`
 * for it, two thirds of the entry point's total cost, whether or not it had
 * routes. `{ optional: true }` does not help: an optional inject still names the
 * class as the token, and it measured byte-for-byte identical to a required one.
 * An automatic integration and a router-free bundle cannot both exist in a
 * statically linked app, so the automatic half moved here.
 */
export function provideWrLoadingBarRouter(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      // Browser only. During prerender the initial navigation runs the whole
      // cycle in the Node worker — including the bar's 150 ms interval — and
      // leaves `progress` at 1, because the reset that clears it is deferred and
      // the HTML is serialized first: every prerendered page then ships a
      // full-width bar across the top until hydration.
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

      const bar = inject(WrLoadingBar);
      const destroyRef = inject(DestroyRef);
      const sub = inject(Router).events.subscribe(event => {
        if (event instanceof NavigationStart) bar.start();
        else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          bar.complete();
        }
      });
      destroyRef.onDestroy(() => sub.unsubscribe());
    }),
  ]);
}
