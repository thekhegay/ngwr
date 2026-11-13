/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  applyEach,
  disabled,
  form,
  hidden,
  maxLength,
  metadata,
  minLength,
  required,
  schema,
} from '@angular/forms/signals';

import { WR_FIELD } from 'ngwr/form';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSchemaForm } from './schema-form';

interface Address {
  readonly street: string;
  readonly city: string;
  readonly business: boolean;
  readonly company: string;
}

interface User {
  readonly name: string;
  readonly addresses: readonly Address[];
}

const blank = (): Address => ({ street: '', city: '', business: false, company: '' });

const userSchema = schema<User>(path => {
  metadata(path.name, WR_FIELD, () => ({ kind: 'input' }));

  minLength(path.addresses, 1, { message: 'Add at least one address.' });
  maxLength(path.addresses, 3);
  metadata(path.addresses, WR_FIELD, () => ({
    kind: 'array',
    itemLabel: 'Address',
    hint: 'Up to three.',
    columns: 2,
    item: blank,
  }));
  applyEach(path.addresses, item => {
    required(item.street, { message: 'Enter the street.' });
    metadata(item.street, WR_FIELD, () => ({ kind: 'input' }));
    metadata(item.city, WR_FIELD, () => ({ kind: 'input' }));
    metadata(item.business, WR_FIELD, () => ({ kind: 'switch' }));
    required(item.company, { message: 'Enter the company.' });
    hidden(item.company, ({ valueOf }) => !valueOf(item.business));
    metadata(item.company, WR_FIELD, () => ({ kind: 'input', span: 2 }));
  });
});

@Component({
  imports: [WrSchemaForm],
  template: `<wr-schema-form [field]="user" [addLabel]="addLabel()" [removeLabel]="removeLabel()" />`,
})
class Host {
  readonly model = signal<User>({
    name: 'Ada',
    addresses: [
      { street: 'One', city: 'London', business: false, company: '' },
      { street: 'Two', city: 'Paris', business: false, company: '' },
    ],
  });
  readonly addLabel = signal<string | null>(null);
  readonly removeLabel = signal<string | null>(null);
  readonly user = form(this.model, userSchema);
}

