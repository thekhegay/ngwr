import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { WrSelect } from './select';

const COUNT = 2000;

interface City {
  readonly id: number;
  readonly name: string;
}

const cities = (from = 0): City[] =>
  Array.from({ length: COUNT }, (_, i) => ({ id: from + i, name: `City ${from + i}` }));

@Component({
  imports: [WrSelect],
  template: `
    <wr-select
      mode="search"
      ariaLabel="City"
      virtualScroll
      [rowHeight]="20"
      [viewportHeight]="200"
      [overscan]="2"
      [options]="items"
      [displayWith]="name"
      [(value)]="city"
    />
  `,
})
class SearchHost {
  readonly items = cities();
  readonly city = signal<City | readonly City[] | null>(null);
  readonly name = vi.fn((city: City): string => city.name);
}

@Component({
  imports: [WrSelect],
  template: `
    <wr-select
      mode="search"
      ariaLabel="City"
      virtualScroll
      [rowHeight]="20"
      [viewportHeight]="200"
      [overscan]="2"
      [options]="items"
      [displayWith]="name"
      [valueWith]="id"
      [(value)]="city"
    />
  `,
})
class IdHost {
  readonly items = cities();
  readonly city = signal<number | readonly number[] | null>(null);
  readonly name = (city: City): string => city.name;
  readonly id = vi.fn((city: City): number => city.id);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select ariaLabel="City" [options]="items()" [displayWith]="name" [(value)]="city" />`,
})
class PlainHost {
  readonly items = signal<readonly City[]>(cities());
  readonly city = signal<City | readonly City[] | null>(null);
  readonly name = (city: City): string => city.name;
}

/**
 * The `[options]` rows register as the panel opens and unregister as it closes,
 * so the work per open has to grow with the list and not with its square.
 */
describe('WrSelect with thousands of options', () => {
  let fixture: ComponentFixture<unknown>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => host().querySelector<HTMLElement>('.wr-select__trigger')!;
  const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const press = (key: string): void => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('opening and closing', () => {
    // The keyboard order is the one list sorted by document position, so each
    // comparison is one step of a sort: a sort per option is COUNT² / 2 of them.
    let compared: MockInstance<Node['compareDocumentPosition']>;

    beforeEach(() => {
      fixture = TestBed.createComponent(PlainHost);
      fixture.detectChanges();
      compared = vi.spyOn(Node.prototype, 'compareDocumentPosition');
    });

    it('sorts the keyboard order a bounded number of times, not once per option', () => {
      trigger().click();
      fixture.detectChanges();
      expect(rows()).toHaveLength(COUNT);

      trigger().click();
      fixture.detectChanges();
      expect(rows()).toHaveLength(0);

      expect(compared.mock.calls.length).toBeLessThan(3 * COUNT);
    }, 120_000);

    it('stays bounded when the cursor is already set as the rows register', () => {
      press('ArrowDown');
      press('ArrowDown');
      press('Escape');
      expect(rows()).toHaveLength(0);
      compared.mockClear();

      trigger().click();
      fixture.detectChanges();
      expect(rows()).toHaveLength(COUNT);
      expect(document.getElementById(trigger().getAttribute('aria-activedescendant')!)?.textContent.trim()).toBe(
        'City 1'
      );

      press('End');
      expect(document.getElementById(trigger().getAttribute('aria-activedescendant')!)?.textContent.trim()).toBe(
        `City ${COUNT - 1}`
      );

      expect(compared.mock.calls.length).toBeLessThan(3 * COUNT);
    }, 120_000);

    it('keeps the keyboard order across a changed list', () => {
      const plain = fixture as ComponentFixture<PlainHost>;
      trigger().click();
      fixture.detectChanges();
      compared.mockClear();

      plain.componentInstance.items.set(cities().slice(1, COUNT - 1));
      fixture.detectChanges();
      press('ArrowDown');
      press('ArrowDown');

      expect(rows()).toHaveLength(COUNT - 2);
      expect(document.getElementById(trigger().getAttribute('aria-activedescendant')!)?.textContent.trim()).toBe(
        'City 2'
      );
      expect(compared.mock.calls.length).toBeLessThan(COUNT);
    }, 120_000);
  });

  describe('searching', () => {
    let realScrollTo: PropertyDescriptor | undefined;

    const field = (): HTMLInputElement => host().querySelector<HTMLInputElement>('.wr-select__search-input')!;
    const type = (text: string): void => {
      field().value = text;
      field().dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };

    // jsdom has no `Element.scrollTo`, which the virtual list calls on itself.
    beforeEach(() => {
      realScrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
      Object.defineProperty(Element.prototype, 'scrollTo', {
        value: (): void => undefined,
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      if (realScrollTo) Object.defineProperty(Element.prototype, 'scrollTo', realScrollTo);
      else delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
    });

    it('reads each label once for a whole query, not once per keystroke', () => {
      const search = TestBed.createComponent(SearchHost);
      fixture = search;
      fixture.detectChanges();
      field().dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();
      const name = search.componentInstance.name;
      name.mockClear();

      type('1');
      type('19');
      type('199');

      expect(rows().length).toBeGreaterThan(0);
      expect(rows().every(r => r.textContent.includes('199'))).toBe(true);
      expect(rows()[0].getAttribute('aria-setsize')).toBe('12');
      // The rows on screen are labelled by the same function on every pass.
      const drawn = name.mock.calls.length - COUNT;
      expect(drawn).toBeGreaterThanOrEqual(0);
      expect(drawn).toBeLessThan(COUNT / 10);
    });
  });

  describe('the virtual list', () => {
    let realScrollTo: PropertyDescriptor | undefined;
    let scrollListeners: MockInstance<HTMLElement['addEventListener']>;

    const field = (): HTMLInputElement => host().querySelector<HTMLInputElement>('.wr-select__search-input')!;
    const vlist = (): HTMLElement => document.querySelector<HTMLElement>('.wr-select-panel__vlist')!;
    const scrolls = (): number => scrollListeners.mock.calls.filter(([type]) => type === 'scroll').length;
    const frame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));

    beforeEach(() => {
      realScrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
      Object.defineProperty(Element.prototype, 'scrollTo', {
        value: (): void => undefined,
        configurable: true,
        writable: true,
      });
      fixture = TestBed.createComponent(IdHost);
      fixture.detectChanges();
      scrollListeners = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    });

    afterEach(() => {
      if (realScrollTo) Object.defineProperty(Element.prototype, 'scrollTo', realScrollTo);
      else delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
    });

    it('listens to one scroll per open, even when the panel reopens before the first attach', async () => {
      const open = (): void => {
        field().dispatchEvent(new FocusEvent('focus'));
        fixture.detectChanges();
      };
      open();
      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      open();
      await Promise.resolve();

      expect(vlist()).not.toBeNull();
      expect(scrolls()).toBe(1);
    });

    it('keeps the window for a scroll inside one row', async () => {
      const ids = (fixture as ComponentFixture<IdHost>).componentInstance.id;
      field().dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();
      expect(vlist()).not.toBeNull();
      await frame();
      fixture.detectChanges();
      ids.mockClear();

      vlist().scrollTop = 5;
      vlist().dispatchEvent(new Event('scroll'));
      await frame();
      fixture.detectChanges();
      expect(ids).not.toHaveBeenCalled();

      vlist().scrollTop = 45;
      vlist().dispatchEvent(new Event('scroll'));
      await frame();
      fixture.detectChanges();
      expect(ids).toHaveBeenCalled();
    });
  });

  describe('the selected label', () => {
    it('follows the options array when it is replaced', () => {
      const replaced = TestBed.createComponent(PlainHost);
      fixture = replaced;
      const next = cities(COUNT);
      replaced.componentInstance.city.set(next[7]);
      fixture.detectChanges();
      expect(trigger().textContent).not.toContain('City');

      replaced.componentInstance.items.set(next);
      fixture.detectChanges();
      expect(trigger().textContent).toContain(`City ${COUNT + 7}`);

      replaced.componentInstance.items.set(cities());
      fixture.detectChanges();
      expect(trigger().textContent).not.toContain('City');
    });
  });
});
