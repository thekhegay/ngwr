/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import type { WrTableSortDirection } from './interfaces';

/**
 * Sort indicator rendered in a sortable column's header.
 *
 * @internal — used internally by `<wr-table>`. Parent listens for clicks
 * on the indicator to cycle direction.
 */
@Component({
  selector: 'wr-table-sort',
  template:
    '<svg class="wr-icon__svg wr-table-sort__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
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
