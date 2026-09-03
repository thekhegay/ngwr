import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type WrI18nCatalog, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrPagination } from './pagination';

@Component({
  imports: [WrPagination],
  template: `
    <wr-pagination
      [(page)]="page"
      [(pageSize)]="pageSize"
      [total]="total()"
      [disabled]="disabled()"
      [showSizeChanger]="showSizeChanger()"
      [showTotal]="showTotal()"
      [responsive]="responsive()"
    />
  `,
})
class Host {
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(95);
  readonly disabled = signal(false);
  readonly showSizeChanger = signal(false);
  readonly showTotal = signal(false);
  readonly responsive = signal(false);
}

/**
 * Pagination is arithmetic plus a navigation contract, and both halves fail
 * quietly. `aria-current="page"` is what tells a screen-reader user where they
 * are — without it the strip is a row of indistinguishable numbers — and the
 * page-count maths decides whether the last page is reachable at all.
 */
describe('WrPagination', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  // Every control here is the `<wr-btn>` ELEMENT form, not a native <button> —
  // which is exactly why it needs `role` / `tabindex` from the component.
  const pageButtons = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-pagination__page')];
  const controls = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-btn')];
  const labelled = (fragment: string): HTMLElement | undefined =>
    controls().find(b => (b.getAttribute('aria-label') ?? '').toLowerCase().includes(fragment));
  const isOff = (el: HTMLElement): boolean => el.getAttribute('aria-disabled') === 'true';
  const page = (): number => fixture.componentInstance.page();

  const clickPage = (label: string): void => {
    pageButtons()
      .find(b => b.textContent.trim() === label)!
      .click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('marks the current page for assistive tech, and only that one', () => {
    const current = pageButtons().filter(b => b.getAttribute('aria-current') === 'page');

    expect(current).toHaveLength(1);
    expect(current[0].textContent.trim()).toBe('1');
  });

  it('moves aria-current with the page', () => {
    clickPage('3');

    expect(page()).toBe(3);
    expect(
      pageButtons()
        .find(b => b.getAttribute('aria-current') === 'page')!
        .textContent.trim()
    ).toBe('3');
  });

  it('offers the last page for a total that does not divide evenly', () => {
    // 95 over 10 is 9.5 pages. Flooring loses the last five records entirely,
    // with nothing on screen to say they exist.
    clickPage('10');
    expect(page()).toBe(10);
  });

  it('recomputes the page count when the page size changes', () => {
    fixture.componentInstance.pageSize.set(50);
    fixture.detectChanges();

    const numbers = pageButtons().map(b => b.textContent.trim());
    expect(numbers).toContain('2');
    expect(numbers).not.toContain('3');
  });

  it('always offers one page, even with nothing to show', () => {
    fixture.componentInstance.total.set(0);
    fixture.detectChanges();

    // Zero pages leaves the strip empty and the control unusable; the empty
    // state belongs to the list, not to the pager.
    expect(pageButtons().map(b => b.textContent.trim())).toContain('1');
  });

  it('steps with the previous and next buttons', () => {
    labelled('next')!.click();
    fixture.detectChanges();
    expect(page()).toBe(2);

    labelled('prev')!.click();
    fixture.detectChanges();
    expect(page()).toBe(1);
  });

  it('disables previous on the first page and next on the last', () => {
    expect([isOff(labelled('prev')!), isOff(labelled('next')!)]).toEqual([true, false]);

    fixture.componentInstance.page.set(10);
    fixture.detectChanges();

    expect([isOff(labelled('prev')!), isOff(labelled('next')!)]).toEqual([false, true]);
  });

  it('keeps every control reachable by keyboard', () => {
    // Built on the `<wr-btn>` element, which has no button semantics of its
    // own. Measured in Chromium before the fix: this whole subtree held zero
    // focusable nodes and Tab never entered it.
    expect(controls().length).toBeGreaterThan(0);
    expect(controls().every(b => b.getAttribute('role') === 'button')).toBe(true);
    expect(
      controls()
        .filter(b => !isOff(b))
        .every(b => b.getAttribute('tabindex') === '0')
    ).toBe(true);
  });

  it('disables the whole control at once', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(controls().every(b => isOff(b))).toBe(true);
    expect(controls().every(b => b.getAttribute('tabindex') === null)).toBe(true);
  });

  it('names every page button, since the digit alone says nothing out of context', () => {
    expect(pageButtons().every(b => (b.getAttribute('aria-label') ?? '').length > 1)).toBe(true);
  });

  it('pulls the page back when the total shrinks under it', () => {
    // It only ever clamped when the page SIZE changed through its own control, so
    // a filtered list left it on "page 7" of a two-page set — and, bound to a
    // table, pointing at an empty slice.
    fixture.componentInstance.page.set(7);
    fixture.detectChanges();
    expect(page()).toBe(7);

    fixture.componentInstance.total.set(20);
    fixture.detectChanges();

    expect(page()).toBe(2);
  });

  it('leaves a page that is still in range alone', () => {
    fixture.componentInstance.page.set(3);
    fixture.componentInstance.total.set(50);
    fixture.detectChanges();

    expect(page()).toBe(3);
  });

  it('pulls a host write back into range, at both ends', () => {
    // `page` is a `model`, so the host can write anything into it. The
    // clamp used to sit inside `untracked()` and pull downwards only, so it
    // reacted to a shrinking `total` and never to the host: 95 items over 10 is
    // ten pages, and both writes below stayed exactly where the host put them.
    fixture.componentInstance.page.set(13);
    fixture.detectChanges();
    expect(page()).toBe(10);

    fixture.componentInstance.page.set(0);
    fixture.detectChanges();
    expect(page()).toBe(1);
  });

  it('leaves nothing inert behind an out-of-range host write', () => {
    // What the unclamped page actually cost: no cell carried `aria-current`, so
    // the strip was a row of indistinguishable numbers; Next stayed enabled
    // because `page() === totalPages()` was false, and clicking it did
    // nothing since `goTo` refuses page 14; and the range label counted
    // backwards from a page below the first.
    fixture.componentInstance.showTotal.set(true);
    fixture.componentInstance.page.set(13);
    fixture.detectChanges();

    const current = pageButtons().filter(b => b.getAttribute('aria-current') === 'page');
    expect(current.map(b => b.textContent.trim())).toEqual(['10']);
    expect(isOff(labelled('next')!)).toBe(true);

    fixture.componentInstance.page.set(0);
    fixture.detectChanges();

    expect(root().querySelector('.wr-pagination__total')!.textContent.trim()).toBe('1–10 of 95');
    expect(isOff(labelled('prev')!)).toBe(true);
  });

  it('leaves the page alone while the total is 0, and clamps once it settles', () => {
    // With no `loading` input, `total = 0` is ambiguous between "empty" and
    // "not loaded", and a server-paged host reads 0 on every navigation, so
    // correcting there took the pager back to page 1 and kept it. The clamp is
    // only deferred: the moment a real total arrives it applies, which is what
    // the second half asserts.
    fixture.componentInstance.page.set(5);
    fixture.componentInstance.total.set(0);
    fixture.detectChanges();

    expect(page()).toBe(5);
    // Nothing is left pointing past the end while it waits: one page renders,
    // and it is not the page the host holds, so no cell claims to be current.
    expect(pageButtons().map(b => b.textContent.trim())).toEqual(['1']);
    expect(pageButtons().filter(b => b.getAttribute('aria-current') === 'page')).toHaveLength(0);

    fixture.componentInstance.total.set(20);
    fixture.detectChanges();

    expect(page()).toBe(2);
  });

  it('refuses to step past the end while the total is 0', () => {
    // `totalPages()` is 1 there, so the arrows must not become a way out of the
    // range the guard has stopped enforcing.
    fixture.componentInstance.page.set(3);
    fixture.componentInstance.total.set(0);
    fixture.detectChanges();

    labelled('next')!.click();
    fixture.detectChanges();

    expect(page()).toBe(3);
  });

  it('shows a size changer only when asked', () => {
    expect(root().querySelector('wr-select')).toBeNull();

    fixture.componentInstance.showSizeChanger.set(true);
    fixture.detectChanges();

    expect(root().querySelector('wr-select')).not.toBeNull();
  });

  it('names the size changer on the combobox, where a screen reader reads it', () => {
    // The label used to be written with `[attr.aria-label]` on the `<wr-select>`
    // HOST, which has no role — so it named nothing and the button inside fell
    // through to the catalog's generic "Select". Asserting on the host would have
    // passed the whole time; the combobox is the only element worth reading.
    fixture.componentInstance.showSizeChanger.set(true);
    fixture.detectChanges();

    const combobox = root().querySelector<HTMLElement>('[role="combobox"]')!;
    expect(combobox.getAttribute('aria-label')).toBe('Items per page');
  });

  it('hangs the RTL arrow mirror on a class, and only on the two nav buttons', () => {
    // The prev / next chevrons are inline SVG baked to a physical direction,
    // while `.wr-pagination__nav` is a plain flex row that mirrors — so under
    // `dir="rtl"` "previous" sits at the right edge pointing left, away from
    // where it goes. The stylesheet flips them with `scaleX(-1)`, which jsdom
    // cannot see (no cascade); what a spec CAN pin is the hook that rule needs,
    // and that it does not reach the numbered cells, whose digits would mirror
    // into gibberish. It is a class rather than `:first-child` / `:last-child`
    // so the mirror follows the buttons' role rather than their position, which
    // holds only while every child of the row stays unconditional.
    const nav = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-pagination__nav-btn')];

    expect(nav()).toHaveLength(2);
    expect(nav()[0]).toBe(labelled('prev'));
    expect(nav()[1]).toBe(labelled('next'));
    expect(pageButtons().some(b => b.classList.contains('wr-pagination__nav-btn'))).toBe(false);
  });

  describe('responsive mode', () => {
    it('is a class and nothing else — the reflow is a container query', () => {
      // Worth stating plainly: `responsive` renders no different markup. It opts the
      // host into a `@container` rule, so a spec can pin the switch and nothing past
      // it, and a test asserting a collapsed strip would be asserting jsdom.
      const host = (): HTMLElement => root().querySelector('wr-pagination')!;
      const strip = (): number => pageButtons().length;

      const before = strip();
      expect(host().className).not.toContain('wr-pagination--responsive');

      fixture.componentInstance.responsive.set(true);
      fixture.detectChanges();

      expect(host().className).toContain('wr-pagination--responsive');
      expect(strip()).toBe(before);
    });

    it('keeps the compact pager out of the accessibility tree, in both modes', () => {
      // The `3 / 10` label the narrow layout swaps in is always in the DOM — CSS
      // decides which of the two is visible — so without `aria-hidden` a screen
      // reader would read the position twice on every page, at every width.
      const compact = (): HTMLElement => root().querySelector('.wr-pagination__current')!;
      expect(compact().getAttribute('aria-hidden')).toBe('true');

      fixture.componentInstance.responsive.set(true);
      fixture.detectChanges();

      expect(compact().getAttribute('aria-hidden')).toBe('true');
      expect(compact().textContent.trim()).toBe('1 / 10');
    });
  });
});

