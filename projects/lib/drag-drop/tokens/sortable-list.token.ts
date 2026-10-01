/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrSortableListContext } from '../types';

/**
 * Token a `<wr-sortable-item>` injects to find its parent `<wr-sortable-list>`.
 *
 * Rows arrive through `<ng-content>`, so nothing in the list's template can
 * bind to them and the child has to reach up — the same shape
 * `<wr-carousel-slide>` and `<wr-tab>` use.
 *
 * @internal
 */
export const WR_SORTABLE_LIST = new InjectionToken<WrSortableListContext>('WR_SORTABLE_LIST');
