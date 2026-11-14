/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input } from '@angular/core';

import { WrCheckbox } from 'ngwr/checkbox';
import { useI18nText } from 'ngwr/i18n';
import type { WrSafeAny } from 'ngwr/utils';

import type { WrTable } from './table';

/**
 * The column list of a `<wr-table>`, for a menu of your own: one checkbox per
 * column, in column order, under a "Show all" row. Place it in a popover, a
 * dropdown or a drawer and hand it the table. Every toggle writes the table's
 * `hiddenColumns`, so `hiddenColumnsChange` and `stateChange` fire as they do
 * from the built-in `columnChooser`, which renders this same list.
 *
 * A `hideable: false` column and the last visible one stay checked and
 * disabled. "Show all" shows every column; pressed while all are shown, it
 * hides every column that can be hidden, less the first when none is
 * `hideable: false`.
 *
 * @example
 * ```html
 * <button wr-btn type="button" [wrPopover]="menu">Columns</button>
 * <ng-template #menu>
 *   <wr-table-column-chooser [table]="table" />
 * </ng-template>
 *
 * <wr-table #table [columns]="columns" [items]="rows" [(hiddenColumns)]="hidden" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/table
 */
@Component({
  selector: 'wr-table-column-chooser',
  templateUrl: './table-column-chooser.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-table-column-chooser',
    role: 'group',
    '[attr.aria-label]': 'resolvedLabel()',
  },
  imports: [WrCheckbox],
})
export class WrTableColumnChooser {
  /** The table whose columns the list shows and hides. */
  readonly table = input.required<WrTable<WrSafeAny>>();

  /** Text of the "Show all" row. Falls back to `table.showAllColumns`. */
  readonly showAllLabel = input<string | null>(null);

  /** Accessible name of the list. Falls back to `table.columns`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedShowAll = useI18nText(this.showAllLabel, 'table.showAllColumns', 'Show all');
  protected readonly resolvedLabel = useI18nText(this.ariaLabel, 'table.columns', 'Columns');

  protected readonly columns = computed(() => this.table().chooserColumns());

  /** How many of the hideable columns are shown: every one, some, or none. */
  protected readonly showAllState = computed<'all' | 'some' | 'none'>(() => {
    const hideable = this.columns().filter(c => c.hideable);
    const hidden = hideable.filter(c => c.hidden).length;
    if (hidden === 0) return 'all';
    return hidden === hideable.length ? 'none' : 'some';
  });

  /** No column can be shown or hidden, so the row has nothing to do. */
  protected readonly showAllDisabled = computed(() => this.columns().every(c => c.locked));

  /**
   * Shows every column while one is hidden. Once all are shown it hides every
   * hideable one, and the table keeps its first column when that would leave none.
   */
  protected toggleShowAll(): void {
    const table = this.table();
    if (this.showAllState() !== 'all') return table.setHiddenColumns([]);
    table.setHiddenColumns(
      this.columns()
        .filter(c => c.hideable)
        .map(c => c.key)
    );
  }
}
