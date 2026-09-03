/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * What a `<wr-tabs>` needs from a router in order to render a router tab, and
 * nothing more. Three questions — the href to put on the anchor, whether the
 * current URL selects it, and what a click should do.
 *
 * It exists so that `ngwr/tabs` can name the capability without naming
 * `@angular/router`: a directive listed in `imports: []` lands in the compiled
 * component's `dependencies` whether or not its branch of the template ever
 * runs, so `RouterLink` + `RouterLinkActive` on the strip charged every content
 * tab strip the whole router — 73.9 kB of a 144.8 kB component. The
 * implementation lives at `ngwr/tabs/router`, which a consumer imports only
 * when they use router tabs.
 *
 * `href` and `isActive` are read from computeds and must both be reactive to
 * navigation: a RELATIVE `routerLink` resolves against the active route, so its
 * href changes when the route does, exactly as `RouterLink` recomputes its own.
 */
export interface WrTabsRoutingAdapter {
  /**
   * Serialized href for a tab's `routerLink`, or `null` when the adapter cannot
   * build one.
   */
  href(commands: string | readonly string[]): string | null;

  /**
   * Whether the current URL selects this tab. Matched the way `routerLinkActive`
   * matches without `[routerLinkActiveOptions]`: a path prefix, not an exact URL.
   */
  isActive(commands: string | readonly string[]): boolean;

  /**
   * Handle a click on a tab anchor. A modified or non-primary click is left to
   * the browser, so ctrl/cmd-click still opens the tab in a new window.
   */
  navigate(commands: string | readonly string[], event: MouseEvent): void;
}

/**
 * Token a `<wr-tabs>` reads to find out whether router tabs are usable. Provided
 * by the `WrTabsRouting` directive from `ngwr/tabs/router`; absent by default,
 * which is what keeps `@angular/router` out of a content-only strip.
 */
export const WR_TABS_ROUTING = new InjectionToken<WrTabsRoutingAdapter>('WR_TABS_ROUTING');
