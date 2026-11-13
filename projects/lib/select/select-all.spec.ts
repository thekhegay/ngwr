import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrSelectHarness } from 'ngwr/select/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';
import type { WrSelectMode } from './types';

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select
      ariaLabel="Fruit"
      selectAll
      [mode]="mode()"
      [searchable]="searchable()"
      [maxItems]="maxItems()"
      [selectAllLabel]="label()"
      [readonly]="readonly()"
      [(value)]="picked"
      (touch)="touched.set(touched() + 1)"
    >
      <wr-option value="apple">Apple</wr-option>
      <wr-option value="apricot">Apricot</wr-option>
      <wr-option value="banana" [disabled]="true">Banana</wr-option>
      <wr-option value="cherry">Cherry</wr-option>
    </wr-select>
  `,
})
class Host {
  readonly mode = signal<WrSelectMode>('multi');
  readonly searchable = signal(false);
  readonly maxItems = signal(0);
  readonly label = signal<string | null>(null);
  readonly readonly = signal(false);
  readonly picked = signal<unknown>([]);
  readonly touched = signal(0);
}

@Component({
  imports: [WrSelect],
  template: `
    <wr-select
      ariaLabel="Numbers"
      mode="multi"
      selectAll
      searchable
      virtualScroll
      [options]="options()"
      [maxItems]="maxItems()"
      [(value)]="picked"
    />
  `,
})
class VirtualHost {
  readonly options = signal<readonly string[]>(Array.from({ length: 500 }, (_, i) => `Item ${i + 1}`));
  readonly maxItems = signal(0);
  readonly picked = signal<readonly string[]>([]);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select ariaLabel="Empty" mode="multi" selectAll [options]="[]" [(value)]="picked" />`,
})
class EmptyHost {
  readonly picked = signal<readonly string[]>([]);
}

/**
 * `selectAll` on a multi `<wr-select>`. The panel is a CDK overlay, so the row is
 * queried off the document; `aria-checked` and the `--checked` / `--mixed`
 * classes are what a consumer reads, so they are what the assertions read.
 */
