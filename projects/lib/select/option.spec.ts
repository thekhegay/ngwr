import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSelectMode } from './interfaces';
import { WrOption } from './option';
import { WrOptionLeading } from './option-leading';
import { WrSelect } from './select';

/**
 * Counts its own instances, and prints the initials it is given — so a spec can
 * tell both whether a leading template was instantiated and whether its text
 * leaked into a label.
 */
let live = 0;
let created = 0;

@Component({
  selector: 'wr-test-probe',
  template: '{{ initials() }}',
  host: { class: 'probe', '[attr.data-placement]': 'placement()' },
})
class Probe {
  readonly initials = input('');
  readonly placement = input('');

  constructor() {
    live++;
    created++;
    inject(DestroyRef).onDestroy(() => live--);
  }
}

interface Person {
  readonly id: number;
  readonly name: string;
  readonly initials: string;
  readonly email: string;
}

/** Initials chosen so none is a substring of any name — a match on one is a leak. */
const PEOPLE: readonly Person[] = [
  { id: 1, name: 'Хегай Роман', initials: 'ХР', email: 'roman@locata.dev' },
  { id: 2, name: 'Ada Lovelace', initials: 'AL', email: 'ada@locata.dev' },
  { id: 3, name: 'Grace Hopper', initials: 'GH', email: 'grace@locata.dev' },
];

