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
    />
  `,
})
class Host {
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(95);
  readonly disabled = signal(false);
  readonly showSizeChanger = signal(false);
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

  it('shows a size changer only when asked', () => {
    expect(root().querySelector('wr-select')).toBeNull();

    fixture.componentInstance.showSizeChanger.set(true);
    fixture.detectChanges();

    expect(root().querySelector('wr-select')).not.toBeNull();
  });
});
