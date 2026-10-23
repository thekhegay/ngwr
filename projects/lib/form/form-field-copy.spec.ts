import { Component, type EnvironmentProviders, PLATFORM_ID, type Provider } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { WrInput } from 'ngwr/input';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WrFormError, WrFormField } from './form-field';

/**
 * ngwr ships no error texts. A message `<wr-form-field>` renders on its own comes
 * from the validator's payload or from the APP's catalog, and a key neither
 * answers renders nothing — with one dev-mode warning saying where copy goes.
 *
 * Driven through reactive forms on purpose: the Signal Forms half of the same
 * contract is in the harness spec, and a classic payload is where a `message`
 * is least expected, so it is the side worth pinning on its own.
 */
@Component({
  imports: [ReactiveFormsModule, WrFormError, WrFormField, WrInput],
  template: `
    <wr-form-field label="Name" data-k="name"><input wrInput [formControl]="name" /></wr-form-field>
    <wr-form-field label="Nickname" data-k="nickname"><input wrInput [formControl]="nickname" /></wr-form-field>
    <wr-form-field label="Handle" data-k="handle">
      <input wrInput [formControl]="handle" />
      <wr-form-error key="taken">Pick another handle.</wr-form-error>
    </wr-form-field>
    <wr-form-field label="Quiet" data-k="quiet" [autoErrors]="false">
      <input wrInput [formControl]="quiet" />
    </wr-form-field>
    <wr-form-field data-k="unlabelled"><input wrInput [formControl]="unlabelled" /></wr-form-field>
  `,
})
class Host {
  readonly name = new FormControl('');
  readonly nickname = new FormControl('');
  readonly handle = new FormControl('');
  readonly quiet = new FormControl('');
  readonly unlabelled = new FormControl('');
}

type Fixture = ComponentFixture<Host>;
type ControlName = 'name' | 'nickname' | 'handle' | 'quiet' | 'unlabelled';

const CATALOG = [
  provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
  provideWrI18nStaticLoader({
    en: { validation: { required: 'Please fill this in.', minlength: 'At least {{requiredLength}} characters.' } },
  }),
];

describe('WrFormField — where its copy comes from', () => {
  let fixture: Fixture;

  const mount = async (providers: (Provider | EnvironmentProviders)[] = []): Promise<Fixture> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // The static loader resolves asynchronously even for an object literal.
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  /** Raise errors on a control and open the touched gate, the way a blur would. */
  const fail = (key: ControlName, errors: Record<string, unknown>): void => {
    const control = fixture.componentInstance[key];
    control.setErrors(errors);
    control.markAsTouched();
    fixture.detectChanges();
  };

  const field = (key: ControlName): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`wr-form-field[data-k="${key}"]`)!;
  const shown = (key: ControlName): string[] =>
    [...field(key).querySelectorAll('.wr-form-field__error:not(.wr-form-field__error--hidden)')].map(
      el => el.textContent?.trim() ?? ''
    );

  /** The field's own dev-mode reports, out of whatever else the run logged. */
  const reportsIn = (warn: { mock: { calls: unknown[][] } }): string[] =>
    warn.mock.calls.map(([text]) => String(text)).filter(text => text.includes('<wr-form-field>'));

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('renders the message a classic validator carries on its payload', async () => {
    await mount();
    const name = fixture.componentInstance.name;
    name.setValidators(() => ({ taken: { message: 'That name is taken.' } }));
    name.updateValueAndValidity();
    name.markAsTouched();
    fixture.detectChanges();

    expect(shown('name')).toEqual(['That name is taken.']);
  });

  it('reads validation.<key> from the app catalog, filled from the payload', async () => {
    await mount(CATALOG);
    const name = fixture.componentInstance.name;
    name.setValue('Ada');
    name.setValidators(Validators.minLength(5));
    name.updateValueAndValidity();
    name.markAsTouched();
    fixture.detectChanges();

    expect(shown('name')).toEqual(['At least 5 characters.']);
  });

  it('prefers the payload’s own message to the catalog', async () => {
    await mount(CATALOG);
    fail('name', { required: { message: 'Name, please.' } });

    expect(shown('name')).toEqual(['Name, please.']);
  });

  it('lets projected markup claim its key over both', async () => {
    await mount(CATALOG);
    fail('handle', { taken: { message: 'That handle is taken.' } });

    expect(shown('handle')).toEqual(['Pick another handle.']);
  });

  it('ignores a blank message rather than rendering an empty line', async () => {
    await mount(CATALOG);
    fail('name', { required: { message: '   ' } });

    expect(shown('name')).toEqual(['Please fill this in.']);
  });

  it('renders nothing for a key no source answers, and warns once per field and key', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount();

    fail('name', { required: true });
    fail('nickname', { required: true });

    expect(shown('name')).toEqual([]);
    expect(field('name').classList.contains('wr-form-field--invalid')).toBe(true);

    // The same key raised again is a fresh payload, re-resolved — and not re-reported.
    fail('name', { required: true });
    fail('nickname', { required: true });

    const reports = reportsIn(warn);
    expect(reports).toHaveLength(2);
    expect(reports[0]).toContain('"Name"');
    expect(reports[1]).toContain('"Nickname"');
    expect(reports[0]).toContain('{ message }');
    expect(reports[0]).toContain('"validation.required"');
    expect(reports[0]).toContain('<wr-form-error key="required">');

    // A second key on the same field is a report of its own.
    fail('name', { required: true, pattern: { requiredPattern: '^x' } });
    expect(reportsIn(warn)).toHaveLength(3);
    expect(reportsIn(warn)[2]).toContain('"pattern"');
  });

  it('names a field with no label by the id its label would point at', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount();
    fail('unlabelled', { required: true });

    const id = field('unlabelled').querySelector('input')!.id;
    expect(reportsIn(warn)).toEqual([expect.stringContaining(`#${id}`)]);
  });

  it('says nothing for a key the markup claims, or while auto copy is off', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount();
    fail('handle', { taken: true });
    fail('quiet', { required: true });

    expect(shown('handle')).toEqual(['Pick another handle.']);
    expect(shown('quiet')).toEqual([]);
    expect(reportsIn(warn)).toEqual([]);
  });

  it('warns once per key on the server, however many fields and renders miss it', async () => {
    // A key no other case uses: the server memo outlives every fixture, which is the
    // point of it — each prerendered route builds its fields again.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const server = [{ provide: PLATFORM_ID, useValue: 'server' }];

    await mount(server);
    fail('name', { serverOnly: true });
    fail('nickname', { serverOnly: true });
    fixture.destroy();

    await mount(server);
    fail('name', { serverOnly: true });

    expect(reportsIn(warn)).toHaveLength(1);
  });
});
