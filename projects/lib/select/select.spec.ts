import { Component, type EnvironmentProviders, type Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';

import { provideWrConfig } from 'ngwr/config';
import { WrFormField } from 'ngwr/form';
import { WrTPipe, provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSelectSize } from './interfaces';
import { WrOption } from './option';
import { WrOptionGroup } from './option-group';
import { WrSelect } from './select';

/**
 * The panel is a CDK overlay, so its options land in the overlay container
 * rather than in the fixture's own DOM — every query for an option has to go
 * through the document. That is also why this spec provides `provideWrOverlay`:
 * without it the container is CDK's shared root, which the next spec file would
 * then inherit along with anything left in it.
 */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select placeholder="Pick a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg" [disabled]="true">Large</wr-option>
    </wr-select>
  `,
})
class Host {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="multi" placeholder="Pick sizes" ariaLabel="Sizes" [(value)]="sizes">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg">Large</wr-option>
    </wr-select>
  `,
})
class MultiHost {
  readonly sizes = signal<unknown>([]);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg">Large</wr-option>
    </wr-select>
  `,
})
class SearchHost {
  readonly size = signal<unknown>(null);
}

/**
 * Two search selects with no `ariaLabel` of their own — one with a placeholder
 * to borrow, one with nothing at all. The second is the case axe reports as a
 * `critical` unnamed control, and it is what a consumer gets the moment they
 * stop passing a placeholder they never wanted.
 */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size">
      <wr-option value="sm">Small</wr-option>
    </wr-select>
    <wr-select mode="search">
      <wr-option value="sm">Small</wr-option>
    </wr-select>
  `,
})
class UnlabelledSearchHost {}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size" ariaLabel="Size" [loading]="loading()" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class PanelStateHost {
  readonly loading = signal(false);
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size" ariaLabel="Size" [minChars]="3" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class MinCharsHost {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size" ariaLabel="Size" [clearable]="false" [(value)]="size">
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class UnclearableSearchHost {
  readonly size = signal<unknown>(null);
}

/**
 * `clearable` DEFAULTS to `false`, so the two hosts below spell it out: a select
 * that says nothing renders no × and answers no Backspace, and a spec written
 * against the old `true` default would go green for the wrong reason — the
 * "leaves the selection alone" one vacuously, since there is nothing to clear
 * with in the first place.
 */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" clearable placeholder="Find a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg">Large</wr-option>
    </wr-select>
  `,
})
class ClearableSearchHost {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" clearable placeholder="Find a size" ariaLabel="Size" [minChars]="3" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class ClearableMinCharsHost {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select responsive placeholder="Pick a size" ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class SheetHost {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="search" placeholder="Find a size" ariaLabel="Size" [options]="dynamic" [(value)]="size">
      <wr-option value="a">Projected A</wr-option>
      <wr-option value="b">Projected B</wr-option>
    </wr-select>
  `,
})
class MixedHost {
  readonly dynamic = ['Dyn One', 'Dyn Two'];
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select mode="search" ariaLabel="Size" [debounceMs]="0" [loader]="load" [(value)]="size" />`,
})
class LoaderHost {
  readonly size = signal<unknown>(null);
  /** Every query the loader was actually asked for, in order. */
  readonly calls: string[] = [];
  /** The one query that fails, and whether it fails before or after returning. */
  readonly failFor = signal<string | null>(null);
  readonly failSynchronously = signal(false);

  readonly load = (query: string): Promise<readonly string[]> | readonly string[] => {
    this.calls.push(query);
    if (query === this.failFor()) {
      if (this.failSynchronously()) throw new Error('loader blew up');
      return Promise.reject(new Error('loader blew up'));
    }
    return [`item for ${query}`];
  };
}

@Component({
  imports: [WrSelect],
  template: `<wr-select mode="tag" placeholder="Add tags" ariaLabel="Tags" [(value)]="tags" />`,
})
class TagHost {
  readonly tags = signal<unknown>([]);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="multi" ariaLabel="Sizes" [maxTagCount]="2" [(value)]="sizes">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
      <wr-option value="lg">Large</wr-option>
      <wr-option value="xl">Huge</wr-option>
    </wr-select>
  `,
})
class OverflowMultiHost {
  readonly sizes = signal<unknown>(['sm', 'md', 'lg', 'xl']);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select mode="tag" ariaLabel="Tags" [maxTagCount]="2" [(value)]="tags" />`,
})
class OverflowTagHost {
  readonly tags = signal<unknown>(['a', 'b', 'c', 'd']);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select mode="tag" ariaLabel="Tags" [separators]="separators()" [(value)]="tags" />`,
})
class TagSeparatorsHost {
  readonly tags = signal<unknown>([]);
  readonly separators = signal<readonly string[]>(['Enter', ',']);
}

