/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, LOCALE_ID, ViewEncapsulation, computed, effect, inject, input, model } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrOption, WrSelect } from 'ngwr/select';
import { numAttr } from 'ngwr/utils';

import type { WrPaginationAlign, WrPaginationShape, WrPaginationSize } from './interfaces';

const ELLIPSIS = '…' as const;
type PageEntry = number | typeof ELLIPSIS;

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
 * @see https://ngwr.dev/reference/components/pagination
 */
@Component({
  selector: 'wr-pagination',
  templateUrl: './pagination.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'navigation', '[attr.aria-label]': 'navLabel()' },
  imports: [WrButton, WrSelect, WrOption],
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

  /** Size variant — cascades to every internal button. @default 'sm' */
  readonly size = input<WrPaginationSize>('sm');

  /** Cell corner treatment. @default 'rounded' */
  readonly shape = input<WrPaginationShape>('rounded');

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Collapse to a compact `‹ page / total ›` pager when the control's own box
   * is too narrow for the full numbered strip (a container query on its own
   * width, not the viewport). @default false
   */
  readonly responsive = input(false, { transform: coerceBooleanProperty });

  /** Previous-page button aria-label. Falls back to `pagination.prev`. */
  readonly prevLabel = input<string | null>(null);

  /** Next-page button aria-label. Falls back to `pagination.next`. */
  readonly nextLabel = input<string | null>(null);

  /** "Items per page" label. Falls back to `pagination.itemsPerPage`. */
  readonly itemsPerPageLabel = input<string | null>(null);

  /** Accessible name for the `role="navigation"` host. Falls back to `pagination.label`. */
  readonly label = input<string | null>(null);

  /** Resolved labels. */
  protected readonly resolvedPrev = useI18nText(this.prevLabel, 'pagination.prev', 'Previous page');
  protected readonly resolvedNext = useI18nText(this.nextLabel, 'pagination.next', 'Next page');
  protected readonly resolvedItemsPerPage = useI18nText(
    this.itemsPerPageLabel,
    'pagination.itemsPerPage',
    'Items per page'
  );

  /**
   * Page-size option text — interpolates `{{size}}`. Was the template literal
   * `{{ option }} / page`, which no catalog could reach, so a Russian UI read
   * "25 / page".
   */
  protected readonly perPage = useI18nFormatter('pagination.perPage', '{{size}} / page');

  /** Per-page-button aria-label — interpolates `{{page}}`. */
  protected readonly goToPage = useI18nFormatter('pagination.goToPage', 'Go to page {{page}}');

  /** The nav landmark's own accessible name — was a hardcoded English literal. */
  protected readonly navLabel = useI18nText(this.label, 'pagination.label', 'Pagination');

  /** Internal: total page count. */
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  /**
   * Internal: where the previous arrow goes. Clamped to the end of the valid
   * range rather than being a plain `currentPage() - 1`, because the page can
   * legitimately sit past that end while `total` is 0 (see the guard effect).
   * From page 5 of one page, `goTo(4)` is refused as out of range, so the arrow
   * was enabled and did nothing — and under `responsive` on a narrow box the
   * numbered cells are hidden by a container query, which left no way back at
   * all. `Math.min` only ever moves the target INWARD, so `goTo`'s own
   * past-the-end refusal keeps working as the backstop it is.
   */
  protected readonly prevPage = computed(() => Math.min(this.currentPage() - 1, this.totalPages()));

  /**
   * Internal: the "1–10 of 235" line, as ONE catalog template.
   *
   * It used to be `` `${start}-${end} ${of} ${total}` ``, which localised the
   * word in the middle and nothing else: the ASCII hyphen between the bounds and
   * the operand order were both frozen in TypeScript, so ja-JP and ar-SA got
   * English word order and no language could change the range separator. The
   * three numbers go through `Intl.NumberFormat` for the same reason the total
   * beside them does — a five-figure total needs the locale's grouping, and
   * ar-SA needs its own digits.
   *
   * The `ofLabel` input is gone with it: an input for the middle word is the
   * concatenation, re-offered as API.
   */
  protected readonly rangeLabel = computed(() => {
    const start = this.total() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), this.total());
    return this.rangeText({
      from: this.number(start),
      to: this.number(end),
      total: this.number(this.total()),
    });
  });

  /** Internal: the compact pager's `1 / 24`, likewise a catalog template. */
  protected readonly compactLabel = computed(() =>
    this.compactText({ current: this.number(this.currentPage()), total: this.number(this.totalPages()) })
  );

  private readonly rangeText = useI18nFormatter('pagination.range', '{{from}}–{{to}} of {{total}}');
  private readonly compactText = useI18nFormatter('pagination.compact', '{{current}} / {{total}}');

  private readonly locale = inject(LOCALE_ID);

  /**
   * Grouped per `LOCALE_ID`. Only the range and the compact pager go through
   * this — a page NUMBER on a button is an identifier, and `1,024` on a button
   * reads as two things.
   */
  private number(value: number): string {
    return new Intl.NumberFormat(this.locale).format(value);
  }

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
    if (this.responsive()) parts.push('wr-pagination--responsive');
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

  /**
   * `wr-select` carries an `unknown` value by design, so the size arrives
   * untyped and is narrowed here. It used to arrive as `any` through
   * `[ngModel]`, which hid the coercion rather than removing the need for it.
   */
  constructor() {
    // `currentPage` is a plain `model` — a `model()` takes no transform — so a
    // shrinking `total` and a host `[(currentPage)]` write both land in it
    // unchecked. The guard used to read and write the page inside `untracked()`
    // and pull DOWNWARDS only, so it fired when `total` / `pageSize` moved and
    // never when the host wrote: past the end no cell carries `aria-current`,
    // the arrow at that end stays enabled and inert (`goTo` refuses the step
    // rather than correcting the stored page), and below 1 `rangeLabel()` counts
    // backwards ("-9-0 of 120"). Two-sided and tracked, the same shape
    // `wr-stepper` and `wr-carousel` use for their own host-owned `model()`.
    //
    // Only the UPPER bound is conditional. A `total` at or below 0 is the one
    // value where pulling the page down is destructive rather than cosmetic:
    // there is no `loading` input, so 0 is genuinely ambiguous between "the
    // list is empty" and "the page is still in flight", and the second is the
    // ordinary state of a server-paged host — Angular's `resource` drops its
    // value whenever the params change, and a params function returning an
    // object literal is never reference-equal, so `total` reads 0 between the
    // click and the response. `totalPages()` is 1 there, so the guard pulled
    // every page above the first back to 1 and emitted a `currentPageChange`
    // the host could not tell from a click: the pager could not leave page 1,
    // and each click cost two events. A negative `total` is folded into the
    // same branch because it is as meaningless as a zero one.
    //
    // The LOWER bound is unconditional, and gating it on `total` was a mistake
    // in the first cut of this fix: no value of `total` makes page 0 correct,
    // and while it was skipped a host write of -3 survived — `rangeLabel()`
    // guards `start` for an empty total and not `end`, so it read "0--30 of 0",
    // and the compact pager read "-3 / 1". It is written as one expression
    // rather than an early return so the effect depends on `currentPage()` and
    // `total()` on every run, whichever branch decides the result.
    //
    // What IS still given up while `total` is 0 and the held page is past the
    // first: no cell carries `aria-current`, because `pages` renders the single
    // page and that is not the page the host holds. `rangeLabel()` is not in
    // that list — it already special-cases an empty total and reads "0-0 of 0".
    // Nor are the arrows: they compare against the RANGE rather than its ends
    // (see the template), so past the end next renders disabled and prev stays
    // enabled and steps back INTO range via `prevPage`. That is a change from
    // the "enabled and inert" behaviour described above, which this component
    // used to accept at both ends.
    effect(() => {
      const page = this.currentPage();
      const floored = Math.max(1, page);
      const clamped = this.total() <= 0 ? floored : Math.min(floored, this.totalPages());
      if (clamped !== page) this.currentPage.set(clamped);
    });
  }

  protected onSizeChange(size: unknown): void {
    const next = Number(size);
    if (this.disabled() || !Number.isFinite(next) || next <= 0 || next === this.pageSize()) return;
    // The size and nothing else. This used to clamp the page against the new
    // size too, and it read a value that was already superseded: `pageSize.set`
    // emits `pageSizeChange` synchronously, so by the following statement the
    // host has run its own policy — most tables reset to the first page — and
    // that write has not reached the model yet, it arrives on the next binding
    // pass. So the clamp computed a cap from the PRE-change page and wrote the
    // result over the host's decision: from page 6 at size 10, choosing 25
    // emitted `currentPageChange(5)` on top of the host's reset to 1, which the
    // host cannot tell from a navigation, and a second request went out. The
    // guard effect in the constructor takes it over and runs once the bindings
    // have settled, so it clamps the page the host actually wants.
    //
    // For a SETTLED `total` that is the whole story. For the server-paged host
    // this fix exists for it is not: the size change invalidates the payload
    // too, so `total` reads 0 and the guard returns early. Measured, from page
    // 6 at size 10 choosing 25 with a host that does not reset — in flight:
    // `navigations []`, page 6, total 0; after settle: `navigations [5]`, page
    // 5. So a non-resetting host issues one doomed request for a page that no
    // longer exists and is corrected only when the answer lands. That is an
    // accepted cost of refusing to write back from transient state, not
    // something the guard covers.
    this.pageSize.set(next);
  }
}