/**
 * The shape a server-paged host actually has: the page number is a request
 * parameter, so every navigation invalidates the response that carries `total`.
 * Angular's `resource` drops its value whenever the params change — and a params
 * function returning an object literal is never reference-equal — so `total`
 * legitimately reads 0 between the click and the answer.
 */
@Component({
  imports: [WrPagination],
  template: ` <wr-pagination [total]="total()" [page]="page()" [pageSize]="10" (pageChange)="goTo($event)" /> `,
})
class ServerHost {
  readonly page = signal(1);
  readonly total = signal(51);

  /** Every `pageChange`, in order — the count is the point, not the last value. */
  readonly navigations: number[] = [];

  goTo(next: number): void {
    this.navigations.push(next);
    this.page.set(next);
    this.total.set(0); // the request goes out and the previous payload is gone
  }

  /** The response lands. */
  settle(): void {
    this.total.set(51);
  }
}

describe('WrPagination against a server-side total', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ServerHost>>;

  const host = (): ServerHost => fixture.componentInstance;
  const pageButtons = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-pagination__page'),
  ];
  const current = (): string[] =>
    pageButtons()
      .filter(b => b.getAttribute('aria-current') === 'page')
      .map(b => b.textContent.trim());
  const clickPage = (label: string): void => {
    pageButtons()
      .find(b => b.textContent.trim() === label)!
      .click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ServerHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('stays on the page the user picked while the request is in flight', () => {
    // The guard clamped against the in-flight 0: `totalPages()` was 1, page 2
    // was pulled back and `pageChange(1)` went out on top of the click,
    // so the host re-requested page 1 and the pager could never leave it.
    // Asserting the final page alone would pass on that — it corrected back to
    // a plausible number — so the event log is what this spec is really for.
    clickPage('2');

    expect(host().page()).toBe(2);
    expect(host().navigations).toEqual([2]);

    host().settle();
    fixture.detectChanges();

    expect(host().page()).toBe(2);
    expect(host().navigations).toEqual([2]);
    expect(current()).toEqual(['2']);
  });
});

