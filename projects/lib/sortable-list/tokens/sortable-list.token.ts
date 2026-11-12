/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type WritableSignal, signal } from '@angular/core';

import type { WrSortableList } from '../sortable-list';
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

/**
 * Every live `<wr-sortable-list>` of the application. A list reads its group
 * out of it, so two lists connect by name with no common ancestor: each column
 * of a board can sit in its own component.
 *
 * @internal
 */
export const WR_SORTABLE_LISTS = new InjectionToken<WritableSignal<readonly WrSortableList[]>>('WR_SORTABLE_LISTS', {
  providedIn: 'root',
  factory: () => signal<readonly WrSortableList[]>([]),
});
