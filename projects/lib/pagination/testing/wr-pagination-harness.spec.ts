import { type HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import { WrI18n, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrPagination, type WrPaginationSize } from 'ngwr/pagination';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrPaginationHarness } from './wr-pagination-harness';

@Component({
  imports: [WrPagination],
  template: `
    <wr-pagination
      label="Results"
      [total]="total()"
      [(page)]="page"
      [(pageSize)]="pageSize"
      [size]="size()"
      [showTotal]="showTotal()"
      [showSizeChanger]="showSizeChanger()"
      [pageSizeOptions]="pageSizeOptions()"
      [disabled]="disabled()"
      [responsive]="responsive()"
    />
  `,
})
class Host {
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(95);
  readonly size = signal<WrPaginationSize>('sm');
  readonly pageSizeOptions = signal<readonly number[]>([10, 20, 50, 100]);
  readonly showTotal = signal(true);
  readonly showSizeChanger = signal(true);
  readonly disabled = signal(false);
  readonly responsive = signal(false);
}

/** Twenty pages, parked in the middle — the only shape with a gap at BOTH ends. */
@Component({
  imports: [WrPagination],
  template: '<wr-pagination label="Rows" [total]="200" [(page)]="page" />',
})
class WideHost {
  readonly page = signal(10);
}

/** Two pagers, each named — the shape that catches one answering for the other. */
@Component({
  imports: [WrPagination],
  template: `
    <wr-pagination label="Products" [total]="30" [(page)]="products" />
    <wr-pagination label="Orders" [total]="95" [(page)]="orders" />
  `,
})
class TwoHost {
  readonly products = signal(1);
  readonly orders = signal(1);
}

/** No `label`, no `prevLabel` — every string comes from the catalog. */
@Component({
  imports: [WrPagination],
  template: '<wr-pagination [total]="95" [(page)]="page" [(pageSize)]="pageSize" showTotal showSizeChanger />',
})
class LocalizedHost {
  readonly page = signal(1);
  readonly pageSize = signal(10);
}

/**
 * Used exactly as a consumer would — through the loader, with nothing reached into.
 *
 * Two things about a pager are easy to get wrong from the outside, and most of what
 * follows is about them. The strip is a WINDOW: it shows seven slots and an `…` for
 * everything it skipped, so the cell count is not the page count and the gap is not
 * a page. And "which page am I on" has a painted answer (`.wr-btn--primary`, from
 * `[color]="isCurrent(page) ? 'primary' : null"`) as well as an announced one
 * (`aria-current="page"`) — the harness reads the announced one, and the first spec
 * here pins that both exist and agree.
 */
