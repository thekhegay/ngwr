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

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" freeText ariaLabel="City" [(value)]="city">
      <wr-option value="paris">Paris</wr-option>
      <wr-option value="berlin">Berlin</wr-option>
    </wr-select>
  `,
})
class FreeTextHost {
  readonly city = signal<unknown>(null);
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

describe('WrSelect with freeText after a press in the panel', () => {
  let fixture: ComponentFixture<FreeTextHost>;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const paris = (): HTMLElement =>
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(o => o.textContent.trim() === 'Paris')!;
  const type = (value: string): void => {
    const input = field();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  const blur = (): void => {
    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const mount = (): void => {
    fixture = TestBed.createComponent(FreeTextHost);
    fixture.detectChanges();
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('commits the typed text on blur after a touch scroll cancelled the press', () => {
    mount();
    type('par');

    // A touch that turns into a scroll ends with `pointercancel` and no `pointerup`.
    paris().dispatchEvent(new Event('pointerdown', { bubbles: true }));
    window.dispatchEvent(new Event('pointercancel'));
    blur();

    expect(fixture.componentInstance.city()).toBe('par');
  });

  it('commits the typed text on blur after the press lifted', () => {
    mount();
    type('par');

    paris().dispatchEvent(new Event('pointerdown', { bubbles: true }));
    window.dispatchEvent(new Event('pointerup'));
    blur();

    expect(fixture.componentInstance.city()).toBe('par');
  });

  it('stops listening for the end of a press once the press ended', () => {
    mount();
    type('par');
    const added: string[] = [];
    const removed: string[] = [];
    const add = window.addEventListener.bind(window);
    window.addEventListener = ((name: string, fn: EventListener, options?: AddEventListenerOptions) => {
      added.push(name);
      options?.signal?.addEventListener('abort', () => removed.push(name));
      add(name, fn, options);
    }) as typeof window.addEventListener;

    try {
      paris().dispatchEvent(new Event('pointerdown', { bubbles: true }));
      window.dispatchEvent(new Event('pointercancel'));
    } finally {
      window.addEventListener = add;
    }

    expect(added.sort()).toEqual(['pointercancel', 'pointerup']);
    expect(removed.sort()).toEqual(['pointercancel', 'pointerup']);
  });

  it('stops listening when the select is destroyed mid-press', () => {
    mount();
    type('par');
    const signals: AbortSignal[] = [];
    const add = window.addEventListener.bind(window);
    window.addEventListener = ((name: string, fn: EventListener, options?: AddEventListenerOptions) => {
      if (options?.signal) signals.push(options.signal);
      add(name, fn, options);
    }) as typeof window.addEventListener;

    try {
      paris().dispatchEvent(new Event('pointerdown', { bubbles: true }));
    } finally {
      window.addEventListener = add;
    }
    fixture.destroy();

    expect(signals).toHaveLength(2);
    expect(signals.every(s => s.aborted)).toBe(true);
  });
});
