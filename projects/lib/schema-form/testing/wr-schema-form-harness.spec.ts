import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, hidden, metadata, required, schema } from '@angular/forms/signals';

import { WR_FIELD, type WrFieldKind } from 'ngwr/form';
import { WrFormFieldHarness } from 'ngwr/form/testing';
import { WrInputHarness } from 'ngwr/input/testing';
import { WrSchemaForm } from 'ngwr/schema-form';
import { WrSelectHarness } from 'ngwr/select/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSchemaFormFieldHarness } from './wr-schema-form-field-harness';
import { WrSchemaFormHarness } from './wr-schema-form-harness';

interface Profile {
  readonly workEmail: string;
  readonly bio: string;
  readonly age: number;
  readonly role: string;
  readonly plan: string;
  readonly agree: boolean;
  readonly notify: boolean;
  readonly volume: number;
  readonly joined: Date | null;
  readonly secret: string;
  readonly internalId: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];

// ngwr ships no error texts, so every rule that can fail carries its own.
const profileSchema = schema<Profile>(path => {
  required(path.workEmail, { message: 'Enter your work address.' });
  metadata(path.workEmail, WR_FIELD, () => ({ kind: 'input', type: 'email', hint: 'Work address only.' }));
  required(path.bio, { message: 'Say something.' });
  metadata(path.bio, WR_FIELD, () => ({ kind: 'textarea', span: 2 }));
  metadata(path.age, WR_FIELD, () => ({ kind: 'number' }));
  metadata(path.role, WR_FIELD, () => ({ kind: 'select', label: 'Access level', options: ROLES }));
  metadata(path.plan, WR_FIELD, () => ({ kind: 'radio', options: ROLES }));
  metadata(path.agree, WR_FIELD, () => ({ kind: 'checkbox', label: 'I agree to the terms' }));
  metadata(path.notify, WR_FIELD, () => ({ kind: 'switch' }));
  metadata(path.volume, WR_FIELD, () => ({ kind: 'slider' }));
  metadata(path.joined, WR_FIELD, () => ({ kind: 'date' }));
  hidden(path.secret, () => true);
  metadata(path.secret, WR_FIELD, () => ({ kind: 'input' }));
  // `internalId` is deliberately undescribed.
});

@Component({
  imports: [WrSchemaForm],
  template: `<wr-schema-form [field]="profile" [columns]="columns()" />`,
})
class Host {
  readonly model = signal<Profile>({
    workEmail: '',
    bio: '',
    age: 30,
    role: 'user',
    plan: 'user',
    agree: false,
    notify: false,
    volume: 4,
    joined: null,
    secret: '',
    internalId: 'x-1',
  });
  readonly columns = signal(2);
  readonly profile = form(this.model, profileSchema);
}

