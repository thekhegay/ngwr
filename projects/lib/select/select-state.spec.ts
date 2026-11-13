import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Letter" [(value)]="letter">
      <wr-option value="a">A</wr-option>
      <wr-option [value]="middle()" [disabled]="locked()">B</wr-option>
      <wr-option value="c">C</wr-option>
    </wr-select>
  `,
})
class ChangingOptionHost {
  readonly letter = signal<unknown>(null);
  readonly middle = signal('b');
  readonly locked = signal(true);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Letter" [(value)]="letter">
      @for (item of items(); track item) {
        <wr-option [value]="item">{{ item }}</wr-option>
      }
    </wr-select>
  `,
})
class GrowingListHost {
  readonly letter = signal<unknown>(null);
  readonly items = signal(['A', 'C']);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" ariaLabel="Word" [minChars]="1" [(value)]="word">
      @for (item of items(); track item) {
        <wr-option [value]="item">{{ item }}</wr-option>
      }
    </wr-select>
  `,
})
class GrowingSearchHost {
  readonly word = signal<unknown>(null);
  readonly items = signal(['Ab', 'Cb']);
}

/**
 * Projected options are detached while the panel is closed, so nothing can sort
 * them then: what changed in that time has to show in the cursor order on open.
 */
describe('WrSelect keyboard order after its options change while closed', () => {
  let fixture: ComponentFixture<unknown>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-select__trigger')!;
  const rows = (): string[] =>
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].map(r => r.textContent.trim());
  const activeLabel = (): string | null => {
    const id = trigger().getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
  };
  const press = (key: string): void => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('keeps an option in place when its disabled state flips', () => {
    const changing = TestBed.createComponent(ChangingOptionHost);
    fixture = changing;
    fixture.detectChanges();

    changing.componentInstance.locked.set(false);
    fixture.detectChanges();

    press('ArrowDown');
    expect(rows()).toEqual(['A', 'B', 'C']);
    expect(activeLabel()).toBe('A');

    press('ArrowDown');
    expect(activeLabel(), 'the re-enabled option moved to the end of the order').toBe('B');

    press('ArrowDown');
    expect(activeLabel()).toBe('C');

    press('Home');
    expect(activeLabel()).toBe('A');

    press('End');
    expect(activeLabel()).toBe('C');
  });

  it('keeps an option in place when its value changes', () => {
    const changing = TestBed.createComponent(ChangingOptionHost);
    fixture = changing;
    changing.componentInstance.locked.set(false);
    fixture.detectChanges();

    changing.componentInstance.middle.set('b2');
    fixture.detectChanges();

    press('ArrowDown');
    press('ArrowDown');
    expect(activeLabel()).toBe('B');

    press('End');
    expect(activeLabel()).toBe('C');

    press('ArrowUp');
    press('Enter');
    expect(changing.componentInstance.letter()).toBe('b2');
  });

  it('puts an option inserted in the middle where it renders', () => {
    const growing = TestBed.createComponent(GrowingListHost);
    fixture = growing;
    fixture.detectChanges();

    growing.componentInstance.items.set(['A', 'B', 'C']);
    fixture.detectChanges();

    press('ArrowDown');
    expect(rows()).toEqual(['A', 'B', 'C']);
    expect(activeLabel()).toBe('A');

    press('ArrowDown');
    expect(activeLabel()).toBe('B');

    press('End');
    expect(activeLabel()).toBe('C');
  });

  it('seeds the cursor on an option inserted first', () => {
    const growing = TestBed.createComponent(GrowingListHost);
    fixture = growing;
    fixture.detectChanges();

    growing.componentInstance.items.set(['0', 'A', 'C']);
    fixture.detectChanges();

    press('ArrowDown');
    expect(activeLabel()).toBe('0');
  });

  it('follows a list reordered while closed', () => {
    const growing = TestBed.createComponent(GrowingListHost);
    fixture = growing;
    fixture.detectChanges();

    growing.componentInstance.items.set(['C', 'A']);
    fixture.detectChanges();

    press('ArrowDown');
    expect(rows()).toEqual(['C', 'A']);
    expect(activeLabel()).toBe('C');

    press('End');
    expect(activeLabel()).toBe('A');
  });
});

describe('WrSelect opened by a query after its options change while closed', () => {
  let fixture: ComponentFixture<GrowingSearchHost>;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;

  afterEach(() => fixture.destroy());

  it('seeds the cursor on the first match as rendered', () => {
    fixture = TestBed.createComponent(GrowingSearchHost);
    fixture.detectChanges();
    fixture.componentInstance.items.set(['Bb', 'Ab', 'Cb']);
    fixture.detectChanges();
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(document.querySelector('.wr-select-panel'), 'below minChars nothing opens').toBeNull();

    field().value = 'b';
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const id = field().getAttribute('aria-activedescendant');
    expect(document.getElementById(id ?? '')?.textContent?.trim()).toBe('Bb');
  });
});
