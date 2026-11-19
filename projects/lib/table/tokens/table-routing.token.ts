/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrTableRoutingAdapter } from '../types';

/**
 * Token a `<wr-table>` reads to send its row links through a router. Provided
 * by the `WrTableRouting` directive from `ngwr/table/router`; absent by
 * default, which keeps `@angular/router` out of a table that links nowhere.
 */
export const WR_TABLE_ROUTING = new InjectionToken<WrTableRoutingAdapter>('WR_TABLE_ROUTING');
