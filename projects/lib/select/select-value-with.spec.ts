import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrOption } from './option';
import { WrSelect } from './select';

/** `V` when it is a real type; see `select-types.spec.ts`. */
type NotAny<V> = 0 extends 1 & V ? [never] : [];

interface Person {
  id: number;
  name: string;
}

const PEOPLE: readonly Person[] = [
  { id: 11, name: 'Aigerim' },
  { id: 12, name: 'Bolat' },
  { id: 13, name: 'Chingiz' },
];

const personName = (person: Person): string => person.name;
const personId = (person: Person): number => person.id;

/** The shape the input exists for: a list of objects, a form that holds the id. */
@Component({
  imports: [FormField, WrSelect],
  template: `
    <wr-select
      placeholder="Pick a person"
      ariaLabel="Assignee"
      [options]="people"
      [displayWith]="name"
      [valueWith]="id"
      [formField]="f.assignee"
    />
  `,
})
class SingleHost {
  readonly people = PEOPLE;
  readonly name = personName;
  readonly id = personId;
  readonly model = signal<{ assignee: number | null }>({ assignee: null });
  readonly f = form(this.model);
}

@Component({
  imports: [WrSelect, WrOption],
  template: `
    <wr-select
      mode="multi"
      selectAll
      ariaLabel="Reviewers"
      [options]="people"
      [displayWith]="name"
      [valueWith]="id"
      [(value)]="picked"
    >
      <wr-option [value]="99">Guest</wr-option>
    </wr-select>
  `,
})
class MultiHost {
  readonly people = PEOPLE;
  readonly name = personName;
  readonly id = personId;
  readonly picked = signal<readonly number[]>([]);
}

/**
 * `strictTemplates` checks this host: `V` comes from `valueWith`, so the value
 * bound two-way is a `number` signal over `Person` items and `valueChange`
 * carries a number, never a `Person` and never `any`.
 */
@Component({
  imports: [WrSelect],
  template: `
    <wr-select
      mode="search"
      ariaLabel="Assignee"
      [serverSearch]="server()"
      [freeText]="freeText()"
      [virtualScroll]="virtual()"
      [options]="people()"
      [displayWith]="name"
      [valueWith]="id"
      [(value)]="assignee"
      (valueChange)="expectId($event)"
    />
  `,
})
class SearchHost {
  readonly people = signal(PEOPLE);
  readonly server = signal(false);
  readonly freeText = signal(false);
  readonly virtual = signal(false);
  readonly name = personName;
  readonly id = personId;
  readonly assignee = signal<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a probe's parameters exist to be typed, never read
  expectId<V extends number | readonly number[] | null>(_value: V, ..._rest: NotAny<V>): void {
    return;
  }
}

/** No `valueWith`: an item is its own value, as it was before the input existed. */
@Component({
  imports: [WrSelect],
  template: `<wr-select ariaLabel="Assignee" [options]="people" [displayWith]="name" (valueChange)="last = $event" />`,
})
class ItemHost {
  readonly people = PEOPLE;
  readonly name = personName;
  last: Person | readonly Person[] | null = null;
}

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-option')];

describe('WrSelect valueWith in single mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SingleHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-select__trigger')!;
  const label = (): string | undefined => root().querySelector('.wr-select__value')?.textContent?.trim();
  const placeholder = (): string | undefined => root().querySelector('.wr-select__placeholder')?.textContent?.trim();
  const press = (key: string): void => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('puts the id in the bound field and the name on the trigger', () => {
    trigger().click();
    fixture.detectChanges();

    expect(options().map(o => o.textContent.trim())).toEqual(['Aigerim', 'Bolat', 'Chingiz']);

    options()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.model().assignee).toBe(12);
    expect(label()).toBe('Bolat');
  });

  it('labels an id set from the form while the panel has never opened', () => {
    fixture.componentInstance.model.set({ assignee: 13 });
    fixture.detectChanges();

    expect(label()).toBe('Chingiz');
    expect(placeholder()).toBeUndefined();
  });

  it('keeps the placeholder for an id no item carries', () => {
    fixture.componentInstance.model.set({ assignee: 404 });
    fixture.detectChanges();

    expect(label()).toBeUndefined();
    expect(placeholder()).toBe('Pick a person');
  });

  it('marks the row of the held id as selected and opens the cursor on it', () => {
    fixture.componentInstance.model.set({ assignee: 12 });
    fixture.detectChanges();

    press('ArrowDown');

    expect(options().map(o => o.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(trigger().getAttribute('aria-activedescendant')).toBe(options()[1].id);

    press('ArrowDown');
    press('Enter');

    expect(fixture.componentInstance.model().assignee).toBe(13);
  });
});

