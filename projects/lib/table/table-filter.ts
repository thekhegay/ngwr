/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';

import { WrDropdown, WrDropdownMenu } from 'ngwr/dropdown';

import type { WrTableFilterItem } from './interfaces';

/**
 * Filter dropdown rendered in a filterable column's header.
 *
 * @internal — used internally by `<wr-table>`.
 */
@Component({
  selector: 'wr-table-filter',
  templateUrl: './table-filter.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrDropdown, WrDropdownMenu],
})
export class WrTableFilter {
  /** Available filter options. */
  readonly items = input.required<readonly WrTableFilterItem[]>();

  /** Fires whenever the selection changes. */
  readonly selectionChange = output<readonly WrTableFilterItem[]>();

  protected readonly query = signal('');

  /** Filtered + selection-tracked view of items. */
  protected readonly visible = computed<WrTableFilterItem[]>(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.items();
    if (!q) return [...all];
    return all.filter(i => i.title.toLowerCase().includes(q));
  });

  protected readonly selectedCount = computed(() => this.items().filter(i => i.selected).length);

  protected readonly classes = computed(() => {
    const parts = ['wr-table-filter'];
    if (this.selectedCount() > 0) parts.push('wr-table-filter--active');
    return parts.join(' ');
  });

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onToggle(item: WrTableFilterItem): void {
    item.selected = !item.selected;
    this.emitSelected();
  }

  protected onReset(): void {
    for (const item of this.items()) item.selected = false;
    this.selectionChange.emit([]);
  }

  private emitSelected(): void {
    this.selectionChange.emit(this.items().filter(i => i.selected));
  }
}