/**
 * A SETTLED empty total — an ordinary filter that narrows the list to nothing
 * while the host still holds the page it was reading. Nothing is in flight, so
 * every reading below is the pager's resting state rather than a transient, and
 * the user has to be able to get out of it: `responsive` is on and the box is
 * narrow in the real case, where `@container wr-pagination (max-width: 24rem)`
 * hides `.wr-pagination__page` and the arrows are the only controls left.
 */
@Component({
  imports: [WrPagination],
  template: `
    <wr-pagination showTotal responsive [total]="total()" [page]="page()" [pageSize]="10" (pageChange)="goTo($event)" />
  `,
})
class EmptyTotalHost {
  readonly page = signal(5);
  readonly total = signal(0);

  /** Every `pageChange`, in order. */
  readonly navigations: number[] = [];

  goTo(next: number): void {
    this.navigations.push(next);
    this.page.set(next);
  }
}

describe('WrPagination past the end of a settled empty total', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<EmptyTotalHost>>;

  const host = (): EmptyTotalHost => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const labelled = (fragment: string): HTMLElement =>
    [...root().querySelectorAll<HTMLElement>('wr-btn')].find(b =>
      (b.getAttribute('aria-label') ?? '').toLowerCase().includes(fragment)
    )!;
  const isOff = (el: HTMLElement): boolean => el.getAttribute('aria-disabled') === 'true';

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(EmptyTotalHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('walks the previous arrow back into range instead of off the end', () => {
    // The escape hatch. Prev used to ask for `goTo(4)`, which `goTo` refuses
    // because 4 is past `totalPages()` of 1 — so the arrow was enabled and
    // inert, and on a narrow responsive box, where the numbered cells are
    // hidden, there was no way to leave page 5 at all. The target is clamped to
    // the end of the valid range, so the step only ever moves inward.
    labelled('prev').click();
    fixture.detectChanges();

    expect(host().page()).toBe(1);
    expect(host().navigations).toEqual([1]);
  });

  it('disables the next arrow, which has nowhere to go', () => {
    // The arrows report the RANGE, not equality with its end: at page 5 of one
    // page `page() === totalPages()` is false, so next rendered enabled
    // and did nothing. Prev stays enabled in the same state because it does
    // have somewhere to go — the two are asserted together on purpose.
    expect(isOff(labelled('next'))).toBe(true);
    expect(isOff(labelled('prev'))).toBe(false);
  });

  it('clamps a host write below the first page, empty total or not', () => {
    // The lower bound is never about `total`: no value of it makes page 0
    // correct. Both labels are where it showed — `rangeLabel()` guards `start`
    // for an empty total and not `end`, so it read "0--30 of 0", and the
    // compact pager read "-3 / 1".
    host().page.set(-3);
    fixture.detectChanges();

    expect(host().page()).toBe(1);
    expect(host().navigations).toEqual([1]);
    expect(root().querySelector('.wr-pagination__total')!.textContent.trim()).toBe('0–0 of 0');
    expect(root().querySelector('.wr-pagination__current')!.textContent.trim()).toBe('1 / 1');
  });
});