describe('WrSelect valueWith in multi mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MultiHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-select__trigger')!;
  const chips = (): string[] =>
    [...root().querySelectorAll<HTMLElement>('.wr-select__chip-label')].map(c => c.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('labels chips for ids set from outside, before the panel ever opened', () => {
    fixture.componentInstance.picked.set([13, 11]);
    fixture.detectChanges();

    expect(chips()).toEqual(['Chingiz', 'Aigerim']);
  });

  it('toggles ids into the array, beside a projected option', () => {
    trigger().click();
    fixture.detectChanges();
    options()[0].click();
    options()[3].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked()).toEqual([11, 99]);
    expect(chips()).toEqual(['Aigerim', 'Guest']);

    options()[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked()).toEqual([99]);
  });

  it('selects every id through the select-all row', () => {
    trigger().click();
    fixture.detectChanges();
    document.querySelector<HTMLElement>('.wr-select-panel__select-all')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked()).toEqual([11, 12, 13, 99]);
    expect(chips()).toEqual(['Aigerim', 'Bolat', 'Chingiz', 'Guest']);
  });

  it('shows an id no item carries as text until its item arrives', () => {
    fixture.componentInstance.picked.set([404]);
    fixture.detectChanges();

    expect(chips()).toEqual(['404']);
  });
});

describe('WrSelect valueWith in search mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SearchHost>>;

  const host = (): SearchHost => fixture.componentInstance;
  const field = (): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.wr-select__search-input')!;
  const focus = (): void => {
    field().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  };
  const type = (value: string): void => {
    field().value = value;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  const press = (key: string): void => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  let realScrollTo: PropertyDescriptor | undefined;

  beforeEach(() => {
    // jsdom has no `Element.scrollTo`, which the virtual list calls on itself.
    realScrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
    Object.defineProperty(Element.prototype, 'scrollTo', {
      value: (): void => undefined,
      configurable: true,
      writable: true,
    });
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SearchHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    if (realScrollTo) Object.defineProperty(Element.prototype, 'scrollTo', realScrollTo);
    else delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
  });

  it('shows the name of an id set from outside, before the panel opens', () => {
    host().assignee.set(12);
    fixture.detectChanges();

    expect(field().value).toBe('Bolat');
  });

  it('filters by the label and commits the id', () => {
    focus();
    type('chi');
    press('Enter');

    expect(host().assignee()).toBe(13);
    expect(field().value).toBe('Chingiz');
  });

  it('keeps the label after the server drops the picked row', () => {
    host().server.set(true);
    fixture.detectChanges();
    focus();
    options()[0].click();
    fixture.detectChanges();
    expect(field().value).toBe('Aigerim');

    host().people.set([PEOPLE[2]]);
    fixture.detectChanges();

    expect(host().assignee()).toBe(11);
    expect(field().value).toBe('Aigerim');
  });

  it('commits typed text as it is under freeText', () => {
    host().freeText.set(true);
    fixture.detectChanges();
    focus();
    type('Someone else');
    press('Enter');

    expect(host().assignee()).toBe('Someone else');
    expect(field().value).toBe('Someone else');
  });

  it('selects by id on the virtual rows', () => {
    host().virtual.set(true);
    host().assignee.set(12);
    fixture.detectChanges();
    expect(field().value).toBe('Bolat');

    focus();
    const rows = [...document.querySelectorAll<HTMLElement>('.wr-select-panel__vlist [role="option"]')];
    expect(rows.map(r => r.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);

    rows[2].click();
    fixture.detectChanges();

    expect(host().assignee()).toBe(13);
    expect(field().value).toBe('Chingiz');
  });
});

describe('WrSelect without valueWith', () => {
  it('keeps the item as the value', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(ItemHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    root.querySelector<HTMLButtonElement>('.wr-select__trigger')!.click();
    fixture.detectChanges();
    options()[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.last).toBe(PEOPLE[2]);
    expect(root.querySelector('.wr-select__value')?.textContent?.trim()).toBe('Chingiz');
    fixture.destroy();
  });
});