@Component({
  imports: [WrSelect],
  template: `
    <wr-select
      mode="tag"
      ariaLabel="Tags"
      [maxItems]="maxItems()"
      [allowDuplicates]="allowDuplicates()"
      [(value)]="tags"
    />
  `,
})
class TagLimitsHost {
  readonly tags = signal<unknown>([]);
  readonly maxItems = signal(0);
  readonly allowDuplicates = signal(false);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Size" [size]="size()" [rounded]="rounded()">
      <wr-option value="sm">Small</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class ConfigHost {
  readonly size = signal<WrSelectSize | null>(null);
  readonly rounded = signal<boolean | null>(null);
}

@Component({
  imports: [WrSelect],
  template: `<wr-select ariaLabel="Size" rounded />`,
})
class RoundedAttrHost {}

@Component({
  imports: [WrSelect, WrOption, WrOptionGroup],
  template: `
    <wr-select mode="search" virtualScroll placeholder="Find a size" ariaLabel="Size" [(value)]="size">
      <wr-option-group label="Sizes">
        <wr-option value="sm">Small</wr-option>
        <wr-option value="md">Medium</wr-option>
      </wr-option-group>
    </wr-select>
  `,
})
class GroupedVirtualHost {
  readonly size = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">{{ text() }}</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class RelabelHost {
  readonly size = signal<unknown>('sm');
  readonly text = signal('Small');
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select mode="multi" ariaLabel="Sizes" [(value)]="sizes">
      <wr-option value="sm">{{ text() }}</wr-option>
      <wr-option value="md">Medium</wr-option>
    </wr-select>
  `,
})
class RelabelMultiHost {
  readonly sizes = signal<unknown>(['sm']);
  readonly text = signal('Small');
}

@Component({
  imports: [WrSelect, WrOption, WrTPipe],
  template: `
    <wr-select ariaLabel="Size" [(value)]="size">
      <wr-option value="sm">{{ 'select.noResults' | wrT }}</wr-option>
    </wr-select>
  `,
})
class CatalogLabelHost {
  readonly size = signal<unknown>('sm');
}

describe('WrSelect', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-select__trigger')!;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const label = (): string | undefined => root().querySelector('.wr-select__value')?.textContent?.trim();
  const placeholder = (): string | undefined => root().querySelector('.wr-select__placeholder')?.textContent?.trim();

  const openPanel = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the placeholder until something is chosen', () => {
    expect(placeholder()).toBe('Pick a size');
    expect(label()).toBeUndefined();
  });

  it('exposes the combobox contract on the trigger', () => {
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Size');
    // `aria-controls` must name the listbox even while it is closed, so a
    // screen reader can describe what the button owns before opening it.
    expect(trigger().getAttribute('aria-controls')).toBeTruthy();
  });

  it('renders no panel until it is opened', () => {
    expect(options()).toHaveLength(0);
  });

  it('opens on click and flips aria-expanded', () => {
    openPanel();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map(o => o.textContent?.trim())).toEqual(['Small', 'Medium', 'Large']);
  });

  it('puts the panel in a container of its own, not CDK’s shared root', () => {
    openPanel();
    // `provideWrOverlay()` exists so ngwr overlays cannot collide with
    // Material's or NG-ZORRO's — a shared container is how z-index wars start.
    expect(document.querySelector('.wr-overlay-container')).toBeTruthy();
  });

  it('selects on click, writes back, and closes', () => {
    openPanel();
    options()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toBe('md');
    expect(label()).toBe('Medium');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(options()).toHaveLength(0);
  });

  it('marks the chosen option as selected when reopened', () => {
    openPanel();
    options()[0].click();
    fixture.detectChanges();

    openPanel();
    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(label()).toBe('Large');
  });

  it('does not select a disabled option', () => {
    openPanel();
    const disabled = options()[2];
    expect(disabled.getAttribute('aria-disabled')).toBe('true');

    disabled.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('opens from the keyboard', () => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('tracks the active option with aria-activedescendant, not with focus', () => {
    // The trigger keeps focus the whole time — that is what lets a combobox
    // stay typable while the list is open.
    openPanel();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const active = trigger().getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)?.getAttribute('role')).toBe('option');
  });

  it('closes on Escape without changing the value', () => {
    openPanel();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('closes on Tab, and lets the focus leave', () => {
    // Nothing closed on Tab, so the listbox outlived the focus that opened it: it can
    // cover the control that just took focus (WCAG 2.4.11), it keeps tracking a trigger
    // nobody is on, and a click aimed at what is underneath lands on an option.
    openPanel();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    trigger().dispatchEvent(event);
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(options()).toHaveLength(0);
    // Never prevented — the browser's own Tab is what moves the caret onward.
    expect(event.defaultPrevented).toBe(false);
  });

  it('commits nothing on the way out', () => {
    // Opened from the KEYBOARD, which seeds the cursor onto the first enabled option —
    // the state where "Tab selects the active option", the other reading of this key,
    // would silently commit a row the user never looked at. A click-opened panel has
    // no cursor to commit, so it cannot tell the two behaviours apart.
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-activedescendant')).toBeTruthy();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('carries the public BEM classes', () => {
    expect(root().querySelector('.wr-select')).toBeTruthy();
    expect(trigger().classList.contains('wr-select__trigger')).toBe(true);
  });
});

/**
 * `[mode]` picks one of four value shapes, and until now every spec above ran in
 * the default `single`. That gap is the reason this block exists: the sibling
 * `wr-date-picker` shipped a real bug for months in the one MODE its suite never
 * entered, while the covered modes stayed green.
 */
describe('WrSelect in multi mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MultiHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-select__trigger')!;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const chips = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-select__chip-label')].map(c => c.textContent.trim());
  const picked = (): unknown => fixture.componentInstance.sizes();

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };
  const choose = (index: number): void => {
    options()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces that several options may be chosen', () => {
    open();
    expect(document.querySelector('[role="listbox"]')!.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('collects an ARRAY and stays open between picks', () => {
    open();
    choose(0);

    // Closing after the first pick is the single-mode behaviour and would make
    // choosing a second value take a second trip through the trigger.
    expect(options().length).toBeGreaterThan(0);
    choose(2);

    expect(picked()).toEqual(['sm', 'lg']);
  });

  it('deselects on a second click', () => {
    open();
    choose(1);
    choose(1);

    expect(picked()).toEqual([]);
  });

  it('shows a chip per selected value, in selection order', () => {
    open();
    choose(2);
    choose(0);

    expect(chips()).toEqual(['Large', 'Small']);
  });

  it('marks every selected option, not just the last', () => {
    open();
    choose(0);
    choose(1);

    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['true', 'true', 'false']);
  });

  it('removes a value from its chip', () => {
    open();
    choose(0);
    choose(1);
    trigger().click(); // close, so the chips are the only surface
    fixture.detectChanges();

    root().querySelector<HTMLElement>('.wr-select__chip-remove')!.click();
    fixture.detectChanges();

    expect(picked()).toEqual(['md']);
  });

  it('renders chips for a value written from outside', () => {
    fixture.componentInstance.sizes.set(['md', 'lg']);
    fixture.detectChanges();

    expect(chips()).toEqual(['Medium', 'Large']);
  });

  it('carries the multi modifier class', () => {
    expect(root().querySelector('wr-select')!.className).toContain('wr-select--multi');
  });
});

describe('WrSelect in search mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SearchHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('.wr-select__search-input')!;
  /**
   * An option that does not match hides itself with `wr-option--hidden` rather
   * than leaving the DOM, so the panel keeps its `aria-activedescendant`
   * targets. `offsetParent` is useless here — jsdom lays nothing out and
   * reports null for everything.
   */
  const visibleOptions = (): string[] =>
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .filter(o => !o.classList.contains('wr-option--hidden'))
      .map(o => o.textContent.trim());

  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SearchHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('puts a real text field on the trigger', () => {
    // Search mode replaces the button with an input — a `combobox` the user
    // types into, not one they only open.
    expect(field()).not.toBeNull();
    expect(field().getAttribute('role')).toBe('combobox');
  });

  it('names the combobox from `ariaLabel`, over the placeholder', () => {
    // The one trigger shape the documented `ariaLabel` never reached. The other
    // four all bind `resolvedAriaLabel()`; this input bound the id and the error
    // pair and not the name, so the component held the value and the DOM did
    // not — which reads as "the input does nothing" rather than as a missing
    // binding. With a placeholder set the field still had a name and the whole
    // thing looked like a precedence quirk; without one, axe reported a
    // `critical` unnamed control.
    expect(field().getAttribute('aria-label')).toBe('Size');
  });

  it('falls back to the placeholder, then to the catalog, so it is never nameless', () => {
    const bare = TestBed.createComponent(UnlabelledSearchHost);
    bare.detectChanges();
    const root = bare.nativeElement as HTMLElement;
    const inputs = [...root.querySelectorAll<HTMLInputElement>('.wr-select__search-input')];

    expect(inputs.map(i => i.getAttribute('aria-label'))).toEqual(['Find a size', 'Select']);
    bare.destroy();
  });

  it('opens the panel as soon as typing starts', () => {
    field().click();
    fixture.detectChanges();
    type('la');

    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('narrows the options to what was typed', () => {
    field().click();
    fixture.detectChanges();
    type('la');

    expect(visibleOptions()).toEqual(['Large']);
  });

  it('shows everything again when the query is cleared', () => {
    field().click();
    fixture.detectChanges();
    type('la');
    type('');

    expect(visibleOptions()).toHaveLength(3);
  });

  it('matches without regard to case', () => {
    field().click();
    fixture.detectChanges();
    type('SMALL');

    expect(visibleOptions()).toEqual(['Small']);
  });

  it('closes on Tab out of the search field too', () => {
    // The typed field has its own handler; it routes what it does not claim into the
    // button trigger's, so this is the same branch reached by the other door.
    field().click();
    fixture.detectChanges();
    type('la');
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(field().getAttribute('aria-expanded')).toBe('false');
  });

  it('carries the search modifier class', () => {
    expect(root().querySelector('wr-select')!.className).toContain('wr-select--search');
  });

  /**
   * jsdom runs no input method. The events below are hand-built with the flags a
   * real one sets, and the assertion is that the listbox did nothing. A faithful
   * test of the guard and no more — nothing here exercises kotoeri or Pinyin, and
   * it must not be read as saying the select has been driven by a real IME.
   *
   * Escape reaches the panel through CDK's overlay keyboard dispatcher, one
   * listener on `<body>`, so the guard has to STOP the event at the field rather
   * than merely decline to act on it. The last test is the other half: an
   * ordinary Escape must still close.
   */
  describe('IME composition', () => {
    const compose = (key: string, init: KeyboardEventInit = { isComposing: true }): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      field().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    const openWithQuery = (): void => {
      field().click();
      fixture.detectChanges();
      type('la');
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    };

    it('keeps the panel and the query on the Escape that cancels a conversion', () => {
      openWithQuery();
      const event = compose('Escape');
      expect(event.defaultPrevented).toBe(false);
      expect(
        document.querySelector('[role="listbox"]'),
        'the reading was cancelled and the panel went too'
      ).not.toBeNull();
      expect(field().value).toBe('la');
    });

    it('leaves the arrows and Enter to the candidate window', () => {
      openWithQuery();
      const active = (): string | null => field().getAttribute('aria-activedescendant');
      const before = active();

      expect(compose('ArrowDown').defaultPrevented).toBe(false);
      expect(active(), 'ArrowDown walked the listbox instead of the candidates').toBe(before);

      expect(compose('Enter').defaultPrevented).toBe(false);
      expect(document.querySelector('[role="listbox"]'), 'Enter picked an option mid-conversion').not.toBeNull();
    });

    it("recognises Safari's committing keystroke, which carries only keyCode 229", () => {
      openWithQuery();
      compose('Escape', { keyCode: 229 });
      expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    });

    it('still closes on a plain Escape', () => {
      openWithQuery();
      compose('Escape', {});
      expect(document.querySelector('[role="listbox"]'), 'the guard swallowed an ordinary Escape').toBeNull();
    });
  });
});

/**
 * What the panel is allowed to OWN. `.wr-select-panel` carries `role="listbox"`
 * itself, so everything inside it is an owned child — and a listbox may own only
 * `option` and `group` (axe `aria-required-children`, critical). Both status rows
 * used to break that: the progress row carried `aria-busy`, which is a global ARIA
 * attribute and so made a role-less `<div>` an owned element the listbox may not
 * own, and the "no results" row was the only thing in the tree in the one state it
 * shows in, leaving the listbox with no owned option at all.
 *
 * Neither a11y gate can see this — the panel lives in a CDK overlay, so
 * `check:a11y` never prerenders it and no `check:state-a11y` state types a query
 * that matches nothing.
 */
describe('WrSelect panel: what the listbox owns', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PanelStateHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const panel = (): HTMLElement => document.querySelector<HTMLElement>('.wr-select-panel')!;
  const loadingRow = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-panel__loading');
  const emptyRow = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-panel__empty');

  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(PanelStateHost);
    fixture.detectChanges();
    field().click();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('marks the listbox busy while the progress row is up, and not the row itself', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    // The container whose required `option` children are temporarily missing is
    // the one ARIA asks to be busy; on the row it was both wrong and the thing
    // that made the row an unallowed owned child.
    expect(loadingRow()).not.toBeNull();
    expect(loadingRow()!.hasAttribute('aria-busy')).toBe(false);
    expect(panel().getAttribute('aria-busy')).toBe('true');
  });

  it('drops `aria-busy` from the listbox once the load is over', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(panel().getAttribute('aria-busy')).toBeNull();
  });

  it('announces the "no results" row as an option the listbox may own', () => {
    type('zzzz');

    expect(emptyRow()).not.toBeNull();
    expect(emptyRow()!.textContent.trim()).toBe('No results');
    expect(emptyRow()!.getAttribute('role')).toBe('option');
    // Not selectable: it is a message, and arrow keys walk the registered
    // `wr-option`s, which this row is not one of.
    expect(emptyRow()!.getAttribute('aria-disabled')).toBe('true');
    expect(emptyRow()!.getAttribute('aria-selected')).toBe('false');
  });

  it('leaves the listbox with no unownable element children in either state', () => {
    // Mirrors axe's own ownership walk: a role-less child is transparent unless
    // it carries a global `aria-*` attribute (or focus), in which case the
    // listbox owns it and may not.
    const unownable = (): string[] =>
      [...panel().children]
        .filter(el => {
          const role = el.getAttribute('role');
          if (role) return !['option', 'group', 'none', 'presentation'].includes(role);
          return el.getAttributeNames().some(a => a === 'aria-busy' || a === 'aria-live' || a === 'aria-label');
        })
        .map(el => el.className || el.tagName.toLowerCase());

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(unownable()).toEqual([]);

    fixture.componentInstance.loading.set(false);
    type('zzzz');
    expect(unownable()).toEqual([]);
  });
});

/**
 * The async `[loader]` path, and specifically what a FAILED load costs. The
 * pipeline is one long-lived subscription built in the constructor and never
 * rebuilt, so an error allowed out of the `switchMap` projection closes it — the
 * select then stops calling the loader for the rest of the component's life,
 * with no spinner, no message and no output to hint at it. Both tests here read
 * the panel after a LATER query, because that is the only place the difference
 * shows: the failing query itself looks the same either way.
 */
describe('WrSelect with an async loader that fails', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LoaderHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('.wr-select__search-input')!;
  /**
   * `.wr-option`, not `[role="option"]`: the "no results" row is an option too
   * (a listbox may own nothing else — see the panel template), and it is the one
   * row that is NOT a loader result.
   */
  const options = (): string[] =>
    [...document.querySelectorAll<HTMLElement>('.wr-option')].map(o => o.textContent.trim());
  const loadingRow = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-select-panel__loading');

  /**
   * `[debounceMs]="0"` still debounces through `timer(0)`, which is a macrotask —
   * and the loader's promise settles in a microtask after it. One turn of the
   * event loop covers both.
   */
  const type = async (text: string): Promise<void> => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(LoaderHost);
    fixture.detectChanges();
    field().click();
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps searching after a load that rejects', async () => {
    fixture.componentInstance.failFor.set('abc');

    await type('ab');
    expect(options()).toEqual(['item for ab']);

    await type('abc');
    await type('abcd');

    expect(fixture.componentInstance.calls).toEqual(['ab', 'abc', 'abcd']);
    expect(options()).toEqual(['item for abcd']);
  });

  it('keeps searching after a loader that throws on the spot, and drops the spinner', async () => {
    // A synchronous throw is the harsher half: the in-flight flag is raised
    // before the loader is called, so an escape past `finalize` leaves the
    // progress row up for good as well as killing the pipeline.
    fixture.componentInstance.failFor.set('abc');
    fixture.componentInstance.failSynchronously.set(true);

    await type('ab');
    await type('abc');

    expect(loadingRow()).toBeNull();

    await type('abcd');

    expect(fixture.componentInstance.calls).toEqual(['ab', 'abc', 'abcd']);
    expect(options()).toEqual(['item for abcd']);
  });

  it('shows nothing rather than the previous query results when a load fails', async () => {
    // Stale rows would read as an answer to the query on screen.
    fixture.componentInstance.failFor.set('abc');

    await type('ab');
    await type('abc');

    expect(options()).toEqual([]);
  });
});

/**
 * The × is a `tabindex="-1"` span with no roving owner, so the
 * `keydown.enter` / `keydown.space` handlers it used to carry could never fire:
 * no key event originates on an element nothing can focus. Dropping them left
 * the searchable single with its clear reachable by pointer alone — every other
 * mode already had Backspace — and a function offered by mouse only is a
 * keyboard failure, not a missing convenience. So Backspace on the empty field
 * IS the clear control here, gated the same way the × is.
 */
describe('WrSelect clearing a search selection from the keyboard', () => {
  const build = <T>(host: Type<T>): ReturnType<typeof TestBed.createComponent<T>> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    return fixture;
  };

  const fieldOf = (fixture: ReturnType<typeof TestBed.createComponent<unknown>>): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;

  /**
   * Focus first, always: a keydown reaches this field only when it has one, and
   * focus is what empties a `minChars: 0` field — the panel opens and the
   * display swaps from the selected label to the live (empty) query. Skipping it
   * would test Backspace against text that is not on screen.
   */
  const backspace = (fixture: ReturnType<typeof TestBed.createComponent<unknown>>): KeyboardEvent => {
    fieldOf(fixture).focus();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    fieldOf(fixture).dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('drops the selection on Backspace in the empty field', () => {
    const fixture = build(ClearableSearchHost);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    // The × is on screen, which is the state whose keyboard twin this is.
    expect((fixture.nativeElement as HTMLElement).querySelector('.wr-select__clear')).not.toBeNull();

    backspace(fixture);

    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('leaves it alone when the field still shows text to delete', () => {
    // Under `[minChars]` a collapsed field paints the selected label while the
    // query is still `''`, and backspacing over that text starts a query. Asking
    // `searchQuery() === ''` instead of asking the FIELD would throw the
    // selection away mid-edit.
    const fixture = build(ClearableMinCharsHost);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();

    backspace(fixture);
    expect(fieldOf(fixture).value).toBe('Medium');

    expect(fixture.componentInstance.size()).toBe('md');
  });

  it('does nothing when the consumer turned the clear control off', () => {
    // `clearable` IS the clear control; a keyboard twin of a button the author
    // refused would be a second way to do what they said should not be offered.
    const fixture = build(UnclearableSearchHost);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();

    const event = backspace(fixture);

    expect(fixture.componentInstance.size()).toBe('md');
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('WrSelect in tag mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TagHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const chips = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-select__chip-label')].map(c => c.textContent.trim());
  const tags = (): unknown => fixture.componentInstance.tags();

  const enter = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TagHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('commits free text as a tag on Enter', () => {
    enter('angular');

    expect(tags()).toEqual(['angular']);
    expect(chips()).toEqual(['angular']);
  });

  it('clears the field after committing, ready for the next one', () => {
    enter('angular');

    // Left behind, the text is committed again on the next Enter.
    expect(field().value).toBe('');
  });

  it('collects several tags in order', () => {
    enter('angular');
    enter('signals');

    expect(tags()).toEqual(['angular', 'signals']);
  });

  it('ignores an empty commit', () => {
    enter('   ');

    expect(tags()).toEqual([]);
  });

  it('removes a tag from its chip', () => {
    enter('angular');
    enter('signals');

    root().querySelector<HTMLElement>('.wr-select__chip-remove')!.click();
    fixture.detectChanges();

    expect(tags()).toEqual(['signals']);
  });

  it('renders chips for tags written from outside', () => {
    fixture.componentInstance.tags.set(['a', 'b']);
    fixture.detectChanges();

    expect(chips()).toEqual(['a', 'b']);
  });

  it('carries the tag modifier class', () => {
    expect(root().querySelector('wr-select')!.className).toContain('wr-select--tag');
  });
});

/**
 * Pasting into a tag field splits on the `separators`, and the splitter is a
 * regex CHARACTER CLASS built from them — so every separator has to survive
 * being dropped into one. `-` is the character that does not: unescaped it
 * opens a range, which either throws (and the paste is lost, because
 * `preventDefault()` has already run) or silently matches everything between
 * two neighbours. The keydown half has always handled `-` correctly, so the
 * two halves of the same input disagreed.
 */
describe('WrSelect tag paste splitting', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TagSeparatorsHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const tags = (): unknown => fixture.componentInstance.tags();

  /** A paste carrying `text`. jsdom has no clipboard, so the payload is stubbed on. */
  const paste = (text: string): Event => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.assign(event, { clipboardData: { getData: (): string => text } });
    field().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TagSeparatorsHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('splits on the default comma', () => {
    paste('angular,signals,zoneless');

    expect(tags()).toEqual(['angular', 'signals', 'zoneless']);
  });

  it('splits on a newline regardless of the separators', () => {
    paste('one\ntwo');

    expect(tags()).toEqual(['one', 'two']);
  });

  it('splits on a hyphen listed after another separator', () => {
    // `[',', '-']` used to compile to `/[,-\n]+/` — "Range out of order",
    // a SyntaxError thrown past `preventDefault()`, so nothing was added at all.
    fixture.componentInstance.separators.set(['Enter', ',', '-']);
    fixture.detectChanges();

    paste('alpha,beta-gamma');

    expect(tags()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('does not let a hyphen between two separators become a range', () => {
    // `[',', '-', ';']` compiled without complaint to a `,`–`;` range, which
    // covers every digit: `2024-01-02` came out as nothing at all.
    fixture.componentInstance.separators.set(['Enter', ',', '-', ';']);
    fixture.detectChanges();

    paste('2024-01-02;next');

    expect(tags()).toEqual(['2024', '01', '02', 'next']);
  });

  it('treats a regex metacharacter as the literal it is documented to be', () => {
    fixture.componentInstance.separators.set(['Enter', '.', '|']);
    fixture.detectChanges();

    paste('a.b|c');

    expect(tags()).toEqual(['a', 'b', 'c']);
  });
});

/**
 * `maxItems` and `allowDuplicates` are the two inputs that change what a chip
 * MEANS, and both used to break the way out of a selection rather than the way
 * in: a full field could not be emptied, and one of two identical chips could
 * not be removed on its own.
 */
describe('WrSelect in tag mode with a cap and duplicates', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TagLimitsHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const removes = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-select__chip-remove')];
  const tags = (): unknown => fixture.componentInstance.tags();

  const enter = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  const backspace = (): void => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(TagLimitsHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  describe('at capacity', () => {
    beforeEach(() => {
      fixture.componentInstance.maxItems.set(2);
      fixture.detectChanges();
      enter('one');
      enter('two');
    });

    /**
     * Asserted through focus rather than by dispatching Backspace: jsdom runs an
     * Angular keydown listener on a DISABLED input too, so a "Backspace still
     * removes a chip" assertion passes on the broken component and proves
     * nothing.
     */
    it('keeps its only tab stop reachable, so the keyboard can get back under the cap', () => {
      field().focus();

      // Chip × and clear-all are `tabindex="-1"` spans, so disabling this input
      // left the whole control with nothing focusable in it at all.
      expect(field().disabled).toBe(false);
      expect(document.activeElement).toBe(field());
      // Read-only instead: still focusable, still refuses typed text.
      expect(field().readOnly).toBe(true);
    });

    it('removes the last chip on Backspace, dropping back under the cap', () => {
      backspace();

      expect(tags()).toEqual(['one']);
      expect(field().readOnly).toBe(false);
    });

    // The cap was never enforced by `disabled` — `tryAddTag` refuses on its own,
    // which is why dropping the disable costs nothing.
    it('still refuses one more tag while full', () => {
      enter('three');

      expect(tags()).toEqual(['one', 'two']);
    });
  });

  describe('with duplicates allowed', () => {
    beforeEach(() => {
      fixture.componentInstance.allowDuplicates.set(true);
      fixture.detectChanges();
    });

    it('removes only the chip whose × was clicked', () => {
      enter('red');
      enter('red');
      enter('blue');
      expect(tags()).toEqual(['red', 'red', 'blue']);

      removes()[0].click();
      fixture.detectChanges();

      // Removal by value deleted every copy at once, so one click emptied the
      // pair the input had just been told to allow.
      expect(tags()).toEqual(['red', 'blue']);
    });

    it('drops one duplicate per Backspace, not the pair', () => {
      enter('red');
      enter('red');

      backspace();

      expect(tags()).toEqual(['red']);
    });
  });
});

describe('WrSelect with a minimum query length', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MinCharsHost>>;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="listbox"]');
  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(MinCharsHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps the panel shut on focus alone', () => {
    // The input is documented as the "minimum query length before the panel
    // opens", and nothing gated the open — so focusing popped an empty bordered
    // box, with the "no results" row gated on the same threshold and therefore
    // absent to explain it.
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('keeps it shut until the query is long enough', () => {
    type('sm');
    expect(panel()).toBeNull();

    type('sma');
    expect(panel()).not.toBeNull();
  });

  it('closes again when the query drops back under the threshold', () => {
    type('sma');
    expect(panel()).not.toBeNull();

    type('sm');
    expect(panel()).toBeNull();
  });

  /**
   * Closing is not forgetting.
   *
   * The panel-close effect reset the query for any searchable select, and
   * `searchDisplay` falls back to the selected label the moment `open()` is
   * false — so backspacing from "sma" to "sm" closed the panel and wiped the
   * field in the same tick. The user was mid-word.
   */
  it('keeps what the user typed when the panel closes under the threshold', async () => {
    field().dispatchEvent(new Event('focus'));
    type('sma');
    type('sm');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(field().value, 'the query was erased while the user was still typing').toBe('sm');

    // And typing on re-opens with the whole query, not a fragment.
    type('sma');
    expect(panel()).not.toBeNull();
  });

  it('does forget it once the field is left', async () => {
    field().dispatchEvent(new Event('focus'));
    type('sm');
    field().dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(field().value).toBe('');
  });
});

describe('WrSelect as a bottom sheet', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SheetHost>>;
  let width: number;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="combobox"]')!;

  beforeEach(() => {
    // `wrPresentAsSheet` decides on `window.innerWidth` against a 640px default.
    width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SheetHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  });

  it('dims behind the sheet with the class that has the styles', () => {
    // The sheet asked for a `wr-select-backdrop` that no stylesheet defines, and
    // naming a custom class also drops CDK's own dark default — so the scrim was
    // invisible while still swallowing every click meant for the page behind it.
    // `wr-dropdown` and `wr-popover` both use the shared class, and this
    // component's stylesheet already imports it.
    trigger().click();
    fixture.detectChanges();

    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop!.classList.contains('wr-overlay-backdrop')).toBe(true);
  });

  it('presents the panel as a sheet', () => {
    trigger().click();
    fixture.detectChanges();

    expect(document.querySelector('.wr-overlay-sheet')).not.toBeNull();
  });
});

describe('WrSelect with both dynamic and projected options', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MixedHost>>;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const activeLabel = (): string | null => {
    const id = field().getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
  };
  const press = (key: string): void => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(MixedHost);
    fixture.detectChanges();
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the dynamic options above the projected ones', () => {
    expect(rows().map(r => r.textContent.trim())).toEqual(['Dyn One', 'Dyn Two', 'Projected A', 'Projected B']);
  });

  it('starts the cursor on the first row on screen', () => {
    // The cursor walks the registry, and registration is CREATION order —
    // projected children are created before the panel's own rows, so opening
    // used to highlight the THIRD row and ArrowDown went to the last.
    expect(activeLabel()).toBe('Dyn One');
  });

  it('moves the cursor in the order the rows appear', () => {
    press('ArrowDown');
    expect(activeLabel()).toBe('Dyn Two');

    press('ArrowDown');
    expect(activeLabel()).toBe('Projected A');

    press('ArrowUp');
    expect(activeLabel()).toBe('Dyn Two');
  });

  /**
   * `firstEnabled()` RETURNS an index, and every reader resolves it against DOM
   * order — so scanning creation order handed back a position in the other
   * list. After a query that leaves the projected rows the only matches, the
   * cursor landed on a row that had been filtered out of view, and Enter
   * committed nothing.
   */
  it('re-seeds the cursor onto a row that is still on screen after a query', () => {
    field().value = 'Projected';
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const visible = rows()
      .filter(r => !r.classList.contains('wr-option--hidden'))
      .map(r => r.textContent.trim());
    expect(visible).toEqual(['Projected A', 'Projected B']);
    expect(activeLabel(), 'the cursor sat on a filtered-out row').toBe('Projected A');

    press('Enter');
    expect(fixture.componentInstance.size()).toBe('a');
  });
});

/**
 * `provideWrConfig()` is a FALLBACK, not an override: the app-wide `select.size` /
 * `select.rounded` apply only where the template said nothing, and a bound value
 * still wins. Two things are specific to this component. The panel lives in the
 * overlay and builds its size modifier SEPARATELY from the trigger's host class,
 * so both are asserted — a resolved value read in only one of the two places is
 * exactly the half-configured state this pins down. And `rounded` is a boolean:
 * `[rounded]="false"` has to turn a configured `true` back off, which is the case a
 * `??` at the call site would get wrong.
 */
describe('WrSelect + provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;

  const mount = (providers: EnvironmentProviders[] = []): HTMLElement => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay(), ...providers] });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-select')!;
  };

  /** Open the panel and hand back its root — it renders into the overlay container. */
  const panel = (): HTMLElement => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-select__trigger')!.click();
    fixture.detectChanges();
    return document.querySelector<HTMLElement>('.wr-select-panel')!;
  };

  afterEach(() => fixture.destroy());

  it('renders the md default on trigger and panel when nothing is configured', () => {
    const host = mount();

    expect(host.className).toBe('wr-select');
    expect([...panel().classList]).toEqual(['wr-select-panel']);
  });

  it('takes the configured size on both the trigger and the overlay panel', () => {
    const host = mount([provideWrConfig({ select: { size: 'sm' } })]);

    expect(host.classList.contains('wr-select--sm')).toBe(true);
    expect(panel().classList.contains('wr-select-panel--sm')).toBe(true);
  });

  it('lets a bound size beat the configured one, panel included', () => {
    const host = mount([provideWrConfig({ select: { size: 'sm' } })]);
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();

    expect(host.classList.contains('wr-select--lg')).toBe(true);
    expect(host.classList.contains('wr-select--sm')).toBe(false);

    const p = panel();
    expect(p.classList.contains('wr-select-panel--lg')).toBe(true);
    expect(p.classList.contains('wr-select-panel--sm')).toBe(false);
  });

  it('takes the configured rounded when the template binds none', () => {
    expect(mount([provideWrConfig({ select: { rounded: true } })]).classList.contains('wr-select--rounded')).toBe(true);
  });

  it('lets a bound `false` turn a configured `rounded` back off', () => {
    const host = mount([provideWrConfig({ select: { rounded: true } })]);
    fixture.componentInstance.rounded.set(false);
    fixture.detectChanges();

    // The escape hatch: a global default a template cannot refuse is the failure
    // mode this whole design exists to avoid.
    expect(host.classList.contains('wr-select--rounded')).toBe(false);
  });

  it('lets an explicitly bound `md` beat the configured size, panel included', () => {
    const host = mount([provideWrConfig({ select: { size: 'sm' } })]);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();

    // The size counterpart of `[rounded]="false"` above: `md` is the one bound
    // value that renders as the ABSENCE of a class, so an implementation that
    // treats it as "not set" is indistinguishable from a correct one in every
    // other test here.
    expect(host.className).toBe('wr-select');
    expect([...panel().classList]).toEqual(['wr-select-panel']);
  });

  it('ignores a config that names other components', () => {
    expect(mount([provideWrConfig({ input: { size: 'sm', rounded: true } })]).className).toBe('wr-select');
  });
});

describe('WrSelect rounded attribute', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RoundedAttrHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(RoundedAttrHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('still reads a bare `rounded` as true', () => {
    // Coercion has to keep running: the null-preserving transform buys `rounded`
    // an "unset" state, and must not cost the bare-attribute form its meaning.
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-select')!;

    expect(host.classList.contains('wr-select--rounded')).toBe(true);
  });
});

/**
 * A `<wr-form-field>` renders its `<label for>` before it can see what was
 * projected into it, so the id has to be adopted from the other side. The select
 * never did, and the failure is the quiet kind: the field looks exactly as it
 * always did, `for` names an element that is nowhere in the document, clicking
 * the label does nothing, and the error copy the field renders is announced to
 * nobody.
 *
 * Every case here resolves the id through the DOCUMENT rather than reading the
 * attribute — an id that merely exists on some element is what the bug already
 * looked like. And the select has three trigger shapes, only one of which
 * renders at a time, so all three are checked: a `for` is only useful if it
 * lands on a labelable element, and all three tab stops are one.
 */
@Component({
  imports: [FormField, WrFormField, WrSelect, WrOption],
  template: `
    <wr-form-field label="Country">
      <wr-select [formField]="profile.country">
        <wr-option value="kz">Kazakhstan</wr-option>
      </wr-select>
    </wr-form-field>
  `,
})
class FieldHost {
  private readonly model = signal({ country: '' });
  readonly profile = form(this.model, path => {
    required(path.country);
  });
}

@Component({
  imports: [WrFormField, WrSelect, WrOption],
  template: `
    <wr-form-field label="Country">
      <wr-select mode="search">
        <wr-option value="kz">Kazakhstan</wr-option>
      </wr-select>
    </wr-form-field>
  `,
})
class SearchFieldHost {}

@Component({
  imports: [WrFormField, WrSelect],
  template: `<wr-form-field label="Tags"><wr-select mode="tag" /></wr-form-field>`,
})
class TagFieldHost {}

@Component({
  imports: [WrFormField, WrSelect, WrOption],
  template: `
    <wr-form-field label="Country" hint="Where the invoice is issued">
      <wr-select><wr-option value="kz">Kazakhstan</wr-option></wr-select>
    </wr-form-field>
  `,
})
class HintedFieldHost {}

describe('WrSelect inside a form field', () => {
  afterEach(() => TestBed.resetTestingModule());

  const build = (component: Type<unknown>): ReturnType<typeof TestBed.createComponent> => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  };

  const labelTarget = (root: HTMLElement): Element | null => {
    const label = root.querySelector<HTMLLabelElement>('label')!;
    expect(label.htmlFor).not.toBe('');
    return root.querySelector(`#${CSS.escape(label.htmlFor)}`);
  };