describe('WrSelect selectAll', () => {
  let fixture: ComponentFixture<unknown>;

  const row = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-panel__select-all');
  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!;
  const optionRows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-select-panel .wr-option')];

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function mount<T>(type: new () => T, setup: (host: T) => void = () => undefined): Promise<T> {
    const created = TestBed.createComponent(type);
    fixture = created;
    setup(created.componentInstance);
    await settle();
    return created.componentInstance;
  }

  /** A button trigger opens on a click; a searchable multi's field opens when focus arrives. */
  async function open(): Promise<void> {
    if (trigger() instanceof HTMLInputElement) trigger().focus();
    else trigger().click();
    await settle();
  }

  async function key(name: string): Promise<void> {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    await settle();
  }

  async function search(query: string): Promise<void> {
    const input = trigger() as HTMLInputElement;
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  afterEach(() => fixture.destroy());

  describe('the row', () => {
    it('is the first row of the panel: an option the listbox owns, and not one of the options', async () => {
      await mount(Host);
      await open();

      const panel = document.querySelector<HTMLElement>('.wr-select-panel')!;
      expect(panel.firstElementChild).toBe(row());
      expect(row()!.getAttribute('role')).toBe('option');
      expect(row()!.textContent?.trim()).toBe('Select all');
      expect(row()!.classList.contains('wr-option')).toBe(false);
      expect(optionRows()).toHaveLength(4);
    });

    it('takes its label from the input, and from the catalog', async () => {
      const host = await mount(Host, h => h.label.set('Everything'));
      await open();
      expect(row()!.textContent?.trim()).toBe('Everything');

      host.label.set(null);
      await settle();
      expect(row()!.textContent?.trim()).toBe('Select all');
    });

    it('reads the active catalog', async () => {
      TestBed.configureTestingModule({
        providers: [
          provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
          provideWrI18nStaticLoader({ ru: wrRu }),
        ],
      });
      await mount(Host);
      await open();

      expect(row()!.textContent?.trim()).toBe('Выбрать все');
    });

    it('is not drawn in single mode', async () => {
      await mount(Host, h => h.mode.set('single'));
      await open();

      expect(optionRows()).toHaveLength(4);
      expect(row()).toBeNull();
    });

    it('is not drawn when there are no options', async () => {
      await mount(EmptyHost);
      await open();

      expect(document.querySelector('.wr-select-panel')).not.toBeNull();
      expect(row()).toBeNull();
    });

    it('is not drawn without the input', async () => {
      @Component({
        imports: [WrSelect, WrOption],
        template: `<wr-select mode="multi" ariaLabel="Plain"><wr-option value="a">A</wr-option></wr-select>`,
      })
      class PlainHost {}
      await mount(PlainHost);
      await open();

      expect(optionRows()).toHaveLength(1);
      expect(row()).toBeNull();
    });
  });

  describe('toggling', () => {
    it('selects every enabled option, in display order, and leaves a disabled one out', async () => {
      const host = await mount(Host);
      await open();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['apple', 'apricot', 'cherry']);
      expect(host.touched()).toBe(1);
      // The panel stays open, as it does after any multi pick.
      expect(row()).not.toBeNull();
    });

    it('clears them again on the next press', async () => {
      const host = await mount(Host);
      await open();
      row()!.click();
      await settle();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual([]);
    });

    it('completes a partial selection rather than clearing it, keeping what was picked first', async () => {
      const host = await mount(Host, h => h.picked.set(['cherry']));
      await open();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['cherry', 'apple', 'apricot']);
    });

    it('says checked, mixed and unchecked through aria-checked and its modifiers', async () => {
      const host = await mount(Host);
      await open();
      expect(row()!.getAttribute('aria-checked')).toBe('false');
      expect(row()!.classList).not.toContain('wr-select-panel__select-all--checked');
      expect(row()!.classList).not.toContain('wr-select-panel__select-all--mixed');

      host.picked.set(['apricot']);
      await settle();
      expect(row()!.getAttribute('aria-checked')).toBe('mixed');
      expect(row()!.classList).toContain('wr-select-panel__select-all--mixed');

      host.picked.set(['apple', 'apricot', 'cherry']);
      await settle();
      expect(row()!.getAttribute('aria-checked')).toBe('true');
      expect(row()!.classList).toContain('wr-select-panel__select-all--checked');
      // `aria-selected` is the options' state; this row has the one that can say "mixed".
      expect(row()!.hasAttribute('aria-selected')).toBe(false);
    });

    it('writes nothing while read-only', async () => {
      const host = await mount(Host);
      await open();
      host.readonly.set(true);
      await settle();

      row()?.click();
      await settle();

      expect(host.picked()).toEqual([]);
    });
  });

  describe('with a search', () => {
    it('selects only what the query matches and keeps the rest of the selection', async () => {
      const host = await mount(Host, h => {
        h.searchable.set(true);
        h.picked.set(['cherry']);
      });
      await open();
      await search('ap');

      expect(row()!.getAttribute('aria-checked')).toBe('false');
      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['cherry', 'apple', 'apricot']);
      expect(row()!.getAttribute('aria-checked')).toBe('true');
    });

    it('clears only what the query matches', async () => {
      const host = await mount(Host, h => {
        h.searchable.set(true);
        h.picked.set(['apple', 'apricot', 'cherry']);
      });
      await open();
      await search('ap');

      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['cherry']);
    });

    it('goes away when the query matches nothing', async () => {
      await mount(Host, h => h.searchable.set(true));
      await open();
      await search('zzz');

      expect(row()).toBeNull();
    });
  });

  describe('maxItems', () => {
    it('selects up to the cap, in display order, and reads mixed', async () => {
      const host = await mount(Host, h => h.maxItems.set(2));
      await open();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['apple', 'apricot']);
      expect(row()!.getAttribute('aria-checked')).toBe('mixed');
    });

    it('counts what is already selected against the cap', async () => {
      const host = await mount(Host, h => {
        h.maxItems.set(2);
        h.picked.set(['cherry']);
      });
      await open();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['cherry', 'apple']);
    });

    it('clears once the cap leaves nothing to add', async () => {
      const host = await mount(Host, h => h.maxItems.set(2));
      await open();
      row()!.click();
      await settle();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual([]);
    });

    it('is unavailable while the cap is full of options the search is hiding', async () => {
      const host = await mount(Host, h => {
        h.searchable.set(true);
        h.maxItems.set(1);
        h.picked.set(['cherry']);
      });
      await open();
      await search('ap');

      expect(row()!.getAttribute('aria-disabled')).toBe('true');
      expect(row()!.classList).toContain('wr-select-panel__select-all--disabled');

      row()!.click();
      await settle();
      expect(host.picked()).toEqual(['cherry']);
    });
  });

  describe('keyboard', () => {
    it('is reached by ArrowUp from the first option, and named by aria-activedescendant', async () => {
      await mount(Host);
      trigger().focus();
      await key('ArrowDown');
      expect(trigger().getAttribute('aria-activedescendant')).toBe(optionRows()[0].id);

      await key('ArrowUp');

      expect(trigger().getAttribute('aria-activedescendant')).toBe(row()!.id);
      expect(row()!.classList).toContain('wr-select-panel__select-all--active');
    });

    it('toggles on Enter and on Space', async () => {
      const host = await mount(Host);
      await key('ArrowDown');
      await key('ArrowUp');

      await key('Enter');
      expect(host.picked()).toEqual(['apple', 'apricot', 'cherry']);

      await key(' ');
      expect(host.picked()).toEqual([]);
    });

    it('sits between the last option and the first as the arrows wrap', async () => {
      await mount(Host);
      await key('ArrowDown');
      await key('End');
      expect(trigger().getAttribute('aria-activedescendant')).toBe(optionRows()[3].id);

      await key('ArrowDown');
      expect(trigger().getAttribute('aria-activedescendant')).toBe(row()!.id);

      await key('ArrowDown');
      expect(trigger().getAttribute('aria-activedescendant')).toBe(optionRows()[0].id);

      await key('ArrowUp');
      await key('ArrowUp');
      // Banana is disabled, so the last stop is Cherry.
      expect(trigger().getAttribute('aria-activedescendant')).toBe(optionRows()[3].id);
    });

    it('is where Home lands', async () => {
      await mount(Host);
      await key('ArrowDown');
      await key('End');

      await key('Home');

      expect(trigger().getAttribute('aria-activedescendant')).toBe(row()!.id);
    });

    it('is the first stop for ArrowDown in a panel opened by the pointer', async () => {
      await mount(Host);
      await open();

      await key('ArrowDown');

      expect(trigger().getAttribute('aria-activedescendant')).toBe(row()!.id);
    });
  });

  describe('with a virtual list', () => {
    let realScrollTo: PropertyDescriptor | undefined;

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

    it('selects the whole data array, not the rendered window', async () => {
      const host = await mount(VirtualHost);
      await open();

      expect(optionRows().length).toBeLessThan(500);
      row()!.click();
      await settle();

      expect(host.picked()).toHaveLength(500);
      expect(host.picked()[499]).toBe('Item 500');
      expect(row()!.getAttribute('aria-checked')).toBe('true');
    });

    it('works on the filtered data under a search', async () => {
      const host = await mount(VirtualHost);
      await open();
      await search('Item 49');

      row()!.click();
      await settle();

      // Item 49, and 490 to 499.
      expect(host.picked()).toHaveLength(11);
      expect(host.picked()[0]).toBe('Item 49');
    });

    it('stops at maxItems, in data order', async () => {
      const host = await mount(VirtualHost, h => h.maxItems.set(3));
      await open();

      row()!.click();
      await settle();

      expect(host.picked()).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('stays outside the scrolling list, so it never scrolls away', async () => {
      await mount(VirtualHost);
      await open();

      expect(row()!.closest('.wr-select-panel__vlist')).toBeNull();
      expect(row()!.nextElementSibling?.classList).toContain('wr-select-panel__vlist');
    });

    it('is reached from the keyboard', async () => {
      const host = await mount(VirtualHost);
      await open();
      await key('Home');
      expect(trigger().getAttribute('aria-activedescendant')).toBe(row()!.id);

      await key('Enter');
      expect(host.picked()).toHaveLength(500);
    });
  });

  describe('through the harness', () => {
    it('toggles and reads the row', async () => {
      const host = await mount(Host);
      const select = await TestbedHarnessEnvironment.loader(fixture as ComponentFixture<Host>).getHarness(
        WrSelectHarness
      );

      await select.toggleSelectAll();
      expect(host.picked()).toEqual(['apple', 'apricot', 'cherry']);
      expect(await select.isAllSelected()).toBe(true);
      expect(await select.getSelectAllState()).toBe('checked');
      // The row is not one of the options.
      expect(await select.getOptionLabels()).toEqual(['Apple', 'Apricot', 'Banana', 'Cherry']);

      host.picked.set(['apple']);
      expect(await select.isAllSelected()).toBe(false);
      expect(await select.getSelectAllState()).toBe('mixed');

      await select.toggleSelectAll();
      await select.toggleSelectAll();
      expect(await select.getSelectAllState()).toBe('unchecked');
    });

    it('throws, with the reasons, where there is no row', async () => {
      await mount(Host, h => h.mode.set('single'));
      const select = await TestbedHarnessEnvironment.loader(fixture as ComponentFixture<Host>).getHarness(
        WrSelectHarness
      );
      await select.open();

      expect(await select.hasSelectAll()).toBe(false);
      await expect(select.toggleSelectAll()).rejects.toThrow(/no select-all row/);
      await expect(select.isAllSelected()).rejects.toThrow(/no select-all row/);
    });
  });
});
