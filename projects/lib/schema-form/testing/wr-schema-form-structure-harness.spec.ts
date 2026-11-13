/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { applyEach, form, maxLength, metadata, minLength, required, schema } from '@angular/forms/signals';

import { WR_FIELD } from 'ngwr/form';
import { WrSchemaForm } from 'ngwr/schema-form';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSchemaFormArrayHarness } from './wr-schema-form-array-harness';
import { WrSchemaFormHarness } from './wr-schema-form-harness';
import { WrSchemaFormSectionHarness } from './wr-schema-form-section-harness';

interface Phone {
  readonly number: string;
}

interface Contact {
  readonly name: string;
  readonly phones: readonly Phone[];
}

interface Team {
  readonly title: string;
  readonly owner: string;
  readonly budget: number;
  readonly contacts: readonly Contact[];
}

const teamSchema = schema<Team>(path => {
  metadata(path.title, WR_FIELD, () => ({ kind: 'input' }));
  metadata(path.owner, WR_FIELD, () => ({
    kind: 'input',
    section: { title: 'Ownership', description: 'Who answers for it.', columns: 2 },
  }));
  metadata(path.budget, WR_FIELD, () => ({ kind: 'number', section: 'Ownership' }));

  required(path.contacts);
  minLength(path.contacts, 1, { message: 'Add a contact.' });
  maxLength(path.contacts, 2);
  metadata(path.contacts, WR_FIELD, () => ({
    kind: 'array',
    itemLabel: 'Contact',
    item: (): Contact => ({ name: '', phones: [] }),
  }));
  applyEach(path.contacts, contact => {
    required(contact.name, { message: 'Enter a name.' });
    metadata(contact.name, WR_FIELD, () => ({ kind: 'input' }));
    // A repeating group inside an item: what a class query would miscount.
    metadata(contact.phones, WR_FIELD, () => ({ kind: 'array', item: (): Phone => ({ number: '' }) }));
    applyEach(contact.phones, phone => metadata(phone.number, WR_FIELD, () => ({ kind: 'input' })));
  });
});

@Component({
  imports: [WrSchemaForm],
  template: `<wr-schema-form [field]="team" />`,
})
class Host {
  readonly model = signal<Team>({
    title: 'Core',
    owner: 'Ada',
    budget: 10,
    contacts: [{ name: 'Grace', phones: [{ number: '1' }, { number: '2' }] }],
  });
  readonly team = form(this.model, teamSchema);
}

describe('WrSchemaFormHarness sections and repeating groups', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let schemaForm: WrSchemaFormHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    schemaForm = await loader.getHarness(WrSchemaFormHarness);
  });

  afterEach(() => fixture.destroy());

  const contacts = (): readonly Contact[] => fixture.componentInstance.model().contacts;

  it('finds a section by its title and reads what it draws', async () => {
    const section = await schemaForm.getSection('Ownership');

    expect(section).toBeInstanceOf(WrSchemaFormSectionHarness);
    expect([
      await section.getTitle(),
      await section.getDescription(),
      await section.getColumns(),
      await section.getLabels(),
    ]).toEqual(['Ownership', 'Who answers for it.', 2, ['Owner', 'Budget']]);
    expect(await (await section.getFields({ kind: 'number' }))[0].getLabel()).toBe('Budget');
    expect((await loader.getAllHarnesses(WrSchemaFormSectionHarness.with({ title: /^Own/ }))).length).toBe(1);
  });

  it('refuses a title no section carries, and names the ones drawn', async () => {
    await expect(schemaForm.getSection('Billing')).rejects.toThrow(
      /no section is titled Billing. This form draws: Ownership/
    );
  });

  it('counts, adds and removes the items of the group it is asked about, not of one nested in it', async () => {
    expect(await schemaForm.getItemCount('Contacts')).toBe(1);
    // The nested group sits inside the first contact, and has two items of its own.
    expect(await schemaForm.getItemCount('Phones')).toBe(2);

    await schemaForm.addItem('Contacts');
    expect(await schemaForm.getItemCount('Contacts')).toBe(2);
    expect(contacts().map(contact => contact.name)).toEqual(['Grace', '']);

    await schemaForm.removeItem('Phones', 0);
    expect(contacts()[0].phones.map(phone => phone.number)).toEqual(['2']);
    expect(await schemaForm.getItemCount('Contacts')).toBe(2);

    await schemaForm.removeItem('Contacts', 1);
    expect(contacts().map(contact => contact.name)).toEqual(['Grace']);
  });

  it('refuses to add past maxLength and to remove under minLength, and says why', async () => {
    const group = await schemaForm.getArray('Contacts');

    expect([await group.canAdd(), await group.canRemove()]).toEqual([true, false]);
    await expect(schemaForm.removeItem('Contacts', 0)).rejects.toThrow(/Remove buttons of "Contacts" are disabled/);

    await group.add();
    expect([await group.canAdd(), await group.canRemove()]).toEqual([false, true]);
    await expect(schemaForm.addItem('Contacts')).rejects.toThrow(/Add button of "Contacts" is disabled/);
    await expect(schemaForm.removeItem('Contacts', 5)).rejects.toThrow(/"Contacts" draws 2 item\(s\)/);
    await expect(schemaForm.getItemCount('Emails')).rejects.toThrow(
      /no repeating group is labelled Emails. This form draws: Contacts, Phones, Phones/
    );
  });

  it('hands back the form of one item, and reads the group heading by heading', async () => {
    const group = await schemaForm.getArray('Contacts');
    await group.add();

    expect(group).toBeInstanceOf(WrSchemaFormArrayHarness);
    expect([await group.getLabel(), await group.isRequired(), await group.getItemTitles()]).toEqual([
      'Contacts',
      true,
      ['Contact 1', 'Contact 2'],
    ]);
    expect(await group.getRemoveName(1)).toBe('Remove Contact 2');

    const second = await schemaForm.getItem('Contacts', 1);
    await (await second.getControl('Name', 'input')).setValue('Linus');

    expect(contacts().map(contact => contact.name)).toEqual(['Grace', 'Linus']);
    expect(await second.getLabels()).toEqual(['Name']);
    // The outer form reads everything it draws, the items among it.
    expect(await schemaForm.getLabels()).toEqual(['Title', 'Owner', 'Budget', 'Name', 'Number', 'Number', 'Name']);
  });

  it('moves focus into the new item, and to Add when the last one goes', async () => {
    const phones = await schemaForm.getArray('Phones');

    await phones.add();
    const added = await (await phones.getItem(2)).getControl('Number', 'input');
    expect(await added.isFocused()).toBe(true);

    await phones.remove(2);
    expect(await phones.isAddFocused()).toBe(true);
  });

  it('separates the errors of the group from the errors of its items', async () => {
    const group = await schemaForm.getArray('Contacts');
    await group.add();
    const name = await (await group.getItem(1)).getControl('Name', 'input');
    await name.focus();
    await name.blur();

    expect(await group.getErrors()).toEqual([]);
    expect(await (await group.getItem(1)).getErrors()).toEqual(['Enter a name.']);

    fixture.componentInstance.model.update(team => ({ ...team, contacts: [] }));
    await fixture.whenStable();

    expect(await group.getErrors()).toEqual(['Add a contact.']);
    expect(await schemaForm.getErrors()).toEqual(['Add a contact.']);
  });
});