describe('WrSchemaForm repeating groups', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    // Focus only moves inside a document.
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const items = (): HTMLElement[] => [...el.querySelectorAll<HTMLElement>('.wr-schema-form__item')];
  const streets = (): string[] => fixture.componentInstance.model().addresses.map(address => address.street);
  const add = (): HTMLButtonElement => el.querySelector<HTMLButtonElement>('.wr-schema-form__add')!;
  const removes = (): HTMLButtonElement[] => [...el.querySelectorAll<HTMLButtonElement>('.wr-schema-form__remove')];
  const firstInput = (item: Element): HTMLInputElement => item.querySelector<HTMLInputElement>('input.wr-input')!;

  it('draws one group per item under the label as a legend, each item a form of its own', () => {
    const array = el.querySelector('fieldset.wr-schema-form__array')!;

    expect(array.querySelector('legend')?.textContent?.trim()).toBe('Addresses');
    expect(items()).toHaveLength(2);
    expect(items().map(item => item.querySelector('.wr-schema-form__item-title')?.textContent?.trim())).toEqual([
      'Address 1',
      'Address 2',
    ]);
    // `company` is hidden until the item says it is a business.
    expect([...items()[0].querySelectorAll('.wr-form-field__label')].map(l => l.textContent?.trim())).toEqual([
      'Street *',
      'City',
    ]);
    expect(firstInput(items()[1]).value).toBe('Two');
    // The item grid is the spec's `columns`, not the form's.
    expect(items()[0].querySelector<HTMLElement>('wr-schema-form')!.style.gridTemplateColumns).toMatch(/^repeat\(2,/);
    // The array is not a `__field`: it has no control of its own.
    expect(el.querySelectorAll('wr-schema-form > .wr-schema-form__field')).toHaveLength(7);
  });

  it('names each item group, and each Remove button after its item', () => {
    const [first, second] = items();
    const name = (ids: string | null): string =>
      (ids ?? '')
        .split(' ')
        .map(id => document.getElementById(id)?.textContent?.trim())
        .join(' ');

    expect(first.getAttribute('role')).toBe('group');
    expect(name(first.getAttribute('aria-labelledby'))).toBe('Address 1');
    // Five buttons that all read "Remove" tell a screen reader user nothing.
    expect(name(removes()[1].getAttribute('aria-labelledby'))).toBe('Remove Address 2');
    expect(second.querySelector('button')?.getAttribute('type')).toBe('button');
  });

  it('adds an item from the spec factory and focuses its first field', async () => {
    add().click();
    await fixture.whenStable();

    expect(streets()).toEqual(['One', 'Two', '']);
    expect(items()).toHaveLength(3);
    expect(document.activeElement).toBe(firstInput(items()[2]));
    // The new item is required and empty, and says nothing until it is touched.
    expect(el.querySelector('.wr-form-field__error')).toBeNull();
    expect(fixture.componentInstance.user().valid()).toBe(false);
  });

  it('removes an item and focuses the one that took its place', async () => {
    removes()[0].click();
    await fixture.whenStable();

    expect(streets()).toEqual(['Two']);
    expect(document.activeElement).toBe(firstInput(items()[0]));
    expect(firstInput(items()[0]).value).toBe('Two');
  });

  it('focuses the Add button when the last item is removed', async () => {
    removes()[1].click();
    await fixture.whenStable();

    expect(streets()).toEqual(['One']);
    expect(document.activeElement).toBe(add());
  });

  it('stops Remove at minLength and Add at maxLength, both read from the schema', async () => {
    expect(removes().map(button => button.disabled)).toEqual([false, false]);

    removes()[1].click();
    await fixture.whenStable();
    // One item left, and the schema asks for one.
    expect(removes().map(button => button.disabled)).toEqual([true]);

    add().click();
    await fixture.whenStable();
    add().click();
    await fixture.whenStable();
    expect(items()).toHaveLength(3);
    expect(add().disabled).toBe(true);

    add().click();
    await fixture.whenStable();
    expect(items()).toHaveLength(3);
  });

  it('validates each item on its own, with the message of its own rule', async () => {
    const street = firstInput(items()[1]);
    street.value = '';
    street.dispatchEvent(new Event('input'));
    street.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(items()[0].querySelector('.wr-form-field__error')).toBeNull();
    expect(items()[1].querySelector('[data-key="required"]')?.textContent?.trim()).toBe('Enter the street.');
    expect(fixture.componentInstance.user.addresses[1].street().valid()).toBe(false);
    expect(fixture.componentInstance.user.addresses[0]().valid()).toBe(true);
  });

  it('shows the errors of the list itself under it, and points the group at them', async () => {
    fixture.componentInstance.model.update(user => ({ ...user, addresses: [] }));
    await fixture.whenStable();
    const array = el.querySelector('.wr-schema-form__array')!;

    // Nobody touched the list yet: the hint is what describes it.
    expect(array.querySelector('.wr-form-field__error')).toBeNull();
    expect(document.getElementById(array.getAttribute('aria-describedby')!)?.textContent?.trim()).toBe('Up to three.');

    fixture.componentInstance.user.addresses().markAsTouched();
    await fixture.whenStable();

    const error = array.querySelector('[data-key="minLength"]')!;
    expect(error.textContent?.trim()).toBe('Add at least one address.');
    expect(document.getElementById(array.getAttribute('aria-describedby')!)?.contains(error)).toBe(true);
  });

  /**
   * A conditional field is the schema's `hidden()` rule, and inside
   * `applyEach` it reads the item it belongs to.
   */
  it('draws a conditional field of an item when its rule says so, and never lets a hidden one block validity', async () => {
    expect(el.textContent).not.toContain('Company');
    expect(fixture.componentInstance.user().valid()).toBe(true);

    fixture.componentInstance.model.update(user => ({
      ...user,
      addresses: user.addresses.map((address, index) => (index === 1 ? { ...address, business: true } : address)),
    }));
    await fixture.whenStable();

    expect(items()[0].textContent).not.toContain('Company');
    expect(items()[1].querySelector('.wr-form-field--required .wr-form-field__label')).toBeTruthy();
    expect(items()[1].textContent).toContain('Company');
    // Drawn, required and empty: now it counts.
    expect(fixture.componentInstance.user().valid()).toBe(false);

    fixture.componentInstance.model.update(user => ({
      ...user,
      addresses: user.addresses.map(address => ({ ...address, business: false })),
    }));
    await fixture.whenStable();

    expect(el.textContent).not.toContain('Company');
    expect(fixture.componentInstance.user().valid()).toBe(true);
  });

  it('takes the button texts from the inputs, and from the i18n catalog without them', async () => {
    expect([add().textContent?.trim(), removes()[0].textContent?.trim()]).toEqual(['Add', 'Remove']);

    fixture.componentInstance.addLabel.set('Add address');
    fixture.componentInstance.removeLabel.set('Delete');
    await fixture.whenStable();

    expect([add().textContent?.trim(), removes()[0].textContent?.trim()]).toEqual(['Add address', 'Delete']);

    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;

    expect([add().textContent?.trim(), removes()[0].textContent?.trim()]).toEqual(['Добавить', 'Удалить']);
  });

  describe('edges', () => {
    beforeEach(() => TestBed.resetTestingModule());

    it('draws no Add button without an item factory, and locks both buttons on a disabled list', () => {
      interface Fixed {
        readonly rows: readonly { readonly name: string }[];
      }
      @Component({ imports: [WrSchemaForm], template: `<wr-schema-form [field]="f" />` })
      class FixedHost {
        readonly model = signal<Fixed>({ rows: [{ name: 'a' }] });
        readonly f = form(
          this.model,
          schema<Fixed>(path => {
            disabled(path.rows, () => true);
            metadata(path.rows, WR_FIELD, () => ({ kind: 'array' }));
            applyEach(path.rows, row => metadata(row.name, WR_FIELD, () => ({ kind: 'input' })));
          })
        );
      }

      const fixed = TestBed.createComponent(FixedHost);
      fixed.detectChanges();
      const root = fixed.nativeElement as HTMLElement;

      expect(root.querySelector('.wr-schema-form__add')).toBeNull();
      expect(root.querySelector<HTMLButtonElement>('.wr-schema-form__remove')!.disabled).toBe(true);
      // The heading falls back to the label when the spec names no item.
      expect(root.querySelector('.wr-schema-form__item-title')?.textContent?.trim()).toBe('Rows 1');
    });

    it('skips an undescribed list without a word, and warns when the kind sits on no list', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      interface Loose {
        readonly name: string;
        readonly log: readonly { readonly at: string }[];
        readonly rows: string;
      }
      @Component({ imports: [WrSchemaForm], template: `<wr-schema-form [field]="f" />` })
      class LooseHost {
        readonly model = signal<Loose>({ name: '', log: [{ at: 'now' }], rows: 'x' });
        readonly f = form(
          this.model,
          schema<Loose>(path => {
            metadata(path.name, WR_FIELD, () => ({ kind: 'input' }));
            metadata(path.rows, WR_FIELD, () => ({ kind: 'array' }));
          })
        );
      }

      const loose = TestBed.createComponent(LooseHost);
      loose.detectChanges();

      expect((loose.nativeElement as HTMLElement).querySelectorAll('.wr-schema-form__item')).toHaveLength(0);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain(`field "rows" is described as kind 'array'`);
      warn.mockRestore();
    });
  });
});
