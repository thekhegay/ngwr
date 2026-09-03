/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

import { WrButtonHarness } from 'ngwr/button/testing';
import type { WrPaginationSize } from 'ngwr/pagination';
import { WrSelectHarness } from 'ngwr/select/testing';

import type { WrPaginationHarnessFilters } from './interfaces';

/**
 * Test harness for `<wr-pagination>` — the numbered strip, its two step controls,
 * the total label and the page-size changer.
 *
 * The strip is not the page list: it is a WINDOW over it, at most seven pages wide,
 * with an `…` standing in for every page it skipped. So "which pages can I click"
 * and "how many pages are there" are different questions and this harness keeps
 * them apart —
 * {@link getPages} answers the first, {@link getTotalPages} the second, and
 * {@link getStrip} shows the gaps for what they are. A gap is a `<span>`, not a
 * control; counting the strip's children as pages is the mistake this API exists to
 * make impossible.
 *
 * **Which page is current has two answers, and this reads the ARIA one.** The
 * current cell is also PAINTED — the template binds
 * `[color]="isCurrent(page) ? 'primary' : null"`, so `.wr-btn--primary` sits on it
 * too. But colour is a theming decision (`ngwr/config` names this very binding as
 * the reason it ships no app-wide `color` default), while `aria-current="page"` is
 * the navigation contract: it is what a screen-reader user hears, what the
 * component's own spec pins, and the only one of the two that still means
 * "you are here" after a restyle. A harness that read the class would be reporting
 * on the paint.
 *
 * **No roving tab stop to disambiguate.** Every cell is a `<wr-btn>` ELEMENT with
 * its own tab stop (`tabindex="0"`, dropped only while the control is off), so the
 * pager has no separate "focused" item that could drift from the current page —
 * unlike a tab strip or a radio group, there is one active state here and
 * {@link getCurrentPage} is it.
 *
 * Composed rather than re-queried: the cells and step controls are driven through
 * {@link WrButtonHarness}, which already knows how a `<wr-btn>` says it is off —
 * both the `disabled` attribute (written on every shape, though inert on a custom
 * element) and `aria-disabled`, in that order — and the size changer through
 * {@link WrSelectHarness}, whose panel is a portal in the overlay container and
 * nowhere inside the pager.
 *
 * jsdom notes: every method here is a class / attribute read or a no-arg click, so
 * none of it needs layout. Two things are therefore invisible in a unit test and
 * deliberately absent from this API — the responsive collapse, which is a container
 * query ({@link isResponsive} reports only that it is ALLOWED), and the compact
 * `‹ 3 / 10 ›` pager it swaps in, which is `aria-hidden` decoration duplicating
 * {@link getCurrentPage} and {@link getTotalPages} and which a real browser would
 * read as empty text while CSS keeps it hidden.
 *
 * @example
 * ```ts
 * const pager = await loader.getHarness(WrPaginationHarness);
 *
 * expect(await pager.getPages()).toEqual([1, 2, 3, 4, 5, 10]);
 * await pager.goToPage(3);
 * expect(await pager.getCurrentPage()).toBe(3);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrPaginationHarness extends ComponentHarness {
  static hostSelector = 'wr-pagination';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrPaginationHarnessFilters = {}): HarnessPredicate<WrPaginationHarness> {
    return new HarnessPredicate(WrPaginationHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('currentPage', options.currentPage, async (harness, page) => {
        // The nullable read on purpose: the throwing getter would reject the whole
        // query over one pager that announces no current page, taking its
        // well-behaved neighbours down with it.
        return (await harness.currentPageOrNull()) === page;
      })
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  /** The numbered cells, in DOM order — ascending, and never a gap. */
  private readonly pageCells = this.locatorForAll(WrButtonHarness.with({ selector: '.wr-pagination__page' }));

  /**
   * The two controls bracketing the strip: previous, then next.
   *
   * Located by POSITION, not by their labels. `prevLabel` / `nextLabel` are inputs
   * and both fall back to the `pagination.prev` / `pagination.next` catalog entries,
   * so an English `aria-label` match works right up until someone ships a locale —
   * whereas the nav's shape (one step control, the strip, one step control) is
   * structural. `:not(.wr-pagination__page)` is what keeps the cells out of it.
   */
  private readonly stepControls = this.locatorForAll(
    WrButtonHarness.with({ selector: '.wr-pagination__nav > wr-btn:not(.wr-pagination__page)' })
  );

  /** Both kinds of strip slot, in DOM order — cells and the gaps between them. */
  private readonly stripSlots = this.locatorForAll('.wr-pagination__page, .wr-pagination__ellipsis');

  private readonly totalLabel = this.locatorForOptional('.wr-pagination__total');

  private readonly sizeChanger = this.locatorForOptional(WrSelectHarness.with({ selector: '.wr-pagination__size' }));

  /**
   * The accessible name of the `role="navigation"` landmark.
   *
   * `''` only if the landmark lost its name, which is a bug rather than a state: a
   * page with two unnamed pagers gives a screen-reader user two identical
   * "navigation" landmarks.
   */
  async getLabel(): Promise<string> {
    return (await (await this.host()).getAttribute('aria-label')) ?? '';
  }

  /**
   * The size the pager RENDERS at, from its host modifier.
   *
   * The modifier is always emitted — `sm` included — so the fall-through below is
   * only ever reached for the default, and a size the strip is not wearing cannot
   * come back from here.
   *
   * The STRIP resolves nothing through `provideWrConfig()`, which is worth knowing
   * before an app-wide default is blamed for a cell size: the pager passes its own
   * `size` down to every `<wr-btn>` explicitly, so a configured `button.size` never
   * reaches a cell. The page-size changer is the exception and not covered by this
   * value — it is a bare `<wr-select>`, so `provideWrConfig({ select: … })` does
   * reach it.
   */
  async getSize(): Promise<WrPaginationSize> {
    const host = await this.host();
    if (await host.hasClass('wr-pagination--lg')) return 'lg';
    if (await host.hasClass('wr-pagination--md')) return 'md';
    return 'sm';
  }

  /**
   * Whether the pager is ALLOWED to collapse into its compact pager.
   *
   * Whether it HAS collapsed is a container query on the control's own box, and a
   * unit test has no layout for one to answer — assert this input in jsdom and the
   * reflow itself in a real browser.
   */
  async isResponsive(): Promise<boolean> {
    return (await this.host()).hasClass('wr-pagination--responsive');
  }

  /**
   * Whether the whole control refuses interaction.
   *
   * Read from the host modifier, because a `role="navigation"` landmark has no ARIA
   * disabled state to prefer — the per-control answer lives on the buttons
   * themselves (`disabled` plus `aria-disabled` on each), which is what
   * {@link isPreviousDisabled} and {@link isNextDisabled} read.
   */
  async isDisabled(): Promise<boolean> {
    return (await this.host()).hasClass('wr-pagination--disabled');
  }

  /**
   * The whole strip in DOM order: a `number` for every page cell, and the gap
   * marker's own text (`…`) for every ellipsis.
   *
   * The marker is read from the DOM rather than compared against a literal, so a
   * component that changes what it draws in a gap changes this too instead of
   * quietly reporting a page.
   */
  async getStrip(): Promise<(number | string)[]> {
    const slots = await this.stripSlots();
    return Promise.all(
      slots.map(async slot => {
        const text = (await slot.text()).trim();
        return (await slot.hasClass('wr-pagination__ellipsis')) ? text : Number(text);
      })
    );
  }

  /**
   * The pages that can be clicked right now, ascending. Gaps are not pages and are
   * not here — `[1, 8, 9, 10, 11, 12, 20]` for a twenty-page list sitting on 10.
   */
  async getPages(): Promise<number[]> {
    const cells = await this.pageCells();
    return Promise.all(cells.map(async cell => Number(await cell.getText())));
  }

  /**
   * How many pages there are — not how many are on the strip.
   *
   * Taken from the LAST cell, which the window always pins to the final page (the
   * first is pinned the same way), so this survives the gap that usually precedes
   * it. Deliberately not read from the compact `3 / 10` pager: that span is
   * `aria-hidden` and CSS-hidden outside responsive mode, so a browser-based
   * harness environment would read it as empty.
   */
  async getTotalPages(): Promise<number> {
    const pages = await this.getPages();
    const last = pages.at(-1);
    if (last === undefined) {
      throw new Error(
        'WrPaginationHarness.getTotalPages(): the strip has no page cells at all. The pager offers page ' +
          '1 even for an empty list, so this is a rendering failure rather than an empty state.'
      );
    }
    return last;
  }

  /**
   * The page the pager announces as current, from `aria-current="page"`.
   *
   * Throws when no cell claims it. The window always keeps the current page on the
   * strip, so getting here means `currentPage` is not one of the pages at all. The
   * component clamps a host write into `1..totalPages`, which leaves one survivor:
   * a fractional page, which is in range and matches no cell — and which leaves
   * every cell looking equally inactive to an assistive tech user.
   */
  async getCurrentPage(): Promise<number> {
    const page = await this.currentPageOrNull();
    if (page === null) {
      throw new Error(
        'WrPaginationHarness.getCurrentPage(): no cell carries `aria-current="page"`. The visible window ' +
          `always includes the current page, so \`currentPage\` is not a whole number — the component ` +
          `clamps it into 1..${await this.getTotalPages()} but does not round it.`
      );
    }
    return page;
  }

  /**
   * Click the cell for a page.
   *
   * Throws when that page is not on the strip — a seven-slot window over twenty
   * pages simply has no cell for page 15, and a silent no-op there reads as
   * "navigation is broken" three assertions later. Step with {@link next} /
   * {@link previous}, or move the host's own `currentPage` model.
   *
   * A disabled pager is still clicked; the component's own guard is what refuses
   * the move, so assert the page rather than assume it. Clicking the CURRENT page
   * is a no-op by the same guard.
   */
  async goToPage(page: number): Promise<void> {
    for (const cell of await this.pageCells()) {
      if (Number(await cell.getText()) === page) {
        await cell.click();
        return;
      }
    }

    throw new Error(
      `WrPaginationHarness.goToPage(): page ${page} is not on the strip, which offers ` +
        `${(await this.getStrip()).join(' ')}. The window shows at most seven pages — step with next() / ` +
        'previous(), or set the page on the host.'
    );
  }

  /**
   * Jump to page 1.
   *
   * There is no dedicated first / last control in this component; the window pins
   * the first and last page to the ends of the strip instead, so these two click
   * cells like any other page.
   */
  async goToFirst(): Promise<void> {
    return this.goToPage(1);
  }

  /** Jump to the last page — the trailing cell, not the last one before a gap. */
  async goToLast(): Promise<void> {
    return this.goToPage(await this.getTotalPages());
  }

  /**
   * Click the next-page control.
   *
   * Disabled on the last page, and a disabled `<wr-btn>` is still clicked here (see
   * {@link goToPage}) — {@link isNextDisabled} is the question, this is the action.
   */
  async next(): Promise<void> {
    return (await this.stepControl('next')).click();
  }

  /** Click the previous-page control. Disabled on the first page. */
  async previous(): Promise<void> {
    return (await this.stepControl('previous')).click();
  }

  /**
   * Whether the next-page control refuses the move — true on the last page, and
   * true for every control while the pager is disabled.
   *
   * Answered by {@link WrButtonHarness}, which reads the `disabled` attribute first
   * and `aria-disabled` second. A `<wr-btn>` element carries both: the attribute is
   * inert on anything but a real `<button>`, which is why the component adds the
   * ARIA state as well — so this is the accessible answer whichever branch supplies
   * it.
   */
  async isNextDisabled(): Promise<boolean> {
    return (await this.stepControl('next')).isDisabled();
  }

  /** Whether the previous-page control refuses the move — true on the first page. */
  async isPreviousDisabled(): Promise<boolean> {
    return (await this.stepControl('previous')).isDisabled();
  }

  /** Whether the pager shows its "X–Y of Z" label (the `showTotal` input). */
  async hasTotal(): Promise<boolean> {
    return (await this.totalLabel()) !== null;
  }

  /**
   * The total label exactly as rendered, e.g. `1–10 of 95`.
   *
   * The WHOLE string is one catalog entry (`pagination.range`) and the three
   * numbers in it are formatted per `LOCALE_ID`, so a spec asserting the literal
   * owns both the copy and the locale it asserts under. Note the range separator
   * is an en dash, not the ASCII hyphen this used to print.
   *
   * Throws when the label is not rendered, which is a `showTotal` that was never
   * set rather than a total of zero (a zero total still renders `0–0 of 0`).
   */
  async getTotalText(): Promise<string> {
    const label = await this.totalLabel();
    if (!label) {
      throw new Error(
        'WrPaginationHarness.getTotalText(): this pager renders no total label — set `showTotal`. A ' +
          'total of 0 still renders one.'
      );
    }
    return label.text();
  }

  /** Whether the pager renders its page-size changer (the `showSizeChanger` input). */
  async hasPageSizeChanger(): Promise<boolean> {
    return (await this.sizeChanger()) !== null;
  }

  /**
   * The page-size changer as a {@link WrSelectHarness} — for anything this harness
   * does not wrap: the offered labels, the open state, keyboard driving.
   *
   * Composed rather than re-queried on purpose: the changer is a real
   * `<wr-select>`, its options live in the overlay container rather than inside the
   * pager, and the select harness is the thing that already knows how to scope them
   * to their own trigger.
   *
   * Throws when there is no changer — an `undefined` here would turn into a
   * confusing failure inside a select call.
   */
  async getPageSizeSelect(): Promise<WrSelectHarness> {
    const select = await this.sizeChanger();
    if (!select) {
      throw new Error('WrPaginationHarness.getPageSizeSelect(): no page-size changer here — set `showSizeChanger`.');
    }
    return select;
  }

  /**
   * The page size currently in effect.
   *
   * The changer's trigger is the only place the size reaches the DOM, so this reads
   * it there and takes the digits: the label is localizable (`pagination.perPage`,
   * `{{size}} / page`) but interpolates the number in every language — unless a
   * catalog entry drops the placeholder, which is the second throw below.
   *
   * Throws when there is no changer at all: a pager without one says nothing on
   * screen about its page size, and the host's own model is where to assert it.
   */
  async getPageSize(): Promise<number> {
    const text = await (await this.getPageSizeSelect()).getValueText();
    const digits = /\d+/.exec(text);
    if (!digits) {
      throw new Error(
        `WrPaginationHarness.getPageSize(): the changer reads "${text}", which names no number — a ` +
          'catalog entry for `pagination.perPage` that drops `{{size}}` takes the size off the screen.'
      );
    }
    return Number(digits[0]);
  }

  /**
   * Pick a page size through the changer, the way a user does.
   *
   * Matched on the digits rather than the whole label, for the same reason
   * {@link getPageSize} reads them: `20 / page` and `20 / стр.` are the same option.
   * Throws when no option offers that size, naming what is on offer.
   *
   * Changing the size can move the page — the component pulls `currentPage` back
   * when the new size leaves it past the end — so re-read {@link getCurrentPage}
   * afterwards rather than assuming it held.
   */
  async setPageSize(size: number): Promise<void> {
    const select = await this.getPageSizeSelect();
    if (await this.isDisabled()) {
      // Without this the call fails inside the select harness, whose message blames
      // a tag-mode panel and a `minChars` search that have nothing to do with it.
      throw new Error(
        'WrPaginationHarness.setPageSize(): the pager is disabled, so its changer refuses to open — the ' +
          'pager hands its own `disabled` straight to it.'
      );
    }

    await select.open();

    const labels = await select.getOptionLabels();
    const digits = new RegExp(`(^|\\D)${size}(\\D|$)`);
    const match = labels.find(label => digits.test(label));
    if (match === undefined) {
      throw new Error(
        `WrPaginationHarness.setPageSize(): no option offers ${size} — the changer offers ` +
          `${labels.join(', ')}. \`pageSizeOptions\` is what decides that list.`
      );
    }

    await select.selectOption({ text: match });
  }

  /** The current page, or `null` when no cell announces one. @see getCurrentPage */
  private async currentPageOrNull(): Promise<number | null> {
    const cell = await this.locatorForOptional(
      WrButtonHarness.with({ selector: '.wr-pagination__page[aria-current="page"]' })
    )();
    return cell ? Number(await cell.getText()) : null;
  }

  private async stepControl(which: 'previous' | 'next'): Promise<WrButtonHarness> {
    const controls = await this.stepControls();
    if (controls.length !== 2) {
      throw new Error(
        `WrPaginationHarness: expected the nav to bracket the strip with a previous and a next control, ` +
          `found ${controls.length}. They are addressed by position, since their labels are localizable.`
      );
    }
    return which === 'previous' ? controls[0] : controls[1];
  }
}