describe('WrPaginationHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: HarnessLoader;

  const cells = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-pagination__page'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    // The size changer's panel is a portal in the overlay container — an isolated
    // one, so it cannot outlive this file.
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the landmark, the rendered size and which parts are on', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    expect(await pager.getLabel()).toBe('Results');
    expect(await pager.getSize()).toBe('sm');
    expect(await pager.isDisabled()).toBe(false);
    expect(await pager.hasTotal()).toBe(true);
    expect(await pager.hasPageSizeChanger()).toBe(true);
  });

  it('reports each size the strip can render at', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    expect(await pager.getSize()).toBe('sm');

    fixture.componentInstance.size.set('md');
    await fixture.whenStable();
    expect(await pager.getSize()).toBe('md');

    fixture.componentInstance.size.set('lg');
    await fixture.whenStable();
    expect(await pager.getSize()).toBe('lg');
    // And it really is the size the cells wear. `md` is the button's own default
    // and carries no modifier of its own, so `lg` is the one visible on a cell.
    expect(cells().every(cell => cell.classList.contains('wr-btn--lg'))).toBe(true);
  });

  it('reports responsive as permission, never as a collapse', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    expect(await pager.isResponsive()).toBe(false);

    fixture.componentInstance.responsive.set(true);
    await fixture.whenStable();

    // The compact pager it swaps in is decided by a container query on the
    // control's own box, and a unit test has no box — this is the input, not the
    // reflow.
    expect(await pager.isResponsive()).toBe(true);
  });

  it('takes the current page from aria-current, not from the paint', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    const painted = (): string[] =>
      cells()
        .filter(cell => cell.classList.contains('wr-btn--primary'))
        .map(cell => cell.textContent.trim());
    const announced = (): string[] =>
      cells()
        .filter(cell => cell.getAttribute('aria-current') === 'page')
        .map(cell => cell.textContent.trim());

    // Both answers are in the DOM and they agree; the harness reads the one a
    // screen reader gets, which is the one that survives a restyle.
    expect([painted(), announced()]).toEqual([['1'], ['1']]);
    expect(await pager.getCurrentPage()).toBe(1);

    await pager.goToPage(3);

    expect(fixture.componentInstance.page()).toBe(3);
    expect(await pager.getCurrentPage()).toBe(3);
    expect([painted(), announced()]).toEqual([['3'], ['3']]);
  });

  it('keeps reading aria-current once the paint disagrees with it', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    // No host input can make the two disagree — one `isCurrent(page)` writes both
    // bindings onto the same cell — so the disagreement is forced here, on the
    // rendered DOM: the paint comes off the current cell and its announcement
    // stays. A harness matching `.wr-btn--primary` now finds no current page and
    // throws; the ARIA read is untouched. This is what makes the choice of
    // attribute an assertion instead of a comment.
    cells()[0].classList.remove('wr-btn--primary');
    await fixture.whenStable();

    expect(cells()[0].getAttribute('aria-current')).toBe('page');
    expect(await pager.getCurrentPage()).toBe(1);
    expect(await loader.getAllHarnesses(WrPaginationHarness.with({ page: 1 }))).toHaveLength(1);
  });

  it('offers the window, not the whole page list', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    expect(await pager.getStrip()).toEqual([1, 2, 3, 4, 5, '…', 10]);
    expect(await pager.getPages()).toEqual([1, 2, 3, 4, 5, 10]);
    expect(await pager.getTotalPages()).toBe(10);
  });

  it('refuses a page the window is not showing, and says what is on offer', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    await expect(pager.goToPage(8)).rejects.toThrow(/page 8 is not on the strip, which offers 1 2 3 4 5 … 10/);
    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('steps one page at a time', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    await pager.next();
    await pager.next();
    expect(await pager.getCurrentPage()).toBe(3);

    await pager.previous();
    expect(fixture.componentInstance.page()).toBe(2);
  });

  it('disables a step control at the end it cannot leave', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    expect([await pager.isPreviousDisabled(), await pager.isNextDisabled()]).toEqual([true, false]);
    // The click still lands — the component's own guard is what refuses the move,
    // and that guard is the thing worth asserting.
    await pager.previous();
    expect(fixture.componentInstance.page()).toBe(1);

    await pager.goToLast();

    expect([await pager.isPreviousDisabled(), await pager.isNextDisabled()]).toEqual([false, true]);
    await pager.next();
    expect(fixture.componentInstance.page()).toBe(10);
  });

  it('jumps to the first and last page through the cells the window pins', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    // Page 10 sits behind a gap from here: a harness that clicked "the cell before
    // the ellipsis" would land on 5 and report success.
    await pager.goToLast();
    expect(fixture.componentInstance.page()).toBe(10);

    await pager.goToFirst();
    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('reads the total label as rendered, and follows it across the pages', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    expect(await pager.getTotalText()).toBe('1–10 of 95');

    await pager.goToLast();

    // 95 over 10 is 9.5 pages: the last page holds five records, and a floor
    // somewhere in the arithmetic loses them with nothing on screen to say so.
    expect(await pager.getTotalText()).toBe('91–95 of 95');
  });

  it('refuses the total when the pager renders none', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    fixture.componentInstance.showTotal.set(false);
    await fixture.whenStable();

    expect(await pager.hasTotal()).toBe(false);
    await expect(pager.getTotalText()).rejects.toThrow(/set `showTotal`/);
  });

  it('reads and changes the page size through the composed select', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    expect(await pager.getPageSize()).toBe(10);

    const select = await pager.getPageSizeSelect();
    await select.open();
    expect(await select.getOptionLabels()).toEqual(['10 / page', '20 / page', '50 / page', '100 / page']);
    await select.close();

    await pager.setPageSize(20);

    expect(fixture.componentInstance.pageSize()).toBe(20);
    expect(await pager.getPageSize()).toBe(20);
    expect(await pager.getTotalPages()).toBe(5);
  });

  it('pulls the page back when a bigger size leaves it past the end', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    await pager.goToLast();

    await pager.setPageSize(50);

    // 95 records at 50 a page is two pages, so page 10 no longer exists.
    expect(fixture.componentInstance.page()).toBe(2);
    expect(await pager.getCurrentPage()).toBe(2);
    expect(await pager.getTotalPages()).toBe(2);
  });

  it('matches a size on whole digits, not on a substring of a bigger one', async () => {
    fixture.componentInstance.pageSizeOptions.set([100, 10, 20]);
    await fixture.whenStable();

    const pager = await loader.getHarness(WrPaginationHarness);
    await pager.setPageSize(100);
    expect(fixture.componentInstance.pageSize()).toBe(100);

    // "100 / page" comes first and contains "10". A substring match would pick it
    // again — a no-op that reads as success — so the digit boundaries are the
    // assertion here.
    await pager.setPageSize(10);

    expect(fixture.componentInstance.pageSize()).toBe(10);
    expect(await pager.getPageSize()).toBe(10);
  });

  it('names the sizes on offer when none matches', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    await expect(pager.setPageSize(25)).rejects.toThrow(/no option offers 25 — the changer offers 10 \/ page/);
  });

  it('refuses every size call when the pager renders no changer', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    fixture.componentInstance.showSizeChanger.set(false);
    await fixture.whenStable();

    expect(await pager.hasPageSizeChanger()).toBe(false);
    await expect(pager.getPageSizeSelect()).rejects.toThrow(/set `showSizeChanger`/);
    await expect(pager.getPageSize()).rejects.toThrow(/set `showSizeChanger`/);
    await expect(pager.setPageSize(20)).rejects.toThrow(/set `showSizeChanger`/);
  });

  it('turns every control off at once', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await pager.isDisabled()).toBe(true);
    expect([await pager.isPreviousDisabled(), await pager.isNextDisabled()]).toEqual([true, true]);
    expect(await (await pager.getPageSizeSelect()).isDisabled()).toBe(true);

    await pager.goToPage(3);
    expect(fixture.componentInstance.page()).toBe(1);

    // Without this guard the call would fail inside the select harness, blaming a
    // tag-mode panel that has nothing to do with it.
    await expect(pager.setPageSize(20)).rejects.toThrow(/pager is disabled/);
  });

  it('narrows by the announced page and by the disabled state', async () => {
    expect(await loader.getAllHarnesses(WrPaginationHarness.with({ page: 3 }))).toEqual([]);

    const pager = await loader.getHarness(WrPaginationHarness.with({ page: 1 }));
    await pager.goToPage(3);

    expect(await (await loader.getHarness(WrPaginationHarness.with({ page: 3 }))).getLabel()).toBe('Results');
    expect(await loader.getAllHarnesses(WrPaginationHarness.with({ disabled: true }))).toEqual([]);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await loader.getAllHarnesses(WrPaginationHarness.with({ disabled: true }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrPaginationHarness.with({ disabled: false }))).toEqual([]);
  });

  it('says so when the pager announces no current page at all', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    // A fraction is what is left once the component clamps both ends: 3.5 is in
    // range, so nothing pulls it back, and it matches no cell — which leaves every
    // one of them looking equally inactive to assistive tech. (This used to be
    // reached with page 0, until the component started clamping below 1 too.)
    fixture.componentInstance.page.set(3.5);
    await fixture.whenStable();

    await expect(pager.getCurrentPage()).rejects.toThrow(/no cell carries `aria-current="page"`/);
    // The strip is still readable, and the filter answers "not this one" instead of
    // rejecting — one broken pager must not fail a query for its neighbours.
    expect(await pager.getPages()).toEqual([1, 2, 3, 4, 5, 10]);
    expect(await loader.getAllHarnesses(WrPaginationHarness.with({ page: 1 }))).toEqual([]);
  });
});

