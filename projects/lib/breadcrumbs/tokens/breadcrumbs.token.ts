/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/**
 * Contract a breadcrumb item uses to talk to its parent `<wr-breadcrumbs>`.
 *
 * @internal
 */
export interface WrBreadcrumbsContext {
  /** Separator string used between items. */
  readonly separator: Signal<string>;
}

/**
 * Token a `<wr-breadcrumb>` reads to pull the shared separator (and future
 * state) from its parent `<wr-breadcrumbs>` host.
 *
 * @internal
 */
export const WR_BREADCRUMBS = new InjectionToken<WrBreadcrumbsContext>('WR_BREADCRUMBS');