@Component({
  imports: [WrSelect, WrOption, WrOptionLeading, Probe],
  template: `
    <wr-select ariaLabel="Assignee" [mode]="mode()" [(value)]="value">
      @for (p of people; track p.id) {
        <wr-option [value]="p.id">
          <ng-template wrOptionLeading let-placement="placement">
            <wr-test-probe [initials]="p.initials" [placement]="placement" />
          </ng-template>
          {{ p.name }}
        </wr-option>
      }
    </wr-select>
  `,
})
class LeadingHost {
  readonly people = PEOPLE;
  readonly mode = signal<WrSelectMode | null>(null);
  readonly value = signal<unknown>(null);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select ariaLabel="Assignee" [mode]="mode()" [(value)]="value">
      @for (p of people; track p.id) {
        <wr-option [value]="p.id" [label]="p.id === 2 ? adaLabel() : null">
          {{ p.name }} <small>{{ p.email }}</small>
        </wr-option>
      }
    </wr-select>
  `,
})
class LabelHost {
  readonly people = PEOPLE;
  readonly mode = signal<WrSelectMode | null>(null);
  readonly value = signal<unknown>(null);
  readonly adaLabel = signal<string | null>('Ada Lovelace');
}

/** A select-wide default beside one option that brings its own. */
@Component({
  imports: [WrSelect, WrOption, WrOptionLeading, Probe],
  template: `
    <wr-select ariaLabel="Assignee" mode="multi" [(value)]="value">
      <ng-template wrOptionLeading let-id let-placement="placement">
        <wr-test-probe [initials]="'D' + id" [placement]="placement" />
      </ng-template>
      <wr-option [value]="1">
        <ng-template wrOptionLeading let-placement="placement">
          <wr-test-probe initials="OWN" [placement]="placement" />
        </ng-template>
        One
      </wr-option>
      <wr-option [value]="2">Two</wr-option>
    </wr-select>
  `,
})
class DefaultLeadingHost {
  readonly value = signal<unknown>([]);
}

/** No select-wide template: one option brings its own, and the other must draw nothing. */
@Component({
  imports: [WrSelect, WrOption, WrOptionLeading, Probe],
  template: `
    <wr-select ariaLabel="Assignee" mode="multi" [(value)]="value">
      <wr-option [value]="1">
        <ng-template wrOptionLeading let-placement="placement">
          <wr-test-probe initials="OWN" [placement]="placement" />
        </ng-template>
        One
      </wr-option>
      <wr-option [value]="2">Two</wr-option>
    </wr-select>
  `,
})
class OwnLeadingOnlyHost {
  readonly value = signal<unknown>([]);
}

/** Enough rows with a visual to put the selected one below the fold of a stubbed panel. */
@Component({
  imports: [WrSelect, WrOption, WrOptionLeading, Probe],
  template: `
    <wr-select ariaLabel="Row" [(value)]="row">
      @for (n of rows; track n) {
        <wr-option [value]="n">
          <ng-template wrOptionLeading><wr-test-probe initials="#" /></ng-template>
          Row {{ n }}
        </wr-option>
      }
    </wr-select>
  `,
})
class LongLeadingHost {
  readonly rows = Array.from({ length: 12 }, (_, i) => i);
  readonly row = signal<unknown>(null);
}

/** 500 data-array rows and a select-wide template — the only way a virtual row gets a visual. */
@Component({
  imports: [WrSelect, WrOptionLeading, Probe],
  template: `
    <wr-select
      mode="search"
      ariaLabel="City"
      virtualScroll
      [rowHeight]="20"
      [viewportHeight]="200"
      [overscan]="2"
      [options]="cities"
      [(value)]="city"
    >
      <ng-template wrOptionLeading let-city let-placement="placement">
        <wr-test-probe initials="#" [placement]="placement" />
      </ng-template>
    </wr-select>
  `,
})
class VirtualLeadingHost {
  readonly cities = Array.from({ length: 500 }, (_, i) => `City ${i}`);
  readonly city = signal<unknown>(null);
}

const probes = (scope: ParentNode = document): HTMLElement[] => [...scope.querySelectorAll<HTMLElement>('.probe')];

/** The option's accessible name, as far as text goes: its text minus every `aria-hidden` subtree. */
const accessibleText = (el: HTMLElement): string => {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
};

describe('WrOption leading visual', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LeadingHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-select__trigger')!;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('wr-option')];

  const toggle = async (): Promise<void> => {
    trigger().click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    live = 0;
    created = 0;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(LeadingHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('instantiates nothing while the panel is closed', () => {
    // The options themselves already exist — projected content is created with
    // the page and kept, detached, until the panel attaches it — which is exactly
    // why the visual has to be a template.
    expect(created).toBe(0);
    expect(probes()).toEqual([]);
  });

  it('instantiates one per row when the panel opens, inside an aria-hidden slot', async () => {
    await toggle();

    expect(live).toBe(PEOPLE.length);
    for (const option of options()) {
      const slot = option.querySelector('.wr-option__leading')!;
      expect(slot.getAttribute('aria-hidden')).toBe('true');
      expect(slot.querySelector('.probe')!.getAttribute('data-placement')).toBe('option');
    }
  });

  it('destroys them again when the panel closes', async () => {
    await toggle();
    expect(live).toBe(PEOPLE.length);

    await toggle();

    expect(live).toBe(0);
    expect(document.querySelector('.wr-option__leading')).toBeNull();
  });

  it('keeps the visual out of the option’s accessible name', async () => {
    await toggle();

    // The drawn text includes the initials; what a screen reader gets does not.
    expect(options()[0].textContent).toContain('ХР');
    expect(options().map(accessibleText)).toEqual(PEOPLE.map(p => p.name));
  });

  it('never lets the initials into the trigger label, even when chosen with the panel open', async () => {
    await toggle();
    options()[0].click();
    await fixture.whenStable();

    expect(root().querySelector('.wr-select__value')!.textContent.trim()).toBe('Хегай Роман');
  });

  it('draws exactly one copy beside a single-mode selection', async () => {
    fixture.componentInstance.value.set(3);
    await fixture.whenStable();

    const slot = root().querySelector('.wr-select__value-leading')!;
    expect(slot.getAttribute('aria-hidden')).toBe('true');
    expect(probes(root()).map(p => p.getAttribute('data-placement'))).toEqual(['value']);
    expect(live).toBe(1);
  });

  it('draws one per selected chip in multi mode, and none for the rest', async () => {
    fixture.componentInstance.mode.set('multi');
    fixture.componentInstance.value.set([1, 3]);
    await fixture.whenStable();

    const chips = [...root().querySelectorAll<HTMLElement>('.wr-select__chip')];
    expect(chips.map(c => c.querySelector('.wr-select__chip-label')!.textContent.trim())).toEqual([
      'Хегай Роман',
      'Grace Hopper',
    ]);
    expect(chips.map(c => c.querySelector('.wr-select__chip-leading')!.getAttribute('aria-hidden'))).toEqual([
      'true',
      'true',
    ]);
    expect(probes(root()).map(p => [p.textContent.trim(), p.getAttribute('data-placement')])).toEqual([
      ['ХР', 'chip'],
      ['GH', 'chip'],
    ]);
    expect(live).toBe(2);
  });

  it('never matches a search query against the visual', async () => {
    fixture.componentInstance.mode.set('search');
    await fixture.whenStable();

    const field = root().querySelector<HTMLInputElement>('.wr-select__search-input')!;
    field.dispatchEvent(new Event('focus'));
    await fixture.whenStable();
    // Rendered — the panel is open — so a label read off the whole host would
    // see "AL" in Ada's row.
    expect(live).toBe(PEOPLE.length);

    field.value = 'AL';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(options().filter(o => !o.classList.contains('wr-option--hidden'))).toEqual([]);
    expect(document.querySelector('.wr-select-panel__empty')).not.toBeNull();

    field.value = 'love';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(
      options()
        .filter(o => !o.classList.contains('wr-option--hidden'))
        .map(accessibleText)
    ).toEqual(['Ada Lovelace']);
  });
});

describe('WrOption label input', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LabelHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-select__trigger')!;
  const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('wr-option')];
  const valueText = (): string | undefined => root().querySelector('.wr-select__value')?.textContent.trim();

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(LabelHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('wins over the projected text on the trigger', async () => {
    fixture.componentInstance.value.set(2);
    await fixture.whenStable();

    expect(valueText()).toBe('Ada Lovelace');
  });

  it('leaves an option without one reading its text, as before', async () => {
    fixture.componentInstance.value.set(1);
    await fixture.whenStable();

    expect(valueText()).toBe('Хегай Роман roman@locata.dev');
  });

  it('follows a label that changes', async () => {
    fixture.componentInstance.value.set(2);
    await fixture.whenStable();

    fixture.componentInstance.adaLabel.set('Augusta Ada King');
    await fixture.whenStable();
    expect(valueText()).toBe('Augusta Ada King');

    // Emptied, it falls back to the text rather than rendering a blank trigger.
    fixture.componentInstance.adaLabel.set('');
    await fixture.whenStable();
    expect(valueText()).toBe('Ada Lovelace ada@locata.dev');
  });

  it('names the chip and its remove control in multi mode', async () => {
    fixture.componentInstance.mode.set('multi');
    fixture.componentInstance.value.set([2]);
    await fixture.whenStable();

    expect(root().querySelector('.wr-select__chip-label')!.textContent.trim()).toBe('Ada Lovelace');
    expect(root().querySelector('.wr-select__chip-remove')!.getAttribute('aria-label')).toBe('Remove Ada Lovelace');
  });

  it('is what a search query is matched against', async () => {
    fixture.componentInstance.mode.set('search');
    await fixture.whenStable();

    const field = root().querySelector<HTMLInputElement>('.wr-select__search-input')!;
    field.dispatchEvent(new Event('focus'));
    const type = async (q: string): Promise<void> => {
      field.value = q;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
    };
    const visible = (): string[] =>
      options()
        .filter(o => !o.classList.contains('wr-option--hidden'))
        .map(o => o.getAttribute('id')!);

    // Ada's email is on screen but is not her label, so it no longer matches…
    await type('ada@');
    expect(visible()).toEqual([]);

    // …while the other two, with no label, still match on everything they draw.
    await type('@locata');
    expect(visible()).toEqual([options()[0].id, options()[2].id]);

    await type('lovelace');
    expect(visible()).toEqual([options()[1].id]);
  });

  it('does not rename the row itself', async () => {
    trigger().click();
    await fixture.whenStable();

    // The label is what the select REPORTS; the row keeps announcing what it draws.
    expect(options()[1].getAttribute('aria-label')).toBeNull();
    expect(accessibleText(options()[1])).toBe('Ada Lovelace ada@locata.dev');
  });
});

describe('WrSelect select-wide leading template', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<DefaultLeadingHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    live = 0;
    created = 0;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(DefaultLeadingHost);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('is the default for an option without one, and an option’s own wins', async () => {
    root().querySelector<HTMLElement>('.wr-select__trigger')!.click();
    await fixture.whenStable();

    const rows = [...document.querySelectorAll<HTMLElement>('wr-option')];
    expect(rows.map(r => r.querySelector('.probe')!.textContent.trim())).toEqual(['OWN', 'D2']);
    expect(rows.map(accessibleText)).toEqual(['One', 'Two']);
  });

  it('follows the same precedence on the chips', async () => {
    fixture.componentInstance.value.set([2, 1]);
    await fixture.whenStable();

    expect(probes(root()).map(p => p.textContent.trim())).toEqual(['D2', 'OWN']);
    expect(created).toBe(2);
  });

  it('never takes an option’s own template for the select-wide default', async () => {
    // Only a direct child of `<wr-select>` is the default. A query that reached
    // into the options would find One's template first and hand it to Two.
    const own = TestBed.createComponent(OwnLeadingOnlyHost);
    try {
      own.componentInstance.value.set([1, 2]);
      await own.whenStable();
      (own.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-select__trigger')!.click();
      await own.whenStable();

      const rows = [...document.querySelectorAll<HTMLElement>('wr-option')];
      expect(rows.map(r => r.querySelector('.wr-option__leading') !== null)).toEqual([true, false]);
      const chips = [...(own.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-select__chip')];
      expect(chips.map(c => c.querySelector('.wr-select__chip-leading') !== null)).toEqual([true, false]);
      expect(probes().map(p => p.textContent.trim())).toEqual(['OWN', 'OWN']);
    } finally {
      own.destroy();
    }
  });
});

/**
 * Opening from the keyboard onto a selected row still lands on it once the rows
 * have drawn their visuals.
 *
 * The seed scroll is taken the moment the portal attaches, and a projected
 * option renders its leading visual a pass LATER — it belongs to the consumer's
 * view, not the portal's. So every row above the cursor grows after it was
 * measured, and the cursor ends up under the fold by the sum of the growth.
 *
 * ⚠️ Geometry is STUBBED, for the reason `select.spec.ts` gives in its own
 * scrolling block (jsdom lays nothing out). What makes the stub honest here is
 * that a row's height depends on whether its `.wr-option__leading` slot is in
 * the DOM at the moment it is measured, which is exactly the thing that moves.
 */
describe('WrSelect scroll seed with leading visuals', () => {
  const PLAIN = 20;
  const WITH_LEADING = 30;
  const VIEWPORT = 100;

  let fixture: ReturnType<typeof TestBed.createComponent<LongLeadingHost>>;

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
  const rowHeight = (row: HTMLElement): number => (row.querySelector('.wr-option__leading') ? WITH_LEADING : PLAIN);

  beforeEach(async () => {
    live = 0;
    created = 0;
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      writable: true,
      value(this: HTMLElement): DOMRect {
        const open = document.querySelector<HTMLElement>('.wr-select-panel');
        if (!open) return rect(0, 0);
        if (this === open) return rect(0, VIEWPORT);
        const rows = [...open.querySelectorAll<HTMLElement>('[role="option"]')];
        const index = rows.indexOf(this);
        if (index < 0) return rect(0, 0);
        const top = rows.slice(0, index).reduce((sum, row) => sum + rowHeight(row), 0);
        return rect(top - open.scrollTop, rowHeight(this));
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get(this: HTMLElement): number {
        return this.classList.contains('wr-select-panel') ? VIEWPORT : 0;
      },
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(LongLeadingHost);
    await fixture.whenStable();
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

  it('keeps the selected row in view after the rows above it grow', async () => {
    fixture.componentInstance.row.set(11);
    await fixture.whenStable();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await fixture.whenStable();

    const rows = [...panel().querySelectorAll<HTMLElement>('[role="option"]')];
    expect(trigger().getAttribute('aria-activedescendant')).toBe(rows[11].id);
    // Every row drew its visual, so the rows really did grow after the seed.
    expect(rows.every(row => row.querySelector('.wr-option__leading') !== null)).toBe(true);
    // Twelve rows, plus the one copy beside the selected value on the trigger.
    expect(live).toBe(13);
    // Bottom-aligned on the grown geometry: twelve 30px rows under a 100px panel.
    // Measured before the visuals landed, it stopped at 12 × 20 − 100 = 140.
    expect(panel().scrollTop).toBe(12 * WITH_LEADING - VIEWPORT);
  });
});

describe('WrSelect leading visual under virtual scroll', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<VirtualLeadingHost>>;
  let realScrollTo: PropertyDescriptor | undefined;

  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];

  beforeEach(async () => {
    live = 0;
    created = 0;
    // jsdom has no `Element.scrollTo`, which the virtual list calls — see the
    // virtual-scroll block in `select.spec.ts` for why it is stubbed this way.
    realScrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
    Object.defineProperty(Element.prototype, 'scrollTo', {
      value: (): void => undefined,
      configurable: true,
      writable: true,
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(VirtualLeadingHost);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    if (realScrollTo) Object.defineProperty(Element.prototype, 'scrollTo', realScrollTo);
    else delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
  });

  it('instantiates only the rendered window, not five hundred', async () => {
    // A select-wide template is not a projected option, so virtualisation still engages.
    expect(created).toBe(0);

    field().dispatchEvent(new Event('focus'));
    await fixture.whenStable();

    expect(document.querySelector('.wr-select-panel__vlist')).not.toBeNull();
    const rendered = rows().length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(20);
    expect(live).toBe(rendered);
    expect(rows().every(r => r.querySelector('.wr-option__leading')!.getAttribute('aria-hidden') === 'true')).toBe(
      true
    );
    expect(accessibleText(rows()[0])).toBe('City 0');
  });

  it('lets them go when the panel closes', async () => {
    field().dispatchEvent(new Event('focus'));
    await fixture.whenStable();
    expect(live).toBeGreaterThan(0);

    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(rows()).toEqual([]);
    expect(live).toBe(0);
  });
});
