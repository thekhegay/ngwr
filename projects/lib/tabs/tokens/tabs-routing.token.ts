/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrTabsRoutingAdapter } from '../types';

/**
 * Token a `<wr-tabs>` reads to find out whether router tabs are usable. Provided
 * by the `WrTabsRouting` directive from `ngwr/tabs/router`; absent by default,
 * which is what keeps `@angular/router` out of a content-only strip.
 */
export const WR_TABS_ROUTING = new InjectionToken<WrTabsRoutingAdapter>('WR_TABS_ROUTING');