describe('WrSchemaFormHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let schemaForm: WrSchemaFormHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    schemaForm = await loader.getHarness(WrSchemaFormHarness);
  });

  afterEach(() => fixture.destroy());

  it('lists the fields by the label each draws, and skips what the form does not draw', async () => {
    // `secret` is hidden by the schema and `internalId` is undescribed. The
    // checkbox and the switch carry their label inside the control.
    expect(await schemaForm.getLabels()).toEqual([
      'Work email',
      'Bio',
      'Age',
      'Access level',
      'Plan',
      'I agree to the terms',
      'Notify',
      'Volume',
      'Joined',
    ]);
  });

  it('names the kind each field draws', async () => {
    const fields = await schemaForm.getFields();
    const kinds: WrFieldKind[] = await Promise.all(fields.map(field => field.getKind()));

    expect(kinds).toEqual(['input', 'textarea', 'number', 'select', 'radio', 'checkbox', 'switch', 'slider', 'date']);
  });

  it('hands back a control harness that works, for every kind', async () => {
    await (await schemaForm.getControl('Work email', 'input')).setValue('ada@example.com');
    await (await schemaForm.getControl('Bio', 'textarea')).setValue('Writes programs.');
    await (await schemaForm.getControl('Age', 'number')).setValue(41);
    await (await schemaForm.getControl('Access level', 'select')).selectOption({ text: 'Admin' });
    await (await schemaForm.getControl('Plan', 'radio')).select({ label: 'Admin' });
    await (await schemaForm.getControl('I agree to the terms', 'checkbox')).check();
    await (await schemaForm.getControl('Notify', 'switch')).turnOn();

    expect(fixture.componentInstance.model()).toMatchObject({
      workEmail: 'ada@example.com',
      bio: 'Writes programs.',
      age: 41,
      role: 'admin',
      plan: 'admin',
      agree: true,
      notify: true,
    });
    expect(await (await schemaForm.getControl('Volume', 'slider')).isRange()).toBe(false);
    expect(await (await schemaForm.getControl('Joined', 'date')).isOpen()).toBe(false);
  });

  it('hands back the very harness the control has', async () => {
    const field = await schemaForm.getField('Access level');

    expect(await field.getControl('select')).toBeInstanceOf(WrSelectHarness);
    expect(await (await schemaForm.getField('Work email')).getControl('input')).toBeInstanceOf(WrInputHarness);
    expect(await field.getFormField()).toBeInstanceOf(WrFormFieldHarness);
  });

  it('refuses the wrong kind, and says which one is drawn', async () => {
    await expect(schemaForm.getControl('Age', 'select')).rejects.toThrow(/"Age" draws a 'number' control/);
  });

  it('finds a field by its label, never by its key', async () => {
    await expect(schemaForm.getField('workEmail')).rejects.toThrow(/not by its key. This form draws: Work email, Bio/);
    // The label the schema gave wins over the key's own words.
    await expect(schemaForm.getField('Role')).rejects.toThrow(/no field is labelled Role/);
    expect(await (await schemaForm.getField(/^Access/)).getKind()).toBe('select');
  });

  it('shows no error on a field nobody touched, and the rule’s own message once somebody has', async () => {
    const email = await schemaForm.getField('Work email');
    expect([await email.isRequired(), await email.isInvalid(), await schemaForm.getErrors()]).toEqual([
      true,
      false,
      [],
    ]);

    const input = await email.getControl('input');
    await input.focus();
    await input.blur();

    expect(await email.isInvalid()).toBe(true);
    expect(await email.getErrors()).toEqual(['Enter your work address.']);

    const bio = await schemaForm.getControl('Bio', 'textarea');
    await bio.focus();
    await bio.blur();

    expect(await schemaForm.getErrors()).toEqual(['Enter your work address.', 'Say something.']);
    const invalid = await schemaForm.getFields({ invalid: true });
    expect(await Promise.all(invalid.map(field => field.getLabel()))).toEqual(['Work email', 'Bio']);
  });

  it('reads the hint, the grid and each span', async () => {
    const email = await schemaForm.getField('Work email');
    const bio = await schemaForm.getField('Bio');

    expect([await email.getHint(), await email.getSpan(), await bio.getSpan(), await schemaForm.getColumns()]).toEqual([
      'Work address only.',
      1,
      2,
      2,
    ]);

    fixture.componentInstance.columns.set(1);
    await fixture.whenStable();

    // A span is clamped to the columns there are.
    expect([await bio.getSpan(), await schemaForm.getColumns()]).toEqual([1, 1]);
  });

  it('narrows fields by kind, and forms by a field they draw', async () => {
    const selects = await loader.getAllHarnesses(WrSchemaFormFieldHarness.with({ kind: 'select' }));

    expect(await Promise.all(selects.map(field => field.getLabel()))).toEqual(['Access level']);
    expect((await loader.getAllHarnesses(WrSchemaFormHarness.with({ fieldLabel: 'Bio' }))).length).toBe(1);
    expect(await loader.getAllHarnesses(WrSchemaFormHarness.with({ fieldLabel: 'Password' }))).toEqual([]);
  });
});