  it('answers to the id the label points at, on the trigger button', () => {
    const root = build(FieldHost).nativeElement as HTMLElement;
    const target = labelTarget(root);

    expect(target).toBe(root.querySelector('.wr-select__trigger'));
    // Labelable, so `for` actually names it — `<wr-select>` itself is not.
    expect((target as HTMLElement).tagName).toBe('BUTTON');
  });

  it('puts it on the search input in search mode', () => {
    const root = build(SearchFieldHost).nativeElement as HTMLElement;

    expect(labelTarget(root)).toBe(root.querySelector('.wr-select__search-input'));
  });

  it('puts it on the tag input in tag mode', () => {
    const root = build(TagFieldHost).nativeElement as HTMLElement;

    expect(labelTarget(root)).toBe(root.querySelector('.wr-select__tag-input'));
  });

  it('carries no describedby or invalid flag while the field has nothing to say', () => {
    // An `aria-describedby` pointing at nothing is invalid, and announcing
    // "invalid" with no message is worse than staying quiet.
    const trigger = (build(FieldHost).nativeElement as HTMLElement).querySelector('.wr-select__trigger')!;

    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
  });

  it('points the trigger at the message once the field is showing one', () => {
    const fixture = build(FieldHost);
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLElement>('.wr-select__trigger')!;

    // Blur is what marks the control touched, which is the gate the error block
    // sits behind — the same way a user opens it.
    trigger.dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');

    const errors = root.querySelector(`#${CSS.escape(describedBy!)}`);
    expect(errors).not.toBeNull();
    expect(errors!.textContent?.trim()).not.toBe('');
  });

