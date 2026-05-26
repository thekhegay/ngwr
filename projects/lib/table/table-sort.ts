/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import { WrIcon, provideWrIcons, arrowTop } from 'ngwr/icon';

import type { WrTableSortDirection } from './types';

/**
 * Sort indicator rendered in a sortable column's header.
 *
 * @internal — used internally by `<wr-table>`. Parent listens for clicks
 * on the indicator to cycle direction.
 */
@Component({
  selector: 'wr-table-sort',
  template: '<wr-icon class="wr-table-sort__icon" name="arrow-top" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon],
  providers: [provideWrIcons([arrowTop])],
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
