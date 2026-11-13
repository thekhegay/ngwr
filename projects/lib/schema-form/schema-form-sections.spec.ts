/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, hidden, metadata, required, schema } from '@angular/forms/signals';

import { WR_FIELD } from 'ngwr/form';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrSchemaForm } from './schema-form';

interface User {
  readonly name: string;
  readonly email: string;
  readonly notes: string;
  readonly phone: string;
  readonly company: boolean;
  readonly vatId: string;
  readonly taxOffice: string;
}

const ACCOUNT = { title: 'Account', description: 'Who signs in.', columns: 3 };

const userSchema = schema<User>(path => {
  metadata(path.name, WR_FIELD, () => ({ kind: 'input', section: ACCOUNT }));
  metadata(path.email, WR_FIELD, () => ({ kind: 'input', section: 'Account', span: 5 }));
  metadata(path.notes, WR_FIELD, () => ({ kind: 'textarea' }));
  // Out of key order on purpose: it joins the section its title names.
  metadata(path.phone, WR_FIELD, () => ({ kind: 'input', section: 'Account' }));
  metadata(path.company, WR_FIELD, () => ({ kind: 'switch' }));

  required(path.vatId, { message: 'Enter the VAT id.' });
  hidden(path.vatId, ({ valueOf }) => !valueOf(path.company));
  metadata(path.vatId, WR_FIELD, () => ({ kind: 'input', label: 'VAT id', section: 'Billing' }));
  hidden(path.taxOffice, ({ valueOf }) => !valueOf(path.company));
  metadata(path.taxOffice, WR_FIELD, () => ({ kind: 'input', section: 'Billing' }));
});

@Component({
  imports: [WrSchemaForm],
  template: `<wr-schema-form [field]="user" [columns]="2" />`,
})
class Host {
  readonly model = signal<User>({
    name: '',
    email: '',
    notes: '',
    phone: '',
    company: false,
    vatId: '',
    taxOffice: '',
  });
  readonly user = form(this.model, userSchema);
}

describe('WrSchemaForm sections', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const labels = (root: Element): (string | undefined)[] =>
    [...root.querySelectorAll('.wr-form-field__label')].map(label => label.textContent?.trim());

  it('draws the fields naming one section in a fieldset, under its title as the legend', () => {
    const section = el.querySelector('fieldset.wr-schema-form__section')!;

    // A `<legend>` is what names a `<fieldset>`: no ARIA is needed, or written.
    expect(section.firstElementChild?.tagName).toBe('LEGEND');
    expect(section.querySelector('legend')?.textContent?.trim()).toBe('Account');
    expect(section.hasAttribute('aria-label')).toBe(false);
    // `phone` stands after `notes` in the model, and is drawn with its section.
    expect(labels(section)).toEqual(['Name', 'Email', 'Phone']);
  });

  it('stands where its first field stands, and leaves the fields outside it on the form grid', () => {
    const host = el.querySelector('wr-schema-form')!;

    expect([...host.children].map(child => child.className)).toEqual([
      'wr-schema-form__section',
      'wr-schema-form__field',
      'wr-schema-form__field',
    ]);
    expect(labels(host)).toEqual(['Name', 'Email', 'Phone', 'Notes']);
  });

  it('describes the group with the section description', () => {
    const section = el.querySelector('.wr-schema-form__section')!;
    const description = section.querySelector('.wr-schema-form__description')!;

    expect(description.textContent?.trim()).toBe('Who signs in.');
    expect(section.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('lays its fields on its own columns, and clamps a span to them', () => {
    const grid = el.querySelector<HTMLElement>('.wr-schema-form__section .wr-schema-form__grid')!;
    const cells = [...grid.querySelectorAll<HTMLElement>('.wr-schema-form__field')];

    expect(grid.style.gridTemplateColumns).toMatch(/^repeat\(3,/);
    // The form has two columns, the section three: the span of five stops at three.
    expect(cells.map(cell => cell.style.gridColumn)).toEqual(['span 1', 'span 3', 'span 1']);
    expect(el.querySelector<HTMLElement>('wr-schema-form')!.style.gridTemplateColumns).toMatch(/^repeat\(2,/);
  });

  it('takes the columns of the form when it states none, and draws no description', async () => {
    fixture.componentInstance.model.update(user => ({ ...user, company: true }));
    await fixture.whenStable();

    const billing = el.querySelectorAll<HTMLElement>('.wr-schema-form__section')[1];
    expect(billing.querySelector('legend')?.textContent?.trim()).toBe('Billing');
    expect(billing.querySelector<HTMLElement>('.wr-schema-form__grid')!.style.gridTemplateColumns).toMatch(
      /^repeat\(2,/
    );
    expect(billing.querySelector('.wr-schema-form__description')).toBeNull();
    expect(billing.hasAttribute('aria-describedby')).toBe(false);
  });

  /**
   * Conditional fields are the schema's own `hidden()` rule, read by the
   * template as Angular's docs require. The section adds one case: a fieldset
   * whose every field is hidden would announce a group of nothing.
   */
  it('is not drawn while the schema hides every field in it, and comes back with them', async () => {
    expect(el.querySelectorAll('.wr-schema-form__section')).toHaveLength(1);
    expect(el.textContent).not.toContain('Billing');
    // The hidden field is required and empty, and does not block the form.
    expect(fixture.componentInstance.user().valid()).toBe(true);

    fixture.componentInstance.model.update(user => ({ ...user, company: true }));
    await fixture.whenStable();

    expect(labels(el.querySelectorAll('.wr-schema-form__section')[1])).toEqual(['VAT id *', 'Tax office']);
    expect(fixture.componentInstance.user().valid()).toBe(false);

    fixture.componentInstance.model.update(user => ({ ...user, company: false }));
    await fixture.whenStable();

    expect(el.querySelectorAll('.wr-schema-form__section')).toHaveLength(1);
    expect(fixture.componentInstance.user().valid()).toBe(true);
  });
});
