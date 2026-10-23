import type { Type } from '@angular/core';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTableFilter } from './table-filter';
import type { WrTableFilterItem } from './types';

@Component({
  imports: [WrTableFilter],
  template: `<wr-table-filter [items]="items()" column="Role" (selectionChange)="emitted.set($event)" />`,
})
class Host {
  readonly items = signal<readonly WrTableFilterItem[]>([
    { value: 'admin', title: 'Admin', selected: false },
    { value: 'user', title: 'User', selected: false },
  ]);
  readonly emitted = signal<readonly WrTableFilterItem[] | null>(null);
}

@Component({
  imports: [WrTableFilter],
  template: `<wr-table-filter [items]="items()" searchLabel="Find a role" resetLabel="Start over" />`,
})
class LabelledHost {
  readonly items = signal<readonly WrTableFilterItem[]>([{ value: 'admin', title: 'Admin', selected: true }]);
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

  it('puts the count it shows into its name (WCAG 2.5.3)', () => {
    expect(trigger().getAttribute('aria-label')).toBe('Filter Role');

    open();
    options()[0].click();
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('1');
    expect(trigger().getAttribute('aria-label')).toBe('Filter Role, 1');
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

  it('says which options are on, not only with the check it paints', () => {
    open();
    expect(options().map(o => o.getAttribute('aria-pressed'))).toEqual(['false', 'false']);

    options()[0].click();
    fixture.detectChanges();

    expect(options().map(o => o.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  /**
   * jsdom runs no input method: the events below are hand-built with the flags a
   * real one sets, and the assertion is that the panel survived. A faithful test
   * of the guard and no more — nothing here exercises kotoeri or Pinyin.
   *
   * The panel closes on Escape from CDK's overlay keyboard dispatcher, a single
   * listener on `<body>`, so the guard has to STOP the event at the search field
   * rather than merely decline to act on it. Both halves are asserted: the key is
   * swallowed while a conversion is open, and it still closes the panel when one
   * is not.
   */
  describe('IME composition in the search box', () => {
    const search = (): HTMLInputElement => document.querySelector<HTMLInputElement>('.wr-table-filter__search')!;
    const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-table-filter__panel');

    const escape = (init: KeyboardEventInit): void => {
      search().focus();
      search().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init }));
      fixture.detectChanges();
    };

    it('keeps the panel open on the Escape that cancels a conversion', () => {
      open();
      expect(panel()).not.toBeNull();
      escape({ isComposing: true });
      expect(panel(), 'the user cancelled a reading and lost the whole filter').not.toBeNull();
    });

    it("recognises Safari's committing keystroke, which carries only keyCode 229", () => {
      open();
      escape({ keyCode: 229 });
      expect(panel()).not.toBeNull();
    });

    it('still closes on a plain Escape', () => {
      open();
      escape({});
      expect(panel(), 'the guard swallowed an ordinary Escape').toBeNull();
    });
  });
});

/**
 * Two strings in this panel were English literals while their two neighbours in
 * the same template already resolved through the catalog. The search box is the
 * worse of the pair: it has no visible label and no `id`, so its placeholder was
 * also its only accessible name — an unnamed control in every other language,
 * not just an untranslated one. Neither a11y gate can see it, since the panel
 * does not exist until the trigger is clicked.
 */
describe('WrTableFilter panel copy', () => {
  afterEach(() => TestBed.resetTestingModule());

  const openPanel = <T>(component: Type<T>): void => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-table-filter__trigger')!.click();
    fixture.detectChanges();
  };

  const search = (): HTMLInputElement => document.querySelector<HTMLInputElement>('.wr-table-filter__search')!;
  const reset = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-table-filter__reset');

  it('names the search box, and names it with the placeholder it shows', () => {
    openPanel(Host);

    expect(search().getAttribute('aria-label')).toBe('Search');
    expect(search().placeholder).toBe('Search');
  });

  it('comes from the catalog, not from the template', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items().forEach(i => (i.selected = true));
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-table-filter__trigger')!.click();
    fixture.detectChanges();

    const cyrillic = /\p{Script=Cyrillic}/u;
    expect(cyrillic.test(search().placeholder), `"${search().placeholder}" is still English`).toBe(true);
    expect(cyrillic.test(search().getAttribute('aria-label') ?? '')).toBe(true);
    const label = reset()?.textContent?.trim() ?? '';
    expect(cyrillic.test(label), `"${label}" is still English`).toBe(true);
  });

  it('lets a binding win over both', () => {
    openPanel(LabelledHost);

    expect(search().placeholder).toBe('Find a role');
    expect(reset()?.textContent?.trim()).toBe('Start over');
  });
});

/**
 * Two filters over ONE array — the same column definition handed to two tables.
 * The objects are the state, so the two have to agree: each one memoised its
 * count against its own version, and the one that was not clicked kept showing
 * no badge over a panel with a ticked box.
 */
describe('WrTableFilter sharing its items with another filter', () => {
  @Component({
    imports: [WrTableFilter],
    template: `
      <wr-table-filter class="a" [items]="items" column="Role" />
      <wr-table-filter class="b" [items]="items" column="Role" />
    `,
  })
  class SharedHost {
    readonly items: readonly WrTableFilterItem[] = [
      { value: 'admin', title: 'Admin' },
      { value: 'user', title: 'User' },
    ];
  }

  afterEach(() => TestBed.resetTestingModule());

  it('counts a box ticked in the other one', async () => {
    const fixture = TestBed.createComponent(SharedHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLElement>('.a .wr-table-filter__trigger')!.click();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('.wr-table-filter__item')!.click();
    await fixture.whenStable();

    expect(el.querySelector('.b .wr-table-filter__count')?.textContent?.trim()).toBe('1');
    expect(el.querySelector('.b .wr-table-filter__trigger')?.getAttribute('aria-label')).toBe('Filter Role, 1');
    fixture.destroy();
  });
});