/**
 * A host wired the conventional way: a new page size starts the list over at
 * the first page. `resetsPage` off is the other half — a host that keeps its
 * page and leaves the correction to the component.
 */
@Component({
  imports: [WrPagination],
  template: `
    <wr-pagination
      showSizeChanger
      [total]="total()"
      [page]="page()"
      [pageSize]="size()"
      [pageSizeOptions]="[10, 25]"
      (pageChange)="goTo($event)"
      (pageSizeChange)="resize($event)"
    />
  `,
})
class SizeChangerHost {
  readonly page = signal(6);
  readonly size = signal(10);
  readonly total = signal(120);
  readonly resetsPage = signal(true);

  readonly navigations: number[] = [];
  readonly resizes: number[] = [];

  goTo(next: number): void {
    this.navigations.push(next);
    this.page.set(next);
  }

  resize(next: number): void {
    this.resizes.push(next);
    this.size.set(next);
    if (this.resetsPage()) this.page.set(1);
  }
}

describe('WrPagination size changer', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SizeChangerHost>>;

  const host = (): SizeChangerHost => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];

  // The panel is a CDK overlay, so its options land outside the fixture.
  const chooseSize = (label: string): void => {
    root().querySelector<HTMLElement>('.wr-select__trigger')!.click();
    fixture.detectChanges();
    options()
      .find(o => o.textContent.trim() === label)!
      .click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SizeChangerHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it("leaves the host's own page policy standing", () => {
    // `pageSize.set` emits synchronously, so the host has already reset to page
    // 1 by the next statement — and that write reaches the model only on the
    // following binding pass. Clamping there read the pre-change page 6 and
    // emitted `pageChange(5)` over the reset, which the host cannot tell
    // from a navigation: page 3 on screen and two requests for one choice.
    chooseSize('25 / page');

    expect(host().resizes).toEqual([25]);
    expect(host().navigations).toEqual([]);
    expect(host().size()).toBe(25);
    expect(host().page()).toBe(1);
  });

  it('still pulls a kept page into range, once for the whole change', () => {
    // What the imperative clamp was for. The settled guard covers it, and this
    // is the spec that proves removing it cost nothing: 120 items over 25 is
    // five pages, so a host that stays on 6 is corrected to 5 — after the
    // bindings settle, from the page the host actually holds.
    host().resetsPage.set(false);

    chooseSize('25 / page');

    expect(host().resizes).toEqual([25]);
    expect(host().navigations).toEqual([5]);
    expect(host().page()).toBe(5);
  });
});