describe('WrPaginationHarness — a twenty-page list, parked in the middle', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<WideHost>>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(WideHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('keeps the gaps out of the page list', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    expect(await pager.getStrip()).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 20]);
    // The two `…` spans are not pages. Counting the strip's children would report
    // nine of them, and the highest clickable page as 12.
    expect(await pager.getPages()).toEqual([1, 8, 9, 10, 11, 12, 20]);
    expect(await pager.getTotalPages()).toBe(20);
  });

  it('reaches the last page behind the trailing gap', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    await pager.goToLast();

    expect(fixture.componentInstance.page()).toBe(20);
    expect(await pager.getCurrentPage()).toBe(20);
    expect(await pager.isNextDisabled()).toBe(true);
  });

  it('names the whole window when a page is out of reach', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    await expect(pager.goToPage(15)).rejects.toThrow(/page 15 is not on the strip/);
    await expect(pager.goToPage(15)).rejects.toThrow(/offers 1 … 8 9 10 11 12 … 20/);
    expect(fixture.componentInstance.page()).toBe(10);
  });
});

describe('WrPaginationHarness — two pagers on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by the landmark name', async () => {
    const orders = await loader.getHarness(WrPaginationHarness.with({ label: 'Orders' }));
    const products = await loader.getHarness(WrPaginationHarness.with({ label: /^Prod/ }));

    expect(await orders.getTotalPages()).toBe(10);
    expect(await products.getTotalPages()).toBe(3);
  });

  it('reads and drives only its own strip', async () => {
    const [products, orders] = await loader.getAllHarnesses(WrPaginationHarness);

    expect(await products.getStrip()).toEqual([1, 2, 3]);

    await orders.goToPage(4);

    expect([fixture.componentInstance.products(), fixture.componentInstance.orders()]).toEqual([1, 4]);
    expect(await products.getCurrentPage()).toBe(1);
    expect(await orders.getCurrentPage()).toBe(4);
  });
});

