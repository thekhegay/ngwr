import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';

/** A client-side filter over projected options. */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" ariaLabel="City" [resultsText]="resultsText()" [(value)]="city">
      @for (name of cities; track name) {
        <wr-option [value]="name">{{ name }}</wr-option>
      }
    </wr-select>
    <wr-select ariaLabel="Plain">
      <wr-option value="a">A</wr-option>
    </wr-select>
  `,
})
class FilterHost {
  readonly cities = ['Berlin', 'Bern', 'Bergen', 'Bonn', 'Oslo'];
  readonly city = signal<string | null>(null);
  readonly resultsText = signal<string | null>(null);
}

/** A loader the spec settles by hand. */
@Component({
  imports: [WrSelect],
  template: `<wr-select mode="search" ariaLabel="City" [debounceMs]="100" [loader]="load" />`,
})
class LoaderHost {
  readonly calls: string[] = [];
  settle: { resolve: (items: readonly string[]) => void; reject: (error: Error) => void } | null = null;
  readonly load = (query: string): Promise<readonly string[]> => {
    this.calls.push(query);
    return new Promise((resolve, reject) => (this.settle = { resolve, reject }));
  };
}

/** Options from a store: the host raises `[loading]` itself. */
@Component({
  imports: [WrSelect],
  template: `<wr-select mode="search" serverSearch ariaLabel="City" [options]="options()" [loading]="loading()" />`,
})
class StoreHost {
  readonly options = signal<readonly string[]>(['Berlin', 'Bern']);
  readonly loading = signal(false);
}

/**
 * The loading, "no results" and error rows are text inside a listbox, and the
 * number of matches is nowhere at all: someone typing into a search select with
 * a screen reader heard nothing until they walked the options. One polite live
 * region beside the field says it, and only once the typing has settled.
 *
 * Every timer is faked, `requestAnimationFrame` with them, and the passes are
 * driven by hand: `whenStable()` deadlocks under fake timers.
 */
describe('WrSelect search status', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<unknown>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const status = (): HTMLElement => root().querySelector<HTMLElement>('.wr-select__status')!;
  const said = (): string => status().textContent.trim();

  const pass = (ms = 0): void => {
    fixture.detectChanges();
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };
  /** Lets a settled promise reach the component, then renders. */
  const flush = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  };
  const open = (): void => {
    field().click();
    field().dispatchEvent(new FocusEvent('focus'));
    pass();
  };
  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    pass();
  };
  const mount = <T>(host: new () => T): T => {
    TestBed.resetTestingModule();
    const created = TestBed.createComponent(host);
    fixture = created;
    fixture.detectChanges();
    return created.componentInstance;
  };

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
  });
  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  describe('the region', () => {
    it('is one polite status beside the field, there before anything is said', () => {
      mount(FilterHost);

      expect(root().querySelectorAll('wr-select')[0].querySelectorAll('[aria-live]')).toHaveLength(1);
      expect(status().getAttribute('role')).toBe('status');
      expect(status().getAttribute('aria-live')).toBe('polite');
      expect(said()).toBe('');
    });

    it('stays out of the listbox, which may own only options', () => {
      mount(FilterHost);
      open();

      expect(document.querySelector('.wr-select-panel [aria-live]')).toBeNull();
      // In the trigger, which stays the host's only element: the width floor rests on that.
      expect(status().parentElement!.classList.contains('wr-select__trigger')).toBe(true);
    });

    it('is drawn by a searchable multi too, inside its trigger', () => {
      TestBed.resetTestingModule();
      @Component({
        imports: [WrSelect, WrOption],
        template: `<wr-select mode="multi" searchable ariaLabel="Cities"
          ><wr-option value="a">A</wr-option></wr-select
        >`,
      })
      class MultiHost {}
      fixture = TestBed.createComponent(MultiHost);
      fixture.detectChanges();

      expect(root().querySelectorAll('[aria-live]')).toHaveLength(1);
      expect(status().parentElement!.classList.contains('wr-select__trigger')).toBe(true);
    });

    it('is not rendered by a select with no search', () => {
      mount(FilterHost);

      expect(root().querySelectorAll('wr-select')[1].querySelector('.wr-select__status')).toBeNull();
    });
  });

  describe('a client-side filter', () => {
    it('says nothing when the panel opens on its full list', () => {
      mount(FilterHost);
      open();
      pass(2000);

      expect(said()).toBe('');
    });

    it('says the count once the typing has settled, not on every keystroke', () => {
      mount(FilterHost);
      open();

      type('b');
      pass(300);
      expect(said()).toBe('');
      type('be');
      pass(300);
      expect(said()).toBe('');
      type('berl');
      pass(499);
      expect(said()).toBe('');

      pass(1);
      expect(said()).toBe('Results available: 1');
    });

    it('says nothing more while the count stays where it was', () => {
      mount(FilterHost);
      open();
      type('ber');
      pass(500);
      const node = status().firstChild;

      type('be');
      pass(2000);

      expect(said()).toBe('Results available: 3');
      // The same text node, never rewritten: a rewrite is what a screen reader reads.
      expect(status().firstChild).toBe(node);
    });

    it('says a count that changed', () => {
      mount(FilterHost);
      open();
      type('ber');
      pass(500);

      type('berl');
      pass(500);

      expect(said()).toBe('Results available: 1');
    });

    it('says there are no results', () => {
      mount(FilterHost);
      open();

      type('zzz');
      pass(500);

      expect(said()).toBe('No results');
    });

    it('says the full count when the query is cleared after a narrower one', () => {
      mount(FilterHost);
      open();
      type('zzz');
      pass(500);

      type('');
      pass(500);

      expect(said()).toBe('Results available: 5');
    });

    it('goes quiet when the panel closes, and starts over on the next one', () => {
      mount(FilterHost);
      open();
      type('ber');
      pass(500);
      expect(said()).toBe('Results available: 3');

      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      field().dispatchEvent(new FocusEvent('blur'));
      pass(2000);
      expect(said()).toBe('');
    });

    it('drops a pending announcement when the panel closes first', () => {
      mount(FilterHost);
      open();
      type('ber');
      pass(200);

      field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      pass(2000);

      expect(said()).toBe('');
    });

    it('takes the sentence from resultsText, with the count in its placeholder', () => {
      mount(FilterHost).resultsText.set('{{count}} cities');
      open();

      type('ber');
      pass(500);

      expect(said()).toBe('3 cities');
    });
  });

  describe('an async loader', () => {
    it('says loading once a load has run long enough to be worth saying', () => {
      mount(LoaderHost);
      open();

      type('ber');
      pass(100);
      expect(document.querySelector('.wr-select-panel__loading')).not.toBeNull();
      pass(499);
      expect(said()).toBe('');

      pass(1);
      expect(said()).toBe('Loading…');
    });

    it('says the count when the load answers', async () => {
      const host = mount(LoaderHost);
      open();
      type('ber');
      pass(100);
      pass(500);

      host.settle!.resolve(['Berlin', 'Bern', 'Bergen']);
      await flush();
      expect(said()).toBe('Loading…');

      pass(500);
      expect(said()).toBe('Results available: 3');
    });

    it('skips loading for a load that answers before the wait is over', async () => {
      const host = mount(LoaderHost);
      const heard: string[] = [];
      const observer = new MutationObserver(() => heard.push(said()));
      observer.observe(status(), { childList: true, characterData: true, subtree: true });
      open();
      type('ber');
      pass(100);
      pass(200);

      host.settle!.resolve(['Berlin', 'Bern']);
      await flush();
      pass(500);
      await flush();
      observer.disconnect();

      expect(heard).toEqual(['Results available: 2']);
    });

    it('queues nothing for a fast typist: one announcement for the last query', async () => {
      const host = mount(LoaderHost);
      const heard: string[] = [];
      const observer = new MutationObserver(() => heard.push(said()));
      observer.observe(status(), { childList: true, characterData: true, subtree: true });
      open();

      for (const text of ['b', 'be', 'ber', 'berl']) {
        type(text);
        pass(60);
      }
      pass(100);
      expect(host.calls).toEqual(['berl']);
      host.settle!.resolve(['Berlin']);
      await flush();
      pass(500);
      await flush();
      observer.disconnect();

      expect(heard).toEqual(['Results available: 1']);
    });

    it('says no results when the load answers with none', async () => {
      const host = mount(LoaderHost);
      open();
      type('zzz');
      pass(100);

      host.settle!.resolve([]);
      await flush();
      pass(500);

      expect(said()).toBe('No results');
    });

    it('says a load failed', async () => {
      const host = mount(LoaderHost);
      open();
      type('ber');
      pass(100);

      host.settle!.reject(new Error('offline'));
      await flush();
      pass(500);

      expect(said()).toBe('Could not load results');
    });
  });

  describe('a store behind [loading]', () => {
    it('says loading, then the count the store answers with', () => {
      const host = mount(StoreHost);
      open();
      type('ber');

      host.loading.set(true);
      pass(500);
      expect(said()).toBe('Loading…');

      host.options.set(['Berlin', 'Bern', 'Bergen']);
      host.loading.set(false);
      pass(500);
      expect(said()).toBe('Results available: 3');
    });
  });

  it('takes its sentences from the catalog', async () => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    fixture = TestBed.createComponent(FilterHost);
    fixture.detectChanges();
    await fixture.whenStable();
    vi.useFakeTimers();
    open();

    type('ber');
    pass(500);

    expect(said()).toBe('Найдено результатов: 3');
  });
});