/**
 * The range line and the compact pager, as translatable UNITS.
 *
 * Both used to be assembled in code around one catalog word — `${start}-${end}
 * ${of} ${total}` and `{{ page() }} / {{ totalPages() }}` — so a locale
 * could change "of" and nothing else: not the ASCII hyphen between the bounds,
 * not the operand order, not the separator in the compact pager. Under the
 * audit's pseudo-locale the defect is literal, `1-10 ⟦pagination.of⟧ 235`.
 *
 * These specs assert the property that fixes it: one key per line, with named
 * placeholders, so a catalog can move the pieces. A catalog whose template puts
 * the total FIRST is the sharpest form of that — no amount of translating a
 * middle word gets there.
 */
describe('WrPagination — the range is one catalog template', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const text = (selector: string): string =>
    (fixture.nativeElement as HTMLElement).querySelector(selector)!.textContent.trim();

  const mount = async (catalog: WrI18nCatalog): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'xx', availableLocales: ['xx'] }),
        provideWrI18nStaticLoader({ xx: catalog }),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showTotal.set(true);
    fixture.detectChanges();
    // The static loader resolves through a promise even for a catalog already
    // in memory, so the first pass reads an empty one.
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('renders the shipped English template, en dash and all', async () => {
    await mount({ ...wrEn });

    expect(text('.wr-pagination__total')).toBe('1–10 of 95');
    expect(text('.wr-pagination__current')).toBe('1 / 10');
  });

  it('lets a catalog reorder the operands and repunctuate them', async () => {
    // The whole point. `of` could never have produced this line, in any
    // language, because the pieces it joins were fixed in TypeScript.
    await mount({
      pagination: { range: 'всего {{total}}: показаны {{from}}—{{to}}', compact: '{{total}} ← {{current}}' },
    });

    expect(text('.wr-pagination__total')).toBe('всего 95: показаны 1—10');
    expect(text('.wr-pagination__current')).toBe('10 ← 1');
  });

  it('formats all three numbers per LOCALE_ID, not just the words around them', async () => {
    // `LOCALE_ID` is `en-US` in TestBed, where grouping is a comma — so a
    // five-figure total is the one place this shows without a second provider.
    // The digits and the separator both follow it; a de-DE app reads `1.234`.
    await mount({ ...wrEn });
    fixture.componentInstance.total.set(1234);
    fixture.detectChanges();

    expect(text('.wr-pagination__total')).toBe('1–10 of 1,234');
  });

  it('leaves a page NUMBER ungrouped on its button', async () => {
    // Deliberate asymmetry, pinned so it is a decision rather than an oversight:
    // a total is a quantity and a page number is an identifier, and `1,024` on a
    // button reads as two of them.
    await mount({ ...wrEn });
    fixture.componentInstance.total.set(20_000);
    fixture.componentInstance.page.set(1024);
    fixture.detectChanges();

    const current = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-pagination__page')].find(
      b => b.getAttribute('aria-current') === 'page'
    );
    expect(current!.textContent.trim()).toBe('1024');
  });

  it('falls back to the English template with no catalog at all', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showTotal.set(true);
    fixture.detectChanges();

    expect(text('.wr-pagination__total')).toBe('1–10 of 95');
  });
});
