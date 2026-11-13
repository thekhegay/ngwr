/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, metadata, schema } from '@angular/forms/signals';

import type { WrDateRange } from 'ngwr/date-picker';
import { WR_FIELD } from 'ngwr/form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrSchemaForm } from './schema-form';
import { WrSchemaFormHarness } from './testing';

interface Account {
  readonly roles: readonly string[];
  readonly labels: readonly string[];
  readonly active: WrDateRange | null;
  readonly avatar: File | null;
  readonly attachments: readonly File[];
  readonly tier: string;
  readonly score: number | null;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer', disabled: true },
];

const TIERS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

const accountSchema = schema<Account>(path => {
  metadata(path.roles, WR_FIELD, () => ({ kind: 'multiselect', options: ROLES, placeholder: 'Pick roles' }));
  metadata(path.labels, WR_FIELD, () => ({ kind: 'tags' }));
  metadata(path.active, WR_FIELD, () => ({ kind: 'daterange', label: 'Active between' }));
  metadata(path.avatar, WR_FIELD, () => ({ kind: 'file', accept: 'image/*' }));
  metadata(path.attachments, WR_FIELD, () => ({ kind: 'file', multiple: true }));
  metadata(path.tier, WR_FIELD, () => ({ kind: 'segmented', options: TIERS }));
  metadata(path.score, WR_FIELD, () => ({ kind: 'rating' }));
});

@Component({
  imports: [WrSchemaForm],
  template: `<wr-schema-form [field]="account" />`,
})
class Host {
  readonly model = signal<Account>({
    roles: ['editor'],
    labels: ['urgent', 'billing'],
    active: [new Date(2025, 0, 14), new Date(2025, 0, 20)],
    avatar: null,
    attachments: [],
    tier: 'free',
    score: 2,
  });
  readonly account = form(this.model, accountSchema);
}

/**
 * Each kind is held to both directions: what the model holds reaches the
 * control, and what the control writes reaches the model in the type the field
 * declares. The second half is the one a wrong mapping breaks without a word,
 * since `kind` is a string TypeScript cannot hold against the field.
 */
describe('WrSchemaForm kinds', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let el: HTMLElement;
  let schemaForm: WrSchemaFormHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
    schemaForm = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrSchemaFormHarness);
  });

  afterEach(() => fixture.destroy());

  const model = (): Account => fixture.componentInstance.model();

  it('draws the control each kind names', async () => {
    const fields = await schemaForm.getFields();

    expect(await Promise.all(fields.map(field => field.getKind()))).toEqual([
      'multiselect',
      'tags',
      'daterange',
      'file',
      'file',
      'segmented',
      'rating',
    ]);
    expect(el.querySelector('wr-select.wr-select--multi')).toBeTruthy();
    expect(el.querySelector('wr-select.wr-select--tag')).toBeTruthy();
    expect(el.querySelector('wr-date-range-picker')).toBeTruthy();
    expect(el.querySelectorAll('wr-file-upload')).toHaveLength(2);
    expect(el.querySelector('wr-segmented')).toBeTruthy();
    expect(el.querySelector('wr-rating')).toBeTruthy();
  });

  it('multiselect holds an array of option values', async () => {
    const roles = await schemaForm.getControl('Roles', 'multiselect');

    expect(await roles.isMultiple()).toBe(true);
    expect(await roles.getChipLabels()).toEqual(['Editor']);

    await roles.selectOption({ text: 'Admin' });
    expect(model().roles).toEqual(['editor', 'admin']);

    await roles.removeChip('Editor');
    expect(model().roles).toEqual(['admin']);
  });

  it('tags holds an array of the strings typed', async () => {
    const labels = await schemaForm.getControl('Labels', 'tags');

    expect(await labels.getChipLabels()).toEqual(['urgent', 'billing']);

    await labels.removeChip('urgent');
    expect(model().labels).toEqual(['billing']);
  });

  it('daterange holds a pair of dates, and names its group with the field label', async () => {
    const active = await schemaForm.getControl('Active between', 'daterange');

    expect(await active.getStartText()).not.toBe('');
    expect(await active.getEndText()).not.toBe('');
    // The picker names its two inputs by END, so the label has to sit on the group.
    const picker = el.querySelector('wr-date-range-picker')!;
    expect([picker.getAttribute('role'), picker.getAttribute('aria-label')]).toEqual(['group', 'Active between']);

    await active.clear();
    await active.blur('end');
    expect(model().active?.[0] ?? null).toBeNull();
    expect(model().active?.[1] ?? null).toBeNull();
  });

  it('file holds one file, or a list when the spec says multiple', async () => {
    const [avatar, attachments] = await Promise.all(
      (await schemaForm.getFields({ kind: 'file' })).map(field => field.getControl('file'))
    );
    const photo = new File(['a'], 'photo.png', { type: 'image/png' });
    const terms = new File(['b'], 'terms.pdf', { type: 'application/pdf' });

    expect([await avatar.isMultiple(), await avatar.getAccept()]).toEqual([false, 'image/*']);
    await avatar.selectFiles(photo);
    expect(model().avatar).toBe(photo);

    expect(await attachments.isMultiple()).toBe(true);
    await attachments.selectFiles(photo, terms);
    expect(model().attachments).toEqual([photo, terms]);
    // The label above names the drop zone: a `<label for>` cannot reach it.
    expect(await attachments.getLabel()).toContain('Attachments');
  });

  it('segmented holds the value of the option picked', async () => {
    const tier = await schemaForm.getControl('Tier', 'segmented');

    expect(await tier.getOptionLabels()).toEqual(['Free', 'Pro']);
    expect(await tier.getSelectedLabel()).toBe('Free');
    expect(await tier.getAccessibleName()).toBe('Tier');

    await tier.select({ label: 'Pro' });
    expect(model().tier).toBe('pro');
  });

  it('rating holds a number', async () => {
    const score = await schemaForm.getControl('Score', 'rating');

    expect(await score.getValue()).toBe(2);
    expect(await score.getLabel()).toBe('Score');

    await score.setValue(4);
    expect(model().score).toBe(4);
  });

  it('warns when a list kind sits on a field that holds no list', () => {
    TestBed.resetTestingModule();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    interface Wrong {
      readonly roles: string;
    }
    @Component({ imports: [WrSchemaForm], template: `<wr-schema-form [field]="f" />` })
    class WrongHost {
      readonly model = signal<Wrong>({ roles: 'admin' });
      readonly f = form(
        this.model,
        schema<Wrong>(path => metadata(path.roles, WR_FIELD, () => ({ kind: 'multiselect' })))
      );
    }

    TestBed.createComponent(WrongHost).detectChanges();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain(`which writes a array, but the field holds a string`);
    warn.mockRestore();
  });
});
