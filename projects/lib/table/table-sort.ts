/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrTableSortDirection } from './types';

/**
 * Sort indicator rendered in a sortable column's header.
 *
 * @internal — used internally by `<wr-table>`. Parent listens for clicks
 * on the indicator to cycle direction.
 */
@Component({
  selector: 'wr-table-sort',
  template:
    '<svg class="wr-icon__svg wr-table-sort__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true"><path fill="currentColor" d="M71.1 98.5v-54l14.4 14.4c2.5 2.5 6.6 2.7 9.1.3 2.6-2.5 2.7-6.6.1-9.2L69.5 24.8c-2.7-2.7-7-2.7-9.7 0l-25 25c-2.5 2.5-2.7 6.6-.3 9.1 2.5 2.6 6.6 2.7 9.2.1l14.6-14.6v54.3c0 3.6 3 6.5 6.6 6.4 3.5-.1 6.2-3.1 6.2-6.6"/></svg>',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrTableSort {
  readonly direction = input<WrTableSortDirection>(null);

  protected readonly classes = computed(() => {
    const parts = ['wr-table-sort'];
    const dir = this.direction();
    if (dir) parts.push(`wr-table-sort--${dir}`);
    return parts.join(' ');
  });
}