  it('keeps the trigger’s own name — an aria-label outranks a <label>', () => {
    // Deliberate, and the same call `wr-slider` made: `<wr-form-field>` renders a
    // label only when its `label` input is set, so it cannot promise a name, and
    // a combobox that traded a generic one for none would be the worse bug. Set
    // `[ariaLabel]` to the field's label where the two should read alike.
    const trigger = (build(FieldHost).nativeElement as HTMLElement).querySelector('.wr-select__trigger')!;

    expect(trigger.getAttribute('aria-label')).toBe('Select');
  });

  it('is described by the field’s hint, without reporting itself invalid', () => {
    // The hint used to carry no id at all, so `aria-describedby` could only ever
    // name the error block and the sentence explaining the field reached a
    // screen-reader user through no path whatsoever. It is a separate signal
    // from the invalid flag on purpose: keyed on "is anything describing me",
    // every hinted field would announce itself as being in error.
    const root = build(HintedFieldHost).nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLElement>('.wr-select__trigger')!;
    const describedBy = trigger.getAttribute('aria-describedby');

    expect(describedBy).not.toBeNull();
    expect(root.querySelector(`#${CSS.escape(describedBy!)}`)!.textContent?.trim()).toBe('Where the invoice is issued');
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
  });

  it('stamps no id at all on a select standing on its own', () => {
    // The field is what supplies the id; a bare select inventing one would put a
    // document-global name on a trigger nothing points at.
    const root = build(Host).nativeElement as HTMLElement;

    expect(root.querySelector('.wr-select__trigger')!.getAttribute('id')).toBeNull();
  });
});

