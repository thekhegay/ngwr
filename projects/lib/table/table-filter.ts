/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, input, output, signal } from '@angular/core';

import { WrDropdown, WrDropdownMenu } from 'ngwr/dropdown';
import { useI18nText } from 'ngwr/i18n';
import { isComposing } from 'ngwr/utils';

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
  /** Accessible name of the filter trigger. Falls back to `table.filter`. */
  readonly filterLabel = input<string | null>(null);

  /** Text shown when the search finds nothing. Falls back to `table.noMatches`. */
  readonly noMatchesLabel = input<string | null>(null);

  /**
   * Placeholder AND accessible name of the search box. Falls back to `table.search`.
   *
   * One string for both because the box has no visible label: the placeholder was
   * its only name, so a hard-coded literal left the control unnamed in every other
   * language rather than merely untranslated.
   */
  readonly searchLabel = input<string | null>(null);

  /** Label of the clear-selection button. Falls back to `table.reset`. */
  readonly resetLabel = input<string | null>(null);

  protected readonly resolvedFilterLabel = useI18nText(this.filterLabel, 'table.filter', 'Filter column');
  protected readonly resolvedNoMatchesLabel = useI18nText(this.noMatchesLabel, 'table.noMatches', 'No matches');
  protected readonly resolvedSearchLabel = useI18nText(this.searchLabel, 'table.search', 'Search');
  protected readonly resolvedResetLabel = useI18nText(this.resetLabel, 'table.reset', 'Reset');

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

  /**
   * Bumped on every selection change.
   *
   * `items` belongs to the CONSUMER — the column definition hands the same array
   * back on every render — and this component flips `selected` on those objects in
   * place. No signal sees a property mutation, so `selectedCount` memoised its
   * first answer: the count badge never appeared and the `--active` class never
   * arrived, however many boxes were ticked.
   */
  private readonly selectionVersion = signal(0);

  protected readonly selectedCount = computed(() => {
    this.selectionVersion();
    return this.items().filter(i => i.selected).length;
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-table-filter'];
    if (this.selectedCount() > 0) parts.push('wr-table-filter--active');
    return parts.join(' ');
  });

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /**
   * Hands every key back to the input method while a conversion is open.
   *
   * The dropdown this panel lives in closes on Escape, and it hears the key from
   * CDK's overlay keyboard dispatcher — one listener on `<body>`, in the bubble
   * phase. So not acting is not enough: the event has to be stopped here, at the
   * field that owns the composition, or Escape cancels the reading AND takes the
   * whole filter panel with it. Nothing else in this component reads a key, so
   * stopping all of them during a conversion costs nothing.
   */
  protected onSearchKeydown(event: KeyboardEvent): void {
    if (isComposing(event)) event.stopPropagation();
  }

  protected onToggle(item: WrTableFilterItem): void {
    item.selected = !item.selected;
    this.selectionVersion.update(v => v + 1);
    this.emitSelected();
  }

  protected onReset(): void {
    for (const item of this.items()) item.selected = false;
    this.selectionVersion.update(v => v + 1);
    this.selectionChange.emit([]);
  }

  private emitSelected(): void {
    this.selectionChange.emit(this.items().filter(i => i.selected));
  }
}
