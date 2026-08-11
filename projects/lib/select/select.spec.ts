import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
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
  imports: [WrSelect],
  template: `<wr-select mode="tag" placeholder="Add tags" ariaLabel="Tags" [(value)]="tags" />`,
})
class TagHost {
  readonly tags = signal<unknown>([]);
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

  it('carries the search modifier class', () => {
    expect(root().querySelector('wr-select')!.className).toContain('wr-select--search');
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