/**
 * `virtualScroll` is documented to stand down whenever static `<wr-option>`
 * children are projected — the windowed path renders plain rows that carry none
 * of an option's DOM-derived label or selection. Signal `contentChildren()`
 * defaults to `descendants: false`, so options wrapped in a `<wr-option-group>`
 * — the shape the docs page itself demonstrates — were invisible to that guard:
 * the select saw no projected options, virtualized an empty data array, and the
 * group's rows rendered beside a window that owned the keyboard.
 */
describe('WrSelect with virtualScroll over grouped projected options', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupedVirtualHost>>;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const activeLabel = (): string | null => {
    const id = field().getAttribute('aria-activedescendant');
    return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
  };
  const press = (key: string): void => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(GroupedVirtualHost);
    fixture.detectChanges();
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the group full, with no virtual window beside it', () => {
    expect(rows().map(r => r.textContent.trim())).toEqual(['Small', 'Medium']);
    expect(document.querySelector('.wr-select-panel__vlist')).toBeNull();
  });

  it('keeps the keyboard on the grouped rows', () => {
    expect(activeLabel()).toBe('Small');

    press('ArrowDown');
    expect(activeLabel()).toBe('Medium');

    press('Enter');
    expect(fixture.componentInstance.size()).toBe('md');
  });
});

