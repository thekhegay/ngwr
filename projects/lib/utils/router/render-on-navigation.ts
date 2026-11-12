/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ApplicationRef, DestroyRef, inject, provideAppInitializer } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { type WrFeature, wrFeature } from 'ngwr/utils';

/**
 * `provideWr()` feature: render a routed page in the task that inserted it.
 *
 * Zoneless, the router inserts the new page into the DOM in one task and its
 * first change detection runs in a later one (Angular schedules it as a
 * macrotask, by design: angular/angular#57528). A browser that styles the page
 * in between sees elements without their bound classes and attributes, and any
 * CSS transition on them then fades from the browser's defaults to the app's
 * look on every page switch. Ticking right after `NavigationEnd`, before the
 * task ends, binds the page before the browser paints it. The scheduled tick is
 * cancelled by this one, so nothing runs twice.
 *
 * ngwr's own components carry their base class statically and do not depend on
 * this; it covers the app's own bindings on a routed page.
 *
 * @example
 * ```ts
 * provideWr(withRenderOnNavigation())
 * ```
 */
export function withRenderOnNavigation(): WrFeature<'render-on-navigation'> {
  return wrFeature('render-on-navigation', [
    provideAppInitializer(() => {
      const appRef = inject(ApplicationRef);
      const subscription = inject(Router).events.subscribe(event => {
        // A microtask, not `afterNextRender`: it has to run before the task that
        // inserted the page ends, and a tick inside the router's own event
        // emission could re-enter one already running.
        if (event instanceof NavigationEnd) queueMicrotask(() => appRef.tick());
      });
      inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    }),
  ]);
}
