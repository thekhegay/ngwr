import { type HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, applyEach, form } from '@angular/forms/signals';

import { WrFormField } from 'ngwr/form';
import { WrFormFieldHarness } from 'ngwr/form/testing';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';
import { WrInputHarness } from 'ngwr/input/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { wrMatches, wrNotBlank } from './rules';

interface Model {
  password: string;
  confirm: string;
  reason: string;
  note: string | null;
  strict: boolean;
}

@Component({
  imports: [FormField, WrFormField, WrInput],
  template: `
    <wr-form-field label="Password"><input wrInput [formField]="f.password" /></wr-form-field>
    <wr-form-field label="Confirm"><input wrInput [formField]="f.confirm" /></wr-form-field>
    <wr-form-field label="Reason"><input wrInput [formField]="f.reason" /></wr-form-field>
  `,
})
class Host {
  readonly model = signal<Model>({ password: '', confirm: '', reason: '', note: null, strict: true });

  readonly f = form(this.model, path => {
    wrMatches(path.confirm, path.password, { when: ctx => ctx.valueOf(path.strict) });
    wrNotBlank(path.reason);
    wrNotBlank(path.note, { message: 'Leave a note.', when: ctx => ctx.valueOf(path.strict) });
  });
}

// The app's catalog, keyed the way the reactive-forms validators already are.
const CATALOG = [
  provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
  provideWrI18nStaticLoader({
    en: { validation: { match: 'Does not match {{target}}.', required: 'Fill this in.' } },
  }),
];

describe('Signal Forms rules', () => {
  let fixture: ComponentFixture<Host>;
  let loader: HarnessLoader;

  const host = (): Host => fixture.componentInstance;
  const field = (label: string): Promise<WrFormFieldHarness> => loader.getHarness(WrFormFieldHarness.with({ label }));
  const type = async (label: string, value: string): Promise<void> => {
    const input = await (await field(label)).getHarness(WrInputHarness);
    await (value === '' ? input.clear() : input.setValue(value));
    await input.blur();
  };
  const keys = async (label: string): Promise<(string | null)[]> =>
    (await (await field(label)).getErrors()).map(error => error.key);

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: CATALOG });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  describe('wrMatches', () => {
    it('reports `match` while the two values differ, and clears when they agree', async () => {
      await type('Password', 'hunter22');
      await type('Confirm', 'hunter2');

      expect(await keys('Confirm')).toEqual(['match']);
      expect(await (await field('Confirm')).getErrorText('match')).toBe('Does not match password.');
      expect(host().f.confirm().errors()).toEqual([expect.objectContaining({ kind: 'match', target: 'password' })]);
      expect(host().f().valid()).toBe(false);

      await type('Confirm', 'hunter22');

      expect(await keys('Confirm')).toEqual([]);
      expect(host().f.confirm().valid()).toBe(true);
    });

    it('re-validates when the other field changes', async () => {
      await type('Password', 'one');
      await type('Confirm', 'one');
      expect(await keys('Confirm')).toEqual([]);

      await type('Password', 'two');
      expect(await keys('Confirm')).toEqual(['match']);
      // The error is the confirmation's alone.
      expect(await keys('Password')).toEqual([]);

      await type('Password', 'one');
      expect(await keys('Confirm')).toEqual([]);
    });

    it('is silent while its own field is empty', async () => {
      await type('Password', 'hunter22');
      await type('Confirm', '');

      expect(host().f.confirm().errors()).toEqual([]);
    });

    it('carries no value in the error', async () => {
      await type('Password', 'hunter22');
      await type('Confirm', 'nope');

      expect({ ...host().f.confirm().errors()[0], fieldTree: undefined }).toEqual({
        kind: 'match',
        target: 'password',
      });
    });

    it('stands down while `when` is false', async () => {
      await type('Password', 'a');
      await type('Confirm', 'b');
      expect(host().f.confirm().valid()).toBe(false);

      host().model.update(model => ({ ...model, strict: false }));
      expect(host().f.confirm().valid()).toBe(true);
    });

    it('carries its own message, and works on the items of an array', () => {
      TestBed.runInInjectionContext(() => {
        const model = signal({ rows: [{ a: 'x', b: 'y' }] });
        const rows = form(model, path => {
          applyEach(path.rows, item => {
            wrMatches(item.b, item.a, { message: ctx => `Not ${ctx.valueOf(item.a)}.` });
          });
        });

        expect(rows.rows[0].b().errors()).toEqual([
          expect.objectContaining({ kind: 'match', target: 'a', message: 'Not x.' }),
        ]);

        rows.rows[0].a().value.set('y');
        expect(rows.rows[0].b().errors()).toEqual([]);
      });
    });
  });

  describe('wrNotBlank', () => {
    it('reports `required` for spaces alone, and clears on a real value', async () => {
      await type('Reason', '   ');

      expect(await keys('Reason')).toEqual(['required']);
      expect(await (await field('Reason')).getErrorText('required')).toBe('Fill this in.');

      await type('Reason', ' late ');
      expect(await keys('Reason')).toEqual([]);
      expect(host().f.reason().valid()).toBe(true);
    });

    it('reports one error for an empty string, and for null', async () => {
      expect(host().f.reason().errors()).toHaveLength(1);
      expect(host().f.reason().errors()[0].kind).toBe('required');
      expect(host().f.note().errors()).toHaveLength(1);
      expect(host().f.note().errors()[0].kind).toBe('required');

      await type('Reason', '');
      expect(await keys('Reason')).toEqual(['required']);
    });

    it('refuses tabs and line breaks too', () => {
      host().f.reason().value.set('\t\n ');
      expect(
        host()
          .f.reason()
          .errors()
          .map(error => error.kind)
      ).toEqual(['required']);
    });

    it('marks the field required', () => {
      expect(host().f.reason().required()).toBe(true);
    });

    it('carries its own message, for spaces as for an empty value', () => {
      expect(host().f.note().errors()[0].message).toBe('Leave a note.');

      host().f.note().value.set('  ');
      expect(
        host()
          .f.note()
          .errors()
          .map(error => error.message)
      ).toEqual(['Leave a note.']);
    });

    it('stands down while `when` is false', () => {
      host().f.note().value.set('  ');
      host().model.update(model => ({ ...model, strict: false }));

      expect(host().f.note().valid()).toBe(true);
      expect(host().f.note().required()).toBe(false);
    });
  });
});