/**
 * The overflow chip is a STRING, and it was the only one in this component that
 * never reached the catalog: printed as a bare `+{{ extra }} more`, it stayed
 * English in a fully Russian app — next to a `wr-event-calendar` cell rendering
 * "ещё 3" from the same sentence, through `eventCalendar.more`. It is emitted
 * twice (the chip trigger and the multi button trigger), so both are checked.
 */
describe('WrSelect overflow chip', () => {
  afterEach(() => TestBed.resetTestingModule());

  const chip = (fixture: { nativeElement: unknown }): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-select__chip--more')!.textContent.trim();

  const mountRu = async <T>(host: Type<T>): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  it('keeps its English wording when no catalog is configured', () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(OverflowMultiHost);
    fixture.detectChanges();

    expect(chip(fixture)).toBe('+2 more');
  });

  it('translates on the multi trigger', async () => {
    const fixture = await mountRu(OverflowMultiHost);

    expect(/\p{Script=Cyrillic}/u.test(chip(fixture)), `"${chip(fixture)}" is still English`).toBe(true);
    expect(chip(fixture)).toContain('2');
  });

  it('translates on the chip trigger too', async () => {
    const fixture = await mountRu(OverflowTagHost);

    expect(/\p{Script=Cyrillic}/u.test(chip(fixture)), `"${chip(fixture)}" is still English`).toBe(true);
    expect(chip(fixture)).toContain('2');
  });
});

