import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrPagination } from './pagination';

@Component({
  imports: [WrPagination],
  template: `
    <wr-pagination
      [(currentPage)]="page"
      [(pageSize)]="pageSize"
      [total]="total()"
      [disabled]="disabled()"
      [showSizeChanger]="showSizeChanger()"
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

  it('never falls below the first page, even with nothing to show', () => {
    fixture.componentInstance.page.set(5);
    fixture.componentInstance.total.set(0);
    fixture.detectChanges();

    expect(page()).toBe(1);
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
    // into gibberish. `:first-child` / `:last-child` would move with the
    // `showTotal` and ellipsis branches, which is why it is a class.
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
