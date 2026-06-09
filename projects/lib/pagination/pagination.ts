/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButton, type WrButtonSize } from 'ngwr/button';
import { useI18nText } from 'ngwr/i18n';
import { WrOption, WrSelect } from 'ngwr/select';

import type { WrPaginationAlign, WrPaginationShape, WrPaginationSize } from './types';

const ELLIPSIS = '…' as const;
type PageEntry = number | typeof ELLIPSIS;

const numAttr =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

/**
 * Numbered page navigator with optional total / page-size controls.
 *
 * Two-way binds `currentPage` and `pageSize` via signal `model()` inputs.
 *
 * @example
 * ```html
 * <wr-pagination
 *   [total]="120"
 *   [(currentPage)]="page"
 *   [(pageSize)]="size"
 *   showTotal
 *   showSizeChanger
 * />
 * ```
 *
 * @see https://ngwr.dev/docs/components/pagination
 */
@Component({
  selector: 'wr-pagination',
  templateUrl: './pagination.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'navigation', 'aria-label': 'Pagination' },
  imports: [FormsModule, WrButton, WrSelect, WrOption],
})
export class WrPagination {
  /** Currently displayed page (1-based). Two-way bindable. */
  readonly currentPage = model<number>(1);

  /** Items per page. Two-way bindable. */
  readonly pageSize = model<number>(10);

  /** Total item count across all pages. */
  readonly total = input(0, { transform: numAttr(0) });

  /** Options shown in the page-size dropdown. */
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50, 100]);

  /** Render the page-size dropdown. @default false */
  readonly showSizeChanger = input(false, { transform: coerceBooleanProperty });

  /** Render the "X–Y of Z" total label. @default false */
  readonly showTotal = input(false, { transform: coerceBooleanProperty });

  /** Horizontal alignment. @default 'start' */
  readonly align = input<WrPaginationAlign>('start');

  /** Size variant — cascades to every internal button. @default 'md' */
  readonly size = input<WrPaginationSize>('md');

  /** Resolved button size — clamps xs/xl to the closest button size. @internal */
  protected readonly buttonSize = computed<WrButtonSize>(() => {
    const s = this.size();
    if (s === 'xs') return 'sm';
    if (s === 'xl') return 'lg';
    return s;
  });

  /** Cell corner treatment. @default 'rounded' */
  readonly shape = input<WrPaginationShape>('rounded');

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Localised text between range and total ("X–Y of Z"). Falls back to `pagination.of` then `'of'`. */
  readonly ofLabel = input<string | null>(null);

  /** Previous-page button aria-label. Falls back to `pagination.prev`. */
  readonly prevLabel = input<string | null>(null);

  /** Next-page button aria-label. Falls back to `pagination.next`. */
  readonly nextLabel = input<string | null>(null);

  /** "Items per page" label. Falls back to `pagination.itemsPerPage`. */
  readonly itemsPerPageLabel = input<string | null>(null);

  /** Resolved labels. */
  protected readonly resolvedOf = useI18nText(this.ofLabel, 'pagination.of', 'of');
  protected readonly resolvedPrev = useI18nText(this.prevLabel, 'pagination.prev', 'Previous page');
  protected readonly resolvedNext = useI18nText(this.nextLabel, 'pagination.next', 'Next page');
  protected readonly resolvedItemsPerPage = useI18nText(
    this.itemsPerPageLabel,
    'pagination.itemsPerPage',
    'Items per page'
  );

  /** Internal: total page count. */
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  /** Internal: "X–Y of Z" string. */
  protected readonly rangeLabel = computed(() => {
    const start = this.total() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.total());
    return `${start}-${end} ${this.resolvedOf()} ${this.total()}`;
  });

  /**
   * Internal: page list with ellipses. Window of 7 visible page slots.
   *
   *   1 … 5 6 [7] 8 9 … 20
   */
  protected readonly pages = computed<readonly PageEntry[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const items: PageEntry[] = [1];
    if (current > 4) items.push(ELLIPSIS);

    let start: number;
    let end: number;
    if (current <= 4) {
      start = 2;
      end = 5;
    } else if (current >= total - 3) {
      start = total - 4;
      end = total - 1;
    } else {
      start = current - 2;
      end = current + 2;
    }

    for (let i = start; i <= end; i++) items.push(i);
    if (current < total - 3) items.push(ELLIPSIS);
    if (end !== total) items.push(total);

    return items;
  });

  protected readonly ellipsis = ELLIPSIS;

  protected readonly classes = computed(() => {
    const parts = [
      'wr-pagination',
      `wr-pagination--${this.align()}`,
      `wr-pagination--${this.size()}`,
      `wr-pagination--${this.shape()}`,
    ];
    if (this.disabled()) parts.push('wr-pagination--disabled');
    return parts.join(' ');
  });

  protected isCurrent(page: number): boolean {
    return this.currentPage() === page;
  }

  protected goTo(page: number | typeof ELLIPSIS): void {
    if (typeof page !== 'number') return;
    if (this.disabled() || page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
  }

  protected onSizeChange(size: number): void {
    if (this.disabled() || size === this.pageSize()) return;
    this.pageSize.set(size);
    const cap = Math.max(1, Math.ceil(this.total() / size));
    if (this.currentPage() > cap) this.currentPage.set(cap);
  }
}