/**
 * The trigger label is PROJECTED CONTENT, so nothing about it is a signal: an
 * `<wr-option>` renders whatever its host template put inside it, and the parent
 * reads that back off the DOM. Read once and cached, that is wrong the moment
 * the text changes under it — which is the ordinary case, not an edge one,
 * because `WrI18n` writes every loader-backed catalog a microtask AFTER the
 * first change-detection pass. The options repaint; a cached trigger does not.
 */
describe('WrSelect trigger label vs. option text that changes', () => {
  afterEach(() => TestBed.resetTestingModule());

  const triggerLabel = (fixture: { nativeElement: unknown }): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-select__value')!.textContent.trim();

  it('re-reads the selected option label when the option re-renders', async () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(RelabelHost);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(triggerLabel(fixture)).toBe('Small');

    fixture.componentInstance.text.set('Klein');
    fixture.detectChanges();
    // The option reads its own projected text back off the DOM through a
    // `MutationObserver`, so the label lands a microtask after the render that
    // moved it — one more pass, not a second render cycle in the app.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(triggerLabel(fixture)).toBe('Klein');
  });

  it('re-reads it in multi mode too, where the label rides a chip', async () => {
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(RelabelMultiHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const chip = (): string =>
      (fixture.nativeElement as HTMLElement).querySelector('.wr-select__chip')!.textContent.trim();
    expect(chip()).toContain('Small');

    fixture.componentInstance.text.set('Klein');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(chip()).toContain('Klein');
  });

  it('follows a catalog that lands after the first pass, the way pagination’s size changer does', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(CatalogLabelHost);
    fixture.detectChanges();
    // Two rounds, and the second is the point rather than an accident of the
    // runner. The first settles the catalog — `WrI18n` resolves every loader
    // from a promise, so the option repaints one pass after mounting. The
    // observer that notices the option's text moved then delivers on the
    // microtask after THAT pass. Both are asynchronous in a real app too; what
    // is being asserted is that the trigger ends up on the same string as the
    // option, not how many frames it took.
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = triggerLabel(fixture);
    expect(/\p{Script=Cyrillic}/u.test(text), `trigger is still "${text}"`).toBe(true);
  });
});