describe('WrPaginationHarness — localized', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LocalizedHost>>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    fixture = TestBed.createComponent(LocalizedHost);
    fixture.detectChanges();
    // The static loader resolves through a promise even for a catalog already in
    // memory.
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds the step controls whatever language they speak', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    // Located by their position around the strip, because `prevLabel` / `nextLabel`
    // fall back to the catalog: matching "prev" in an aria-label works until the
    // first locale ships.
    expect(await pager.getLabel()).toBe('Пагинация');

    await pager.next();
    expect(await pager.getCurrentPage()).toBe(2);

    await pager.previous();
    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('reads the localized total and picks a localized size', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    expect(await pager.getTotalText()).toBe('1–10 из 95');

    // The option reads "20 / стр." here — the digits are the only part of that
    // label a harness can match on.
    await pager.setPageSize(20);

    expect(fixture.componentInstance.pageSize()).toBe(20);
    expect(await pager.getPageSize()).toBe(20);
  });
});

describe('WrPaginationHarness — a catalog that drops the size placeholder', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LocalizedHost>>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        // A translation of `pagination.perPage` without its `{{size}}` — every
        // option then reads the same, and the page size leaves the screen entirely.
        provideWrI18nStaticLoader({ en: { pagination: { perPage: 'per page' } } }),
      ],
    });
    // The catalog has to be in place BEFORE the pager renders. `wr-select` resolves
    // its trigger label once, from the option text that exists at the time, so a
    // catalog landing later leaves the trigger reading the fallback while the panel
    // reads the translation — measured here, and the reason this block pre-warms
    // instead of flushing after the fact.
    const i18n = TestBed.inject(WrI18n);
    i18n.t('pagination.perPage');
    await new Promise<void>(resolve => setTimeout(resolve));
    expect(i18n.t('pagination.perPage')).toBe('per page');

    fixture = TestBed.createComponent(LocalizedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('blames the copy rather than reporting a nonsense size', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);

    await expect(pager.getPageSize()).rejects.toThrow(/reads "per page", which names no number/);
    await expect(pager.setPageSize(20)).rejects.toThrow(/no option offers 20/);
  });
});

describe('WrPaginationHarness — under an app-wide button size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), provideWrConfig({ button: { size: 'lg' } })] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reports the size the strip actually renders at', async () => {
    const pager = await loader.getHarness(WrPaginationHarness);
    const classes = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-pagination__page')].map(
      cell => cell.className
    );

    // A configured `button.size` cannot reach a cell: the pager passes its own
    // size down explicitly, so the bound value wins over the config every time.
    expect(await pager.getSize()).toBe('sm');
    expect(classes.every(name => name.includes('wr-btn--sm'))).toBe(true);
    expect(classes.some(name => name.includes('wr-btn--lg'))).toBe(false);
  });
});
