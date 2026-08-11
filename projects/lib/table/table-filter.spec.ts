import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTableFilterItem } from './interfaces';
import { WrTableFilter } from './table-filter';

@Component({
  imports: [WrTableFilter],
  template: `<wr-table-filter [items]="items()" (selectionChange)="emitted.set($event)" />`,
})
class Host {
  readonly items = signal<readonly WrTableFilterItem[]>([
    { value: 'admin', title: 'Admin', selected: false },
    { value: 'user', title: 'User', selected: false },
  ]);
  readonly emitted = signal<readonly WrTableFilterItem[] | null>(null);
}

/**
 * The items belong to the CONSUMER — a column definition hands the same array back
 * on every render — and this component flips `selected` on those objects in place.
 * That is the documented contract, and it is also the trap: a property mutation is
 * invisible to every signal, so anything derived from it has to be told.
 */
describe('WrTableFilter', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-table-filter')!;
  const badge = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-table-filter__count');
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-table-filter__trigger')!;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-table-filter__item')];

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('starts with no count and no active state', () => {
    expect(badge()).toBeNull();
    expect(host().className).not.toContain('wr-table-filter--active');
  });

  it('counts the ticked boxes', () => {
    // `selectedCount` is a computed over an array whose REFERENCE never changes,
    // so without an explicit nudge it memoised zero: the badge never appeared and
    // the trigger never went active, however many boxes were ticked.
    open();
    options()[0].click();
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('1');
    expect(host().className).toContain('wr-table-filter--active');
  });

  it('counts back down, and drops the badge at zero', () => {
    open();
    options()[0].click();
    fixture.detectChanges();
    options()[1].click();
    fixture.detectChanges();
    expect(badge()?.textContent?.trim()).toBe('2');

    options()[0].click();
    fixture.detectChanges();
    expect(badge()?.textContent?.trim()).toBe('1');

    options()[1].click();
    fixture.detectChanges();
    expect(badge()).toBeNull();
    expect(host().className).not.toContain('wr-table-filter--active');
  });

  it('reports what is selected to the host', () => {
    open();
    options()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted()?.map(i => i.value)).toEqual(['user']);
  });

  it('clears everything on reset, badge included', () => {
    open();
    options()[0].click();
    fixture.detectChanges();

    document.querySelector<HTMLElement>('.wr-table-filter__reset')!.click();
    fixture.detectChanges();

    expect(badge()).toBeNull();
    expect(fixture.componentInstance.emitted()).toEqual([]);
  });
});