/**
 * A long, NON-virtual panel scrolls its keyboard cursor into view.
 *
 * The virtual panel always did, through index maths against a measured row
 * height; the projected panel kept the ARIA and lost the scrolling, and the two
 * halves fail in a way that looks like success. `aria-activedescendant` moves
 * correctly, `wr-option--active` lands on the right row, the announcement is
 * right — and the panel stays at `scrollTop` 0 with the cursor hundreds of
 * pixels below the fold, so a sighted keyboard user drives an invisible cursor
 * and Enter commits a row they never saw. Nothing else can move this panel: the
 * rows never take DOM focus, which is the whole point of an
 * `aria-activedescendant` listbox, so the browser never scrolls on anyone's
 * behalf.
 *
 * ⚠️ Geometry is STUBBED, and it has to be. jsdom lays nothing out — every rect
 * is 0×0 and every `clientHeight` is 0 — so on the real DOM the maths resolves
 * to "already in view" for every row and would pass just as happily on the
 * broken component. The stub is a uniform 20px row inside a 100px viewport,
 * installed on `HTMLElement.prototype` so it survives the panel being disposed
 * and rebuilt on each open. Row tops track the panel's live `scrollTop`, which
 * is what makes a second key press compose with the first instead of measuring
 * against a stale frame.
 *
 * What this cannot answer is whether the rows are 20px: real row geometry is
 * read rather than assumed precisely because a projected `<wr-option>` with a
 * description or a wrapped label is not the height of its neighbour.
 */
@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Row" [(value)]="row">
      @for (n of rows; track n) {
        <wr-option [value]="n">Row {{ n }}</wr-option>
      }
    </wr-select>
  `,
})
class LongHost {
  readonly rows = Array.from({ length: 30 }, (_, i) => i);
  readonly row = signal<unknown>(null);
}

describe('WrSelect panel scrolling', () => {
  const ROW = 20;
  const VIEWPORT = 100;

  let fixture: ReturnType<typeof TestBed.createComponent<LongHost>>;

  const rect = (top: number, height: number): DOMRect => ({
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });

  const saved = {
    rect: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getBoundingClientRect'),
    clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight'),
  };

  const panel = (): HTMLElement => document.querySelector<HTMLElement>('.wr-select-panel')!;
  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-select__trigger')!;
  /** The keyboard path, which is the one that seeds a cursor at all — a click
   * deliberately leaves the list cursor-less until a key is pressed. */
  const openPanel = (): void => {
    key('ArrowDown');
  };
  const key = (name: string, times = 1): void => {
    for (let i = 0; i < times; i++) {
      trigger().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    }
    fixture.detectChanges();
  };
  /** Index the cursor is on, read the way a screen reader reads it. */
  const activeRow = (): number => {
    const id = trigger().getAttribute('aria-activedescendant');
    const rows = [...panel().querySelectorAll<HTMLElement>('[role="option"]')];
    return rows.findIndex(row => row.id === id);
  };

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      writable: true,
      value(this: HTMLElement): DOMRect {
        const open = document.querySelector<HTMLElement>('.wr-select-panel');
        if (!open) return rect(0, 0);
        if (this === open) return rect(0, VIEWPORT);
        const rows = [...open.querySelectorAll<HTMLElement>('[role="option"]')];
        const index = rows.indexOf(this);
        return index >= 0 ? rect(index * ROW - open.scrollTop, ROW) : rect(0, 0);
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get(this: HTMLElement): number {
        return this.classList.contains('wr-select-panel') ? VIEWPORT : 0;
      },
    });

    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(LongHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    for (const [key, descriptor] of [
      ['getBoundingClientRect', saved.rect],
      ['clientHeight', saved.clientHeight],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
    }
  });

  it('opens at the top when nothing is selected', () => {
    openPanel();
    expect(panel().scrollTop).toBe(0);
    expect(activeRow()).toBe(0);
  });

  it('opens cursor-less, and so unscrolled, for a pointer', () => {
    // The existing contract, pinned because the seed added here sits right
    // beside it: a mouse user gets no cursor until they press a key, so there is
    // nothing to scroll to and the panel must not jump on its own.
    fixture.componentInstance.row.set(25);
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-activedescendant')).toBeNull();
    expect(panel().scrollTop).toBe(0);
  });

  it('walks the rows in DOM order from the very first open', () => {
    // The cursor order is decided by a `compareDocumentPosition` sort that the
    // template reads on the first change detection — while the projected rows
    // are still inside an un-instantiated `<ng-template>` and therefore not in
    // the document. A UA may answer PRECEDING or FOLLOWING arbitrarily for
    // disconnected nodes, and the result is cached for the life of the select,
    // so trusting it put End on the FIRST row here. Both ends, because a
    // reversed order satisfies neither and passes half of any single check.
    openPanel();
    const rows = [...panel().querySelectorAll<HTMLElement>('[role="option"]')];

    key('End');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(rows.at(-1)!.id);

    key('Home');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(rows[0].id);
  });

  it('brings the last row into view on End', () => {
    openPanel();
    key('End');

    // Bottom-aligned: the last row's bottom edge sits on the viewport's.
    expect(activeRow()).toBe(29);
    expect(panel().scrollTop).toBe(29 * ROW + ROW - VIEWPORT);
  });

  it('comes back to the top on Home', () => {
    openPanel();
    key('End');
    key('Home');

    expect(activeRow()).toBe(0);
    expect(panel().scrollTop).toBe(0);
  });

  it('follows the cursor down one row at a time, and only once it reaches the fold', () => {
    openPanel();

    // Rows 1–4 are already on screen — a panel that jumped on every press would
    // make the list crawl under a still cursor.
    key('ArrowDown', 4);
    expect(activeRow()).toBe(4);
    expect(panel().scrollTop).toBe(0);

    // Row 5 is the first past the fold, and the panel moves exactly far enough.
    key('ArrowDown');
    expect(activeRow()).toBe(5);
    expect(panel().scrollTop).toBe(ROW);
  });

  it('scrolls back up when the cursor walks off the top edge', () => {
    openPanel();
    key('End');
    key('ArrowUp', 25);

    // Top-aligned on the way up, where bottom-aligning would overshoot.
    expect(activeRow()).toBe(4);
    expect(panel().scrollTop).toBe(4 * ROW);
  });

  it('wraps to the top with the cursor, not just with the ARIA', () => {
    openPanel();
    key('End');
    key('ArrowDown');

    expect(activeRow()).toBe(0);
    expect(panel().scrollTop).toBe(0);
  });

  it('opens onto the selected row rather than at the top', () => {
    // The seed half. A select whose value is the 25th row opened showing rows
    // 0–4 and a cursor nobody could see, before any key was pressed at all.
    fixture.componentInstance.row.set(25);
    fixture.detectChanges();
    openPanel();

    expect(activeRow()).toBe(25);
    expect(panel().scrollTop).toBe(25 * ROW + ROW - VIEWPORT);
  });
});
