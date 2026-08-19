import { type HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, type EnvironmentProviders, type Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';

import { WrFormError, WrFormField, WrFormItem, provideWrFormErrors } from 'ngwr/form';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { WrInput } from 'ngwr/input';
import { WrInputHarness } from 'ngwr/input/testing';
import { WrInputNumber } from 'ngwr/input-number';
import { WrInputNumberHarness } from 'ngwr/input-number/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFormFieldHarness } from './wr-form-field-harness';
import { WrFormItemHarness } from './wr-form-item-harness';

/**
 * Three fields, one per path through the copy chain: `Email` answers from the
 * consumer's own markup, `Display name` from whatever the field resolves, and
 * `Bio` from a validator key nothing has copy for.
 *
 * Signal Forms bound straight to `[wrInput]`, because that is how a consumer
 * writes it — and because the gate the whole component sits behind (touched or
 * dirty) can then be opened the way a user opens it.
 */
@Component({
  imports: [FormField, WrFormError, WrFormField, WrInput],
  template: `
    <wr-form-field label="Email" hint="We'll never share it." required>
      <input wrInput [formField]="profile.email" />
      <wr-form-error key="required">Email is required.</wr-form-error>
      <wr-form-error key="email">That isn't a valid email.</wr-form-error>
    </wr-form-field>

    <wr-form-field label="Display name" [autoErrors]="autoErrors()">
      <input wrInput [formField]="profile.name" />
    </wr-form-field>

    <wr-form-field label="Bio" optional>
      <input wrInput [formField]="profile.bio" />
    </wr-form-field>
  `,
})
class Host {
  readonly autoErrors = signal(true);

  private readonly model = signal({ email: '', name: '', bio: '' });

  readonly profile = form(this.model, path => {
    required(path.email);
    email(path.email);
    required(path.name);
    minLength(path.bio, 10);
  });
}

describe('WrFormFieldHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: HarnessLoader;

  const host = (): Host => fixture.componentInstance;
  const field = (label: string): Promise<WrFormFieldHarness> => loader.getHarness(WrFormFieldHarness.with({ label }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every field, and reads a label with no marker glued to it', async () => {
    const all = await loader.getAllHarnesses(WrFormFieldHarness);

    // The `*` and `(optional)` live INSIDE the `<label>`, so without excluding them
    // these read 'Email *' and 'Bio (optional)' and every equality assertion has to
    // know which marker a field happens to carry.
    expect(await Promise.all(all.map(one => one.getLabel()))).toEqual(['Email', 'Display name', 'Bio']);
  });

  it('reports the required and optional markers, and narrows by required', async () => {
    const emailField = await field('Email');
    expect(await emailField.isRequired()).toBe(true);
    expect(await emailField.isOptional()).toBe(false);

    const bio = await field('Bio');
    expect(await bio.isRequired()).toBe(false);
    expect(await bio.isOptional()).toBe(true);

    const requiredFields = await loader.getAllHarnesses(WrFormFieldHarness.with({ required: true }));
    expect(await Promise.all(requiredFields.map(one => one.getLabel()))).toEqual(['Email']);
  });

  it('shows the hint until an error takes its slot, and never announces it', async () => {
    const emailField = await field('Email');
    expect(await emailField.getHint()).toBe("We'll never share it.");

    // The hint is on screen and deliberately NOT described: the field points
    // `aria-describedby` at the error block only, and the hint carries no id.
    // Wiring it in is not a harness's call to make either — `[wrInput]` derives
    // `aria-invalid` from that same signal, so a described hint would announce
    // every hinted field as invalid.
    expect(await emailField.getDescribedByIds()).toEqual([]);
    expect(await emailField.getAnnouncedDescription()).toBeNull();

    const byHint = await loader.getHarness(WrFormFieldHarness.with({ hint: /never share/ }));
    expect(await byHint.getLabel()).toBe('Email');

    await emailField.blurControl();
    // Not "the consumer set no hint" — the error block took its place outright.
    expect(await emailField.getHint()).toBeNull();
  });

  it('renders nothing while the control is untouched and pristine', async () => {
    const emailField = await field('Email');

    expect(await emailField.isInvalid()).toBe(false);
    expect(await emailField.isControlInvalid()).toBe(false);
    expect(await emailField.getErrors()).toEqual([]);
    expect(await emailField.hasEmptyErrorBlock()).toBe(false);
    await expect(emailField.getErrorText('required')).rejects.toThrow(/untouched and pristine/);
  });

  it('opens the gate on blur, and the consumer’s own copy answers for its key', async () => {
    const emailField = await field('Email');
    await emailField.blurControl();

    expect(await emailField.isInvalid()).toBe(true);
    expect(await emailField.getErrors()).toEqual([
      { key: 'required', text: 'Email is required.', source: 'projected' },
    ]);
    expect(await emailField.getErrorTexts()).toEqual(['Email is required.']);
    expect(await emailField.getErrorText('required')).toBe('Email is required.');

    // The other sentence never left the DOM — it is sitting next to the live one
    // wearing `--hidden`, which is exactly why a spec must not query
    // `.wr-form-error` itself.
    expect(await emailField.getSuppressedErrorKeys()).toEqual(['email']);
    await expect(emailField.getErrorText('email')).rejects.toThrow(/Showing: required/);
  });

  it('wires the live message to the control for a screen reader', async () => {
    const emailField = await field('Email');
    await emailField.blurControl();

    expect(await emailField.getDescribedByIds()).toEqual([`${await emailField.getControlId()}-errors`]);
    expect(await emailField.getAnnouncedDescription()).toBe('Email is required.');
    expect(await emailField.isControlInvalid()).toBe(true);

    // The control's own harness agrees, reached through this field rather than by a
    // selector — `aria-invalid` is the half of the contract the field cannot render
    // itself, since it has no way to reach the control it projects.
    expect(await (await emailField.getHarness(WrInputHarness)).isInvalid()).toBe(true);
  });

  it('swaps to the copy for the key that is failing now', async () => {
    const emailField = await field('Email');
    // Typing is the other way through the gate: a value change marks the control
    // dirty, so no blur is needed here.
    await (await emailField.getHarness(WrInputHarness)).setValue('nope');

    expect(await emailField.getErrorTexts()).toEqual(["That isn't a valid email."]);
    expect(await emailField.getSuppressedErrorKeys()).toEqual(['required']);
    expect(await emailField.getAnnouncedDescription()).toBe("That isn't a valid email.");
  });

  it('narrows by the visible message and by the invalid state', async () => {
    await (await field('Email')).blurControl();

    const byText = await loader.getAllHarnesses(WrFormFieldHarness.with({ errorText: 'Email is required.' }));
    expect(await Promise.all(byText.map(one => one.getLabel()))).toEqual(['Email']);

    const invalid = await loader.getAllHarnesses(WrFormFieldHarness.with({ invalid: true }));
    expect(await Promise.all(invalid.map(one => one.getLabel()))).toEqual(['Email']);

    // The suppressed sentence is not matchable: the filter reads the copy the user
    // can see, not everything the markup shipped.
    const bySuppressed = await loader.getAllHarnesses(WrFormFieldHarness.with({ errorText: /valid email/ }));
    expect(bySuppressed.length).toBe(0);
  });

  it('gives a field with no <wr-form-error> a message anyway', async () => {
    const name = await field('Display name');
    await name.blurControl();

    // The zero-configuration case, and the component's whole reason for existing:
    // no markup, no app catalog, no i18n catalog, and the user still gets a
    // sentence. `resolved` is as precise as the DOM can be — the three links in the
    // chain render the identical element.
    expect(await name.getErrors()).toEqual([{ key: 'required', text: 'This field is required.', source: 'resolved' }]);
    expect(await name.getAnnouncedDescription()).toBe('This field is required.');
    expect(await name.isControlInvalid()).toBe(true);
  });

  it('reports a field left red with nothing to read when auto copy is off', async () => {
    host().autoErrors.set(false);
    fixture.detectChanges();

    const name = await field('Display name');
    await name.blurControl();

    expect(await name.isInvalid()).toBe(true);
    expect(await name.getErrorTexts()).toEqual([]);
    expect(await name.hasEmptyErrorBlock()).toBe(true);
    // The block still exists and is still described, so a screen reader is sent to
    // an element with nothing in it. That is the failure the named check is for:
    // the field goes red either way, which is what makes it survive review.
    expect(await name.getAnnouncedDescription()).toBe('');
  });

  it('reports the same emptiness for a key nothing in the chain has copy for', async () => {
    const bio = await field('Bio');
    await (await bio.getHarness(WrInputHarness)).setValue('too short');

    expect(await bio.isInvalid()).toBe(true);
    // Signal Forms reports this error as `minLength`; every link in the copy chain
    // knows Angular's lowercase `minlength` and nothing else, so nothing answers and
    // the block renders empty. Pinned rather than fixed here — the copy tables live
    // outside this entry point — and it is the one shape of this bug a consumer can
    // hit without opting out of anything.
    expect(await bio.getErrorTexts()).toEqual([]);
    expect(await bio.hasEmptyErrorBlock()).toBe(true);
    expect(await bio.getAnnouncedDescription()).toBe('');
  });

  it('links the label to the control it wraps, one id per field', async () => {
    const emailField = await field('Email');
    const name = await field('Display name');

    expect(await emailField.isLabelLinkedToControl()).toBe(true);
    expect(await emailField.getLabelFor()).toBe(await emailField.getControlId());
    expect(await emailField.getLabelFor()).toMatch(/^wr-form-field-\d+$/);

    expect(await name.isLabelLinkedToControl()).toBe(true);
    expect(await name.getLabelFor()).not.toBe(await emailField.getLabelFor());
  });

  it('keeps two invalid fields’ copy apart', async () => {
    const emailField = await field('Email');
    const name = await field('Display name');
    await emailField.blurControl();
    await name.blurControl();

    expect(await emailField.isInvalid()).toBe(true);
    expect(await name.isInvalid()).toBe(true);

    // The list path: every message-collecting call is scoped to its own field.
    expect(await emailField.getErrorTexts()).toEqual(['Email is required.']);
    expect(await name.getErrorTexts()).toEqual(['This field is required.']);
    expect(await emailField.getSuppressedErrorKeys()).toEqual(['email']);
    expect(await name.getSuppressedErrorKeys()).toEqual([]);

    // The single-element path, including the two calls that resolve an ID —
    // `for` and `aria-describedby`. Ids are document-global, so a lookup that went
    // through `getElementById` would answer with whichever field got there first,
    // and both of these assertions would pass on the wrong sentence.
    expect(await emailField.getLabel()).toBe('Email');
    expect(await name.getLabel()).toBe('Display name');
    expect(await emailField.getErrorText('required')).toBe('Email is required.');
    expect(await name.getErrorText('required')).toBe('This field is required.');
    expect(await emailField.getAnnouncedDescription()).toBe('Email is required.');
    expect(await name.getAnnouncedDescription()).toBe('This field is required.');
    expect(await emailField.isLabelLinkedToControl()).toBe(true);
    expect(await name.isLabelLinkedToControl()).toBe(true);

    // And the content loader too: writing through one field's control must not be
    // visible from the other's.
    await (await emailField.getHarness(WrInputHarness)).setValue('ada@example.test');
    expect(await (await name.getHarness(WrInputHarness)).getValue()).toBe('');
  });

  it('moves focus to the control it wraps, and lets go of it', async () => {
    const emailField = await field('Email');
    const input = await emailField.getHarness(WrInputHarness);

    await emailField.focusControl();
    expect(await input.isFocused()).toBe(true);

    await emailField.blurControl();
    expect(await input.isFocused()).toBe(false);
  });

  it('refuses to shrug off a description that points at nothing', async () => {
    const emailField = await field('Email');
    await emailField.blurControl();

    // Manufactured, because the component cannot get here on its own: it stamps the
    // block's id and the control's `aria-describedby` from the same signal. The
    // guard still has to be loud — a dangling reference answering `''` reads as an
    // empty message, which is a different bug with a different fix.
    (fixture.nativeElement as HTMLElement).querySelector('.wr-form-field__errors')?.removeAttribute('id');

    expect(await emailField.getDescribedByIds()).toHaveLength(1);
    await expect(emailField.getAnnouncedDescription()).rejects.toThrow(/not an element anywhere in the document/);
  });
});

/**
 * The three ways a field ends up with no working label link — and they all render
 * exactly like a healthy field, which is why they need a harness to see.
 */
@Component({
  imports: [WrFormField, WrInput],
  template: `
    <wr-form-field label="Nickname" hint="Shown on your profile"><input /></wr-form-field>
    <wr-form-field required><input wrInput /></wr-form-field>
    <wr-form-field label="Notes">just text</wr-form-field>
    <wr-form-field label="Elsewhere" controlId="a-control-somewhere-else"><span>not a control</span></wr-form-field>
    <input id="a-control-somewhere-else" aria-label="Sitting outside every field" />
  `,
})
class LooseHost {}

describe('WrFormFieldHarness — fields with no working control link', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<LooseHost>>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(LooseHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('catches a label whose `for` names nothing', async () => {
    const nickname = await loader.getHarness(WrFormFieldHarness.with({ label: 'Nickname' }));

    // A bare `<input>` adopts nothing, so the generated id the label points at
    // exists nowhere. The field looks completely normal and is unlabelled — this is
    // the break the harness exists for, and no `aria-label` check would see it.
    expect(await nickname.getLabelFor()).toMatch(/^wr-form-field-\d+$/);
    expect(await nickname.isLabelLinkedToControl()).toBe(false);
    expect(await nickname.getControlId()).toBeNull();
    expect(await nickname.getDescribedByIds()).toEqual([]);
    expect(await nickname.getHint()).toBe('Shown on your profile');
  });

  it('answers for a field with no label at all, and narrows by that', async () => {
    const unlabelled = await loader.getHarness(WrFormFieldHarness.with({ label: null }));

    expect(await unlabelled.getLabel()).toBeNull();
    expect(await unlabelled.getLabelFor()).toBeNull();
    expect(await unlabelled.isLabelLinkedToControl()).toBe(false);
    // `required` still answers: the modifier is on the host whether or not there is
    // a label for the `*` to hang on.
    expect(await unlabelled.isRequired()).toBe(true);
    expect(await unlabelled.isOptional()).toBe(false);
    // And the control is still found, by falling back to the first native control in
    // the slot — it adopted the field's id even with no label rendered.
    expect(await unlabelled.getControlId()).toMatch(/^wr-form-field-\d+$/);
  });

  it('catches a `for` that names a real element outside the field', async () => {
    const elsewhere = await loader.getHarness(WrFormFieldHarness.with({ label: 'Elsewhere' }));

    // The id resolves — just not to anything this field wraps. A `getElementById`
    // -style lookup would answer with the input sitting outside and call the field
    // labelled, which is exactly what the slot scoping is for. Same shape as a
    // control that was moved out of the field, or a `for` naming a SIBLING field's
    // control: document-global ids make all three look healthy.
    expect(await elsewhere.getLabelFor()).toBe('a-control-somewhere-else');
    expect(await elsewhere.isLabelLinkedToControl()).toBe(false);
  });

  it('says so when a field wraps no control at all', async () => {
    const notes = await loader.getHarness(WrFormFieldHarness.with({ label: 'Notes' }));

    expect(await notes.getLabel()).toBe('Notes');
    // Everything that needs a control names the cause instead of answering `null`,
    // which three lines later would look like a control with no ARIA on it.
    await expect(notes.getControlId()).rejects.toThrow(/wraps no control/);
    await expect(notes.getDescribedByIds()).rejects.toThrow(/wraps no control/);
    await expect(notes.blurControl()).rejects.toThrow(/wraps no control/);
  });
});

/**
 * The copy chain, one link at a time — app catalog, then the i18n catalog, then
 * the built-in sentence the first describe already covers. Every one of them
 * renders the same element, so what these cases pin is the ORDER and the text,
 * which is all the DOM has to offer.
 */
describe('WrFormFieldHarness — the copy chain', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const catalog = provideWrI18nStaticLoader({ en: { validation: { required: 'Please fill this in.' } } });
  const appCopy = provideWrFormErrors({ required: ({ label }) => `${label} is required.` });

  const mount = async (providers: (Provider | EnvironmentProviders)[]): Promise<HarnessLoader> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // The static loader resolves asynchronously even for an object literal.
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    return TestbedHarnessEnvironment.loader(fixture);
  };

  afterEach(() => fixture.destroy());

  it('takes the app catalog’s wording, and hands it the field’s label', async () => {
    const loader = await mount([appCopy]);
    const name = await loader.getHarness(WrFormFieldHarness.with({ label: 'Display name' }));
    await name.blurControl();

    // A message function is handed the field's own label, which is the only reason
    // one app-wide sentence can name every field it lands on.
    expect(await name.getErrors()).toEqual([
      { key: 'required', text: 'Display name is required.', source: 'resolved' },
    ]);

    // Per-field markup still wins over app-wide copy — and unlike the app catalog,
    // THAT difference the DOM can see.
    const emailField = await loader.getHarness(WrFormFieldHarness.with({ label: 'Email' }));
    await emailField.blurControl();
    expect(await emailField.getErrors()).toEqual([
      { key: 'required', text: 'Email is required.', source: 'projected' },
    ]);
  });

  it('reads the i18n catalog when the app names no override', async () => {
    const loader = await mount([provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }), catalog]);
    const name = await loader.getHarness(WrFormFieldHarness.with({ label: 'Display name' }));
    await name.blurControl();

    expect(await name.getErrorText('required')).toBe('Please fill this in.');
    expect(await name.getAnnouncedDescription()).toBe('Please fill this in.');
  });

  it('lets the app catalog win over the i18n catalog', async () => {
    const loader = await mount([provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }), catalog, appCopy]);
    const name = await loader.getHarness(WrFormFieldHarness.with({ label: 'Display name' }));
    await name.blurControl();

    expect(await name.getErrorText('required')).toBe('Display name is required.');
    // Same element, same `source`, three different sentences: reading `source` to
    // find out WHICH link answered is the one thing this harness cannot do, and the
    // JSDoc says so rather than guessing.
    expect((await name.getErrors())[0].source).toBe('resolved');
  });
});

/**
 * A component control rather than a bare `<input>`: the id the field generates
 * lands on `<wr-input-number>`'s own inner `<input>`, so the label points DOWN
 * into the component. A harness that only looked at the slot's immediate children
 * would report this field as unlabelled.
 */
@Component({
  imports: [FormField, WrFormField, WrInputNumber],
  template: `
    <wr-form-field label="Quantity" hint="Boxes per pallet">
      <wr-input-number [formField]="order.qty" />
    </wr-form-field>
  `,
})
class NumberHost {
  private readonly model = signal<{ qty: number | null }>({ qty: null });

  readonly order = form(this.model, path => {
    required(path.qty);
  });
}

describe('WrFormFieldHarness — around a component control', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NumberHost>>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(NumberHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('names the control inside the component, not the component element', async () => {
    const qty = await loader.getHarness(WrFormFieldHarness);
    const inner = (fixture.nativeElement as HTMLElement).querySelector('wr-input-number input');

    expect(await qty.getLabelFor()).toBe(inner?.getAttribute('id'));
    expect(await qty.getControlId()).toBe(inner?.getAttribute('id'));
    expect(await qty.isLabelLinkedToControl()).toBe(true);
  });

  it('resolves a message for it, and composes with its own harness', async () => {
    const qty = await loader.getHarness(WrFormFieldHarness);
    const number = await qty.getHarness(WrInputNumberHarness);
    expect(await number.getValue()).toBeNull();

    // Blurring the inner input is what makes `<wr-input-number>` emit `touch`,
    // which is how a custom control marks a bound field touched — the DOM blur
    // event alone means nothing to Signal Forms here.
    await qty.blurControl();
    expect(await qty.getErrorTexts()).toEqual(['This field is required.']);
    expect(await qty.getAnnouncedDescription()).toBe('This field is required.');
    expect(await qty.isControlInvalid()).toBe(true);

    await number.setValue(4);
    expect(await qty.isInvalid()).toBe(false);
    expect(await qty.isControlInvalid()).toBe(false);
    // With the error gone the hint has its slot back.
    expect(await qty.getHint()).toBe('Boxes per pallet');
  });
});

/**
 * Two fields where "the control" is not what the obvious query answers with: one
 * with an unbound `<select>` sitting in front of the real control, and one whose
 * control wires no ARIA back at all.
 */
@Component({
  imports: [FormField, WrFormField, WrInput],
  template: `
    <wr-form-field label="Phone">
      <select aria-label="Country code">
        <option>+1</option>
      </select>
      <input wrInput [formField]="contact.phone" />
    </wr-form-field>

    <wr-form-field label="Raw"><input [formField]="contact.raw" /></wr-form-field>
  `,
})
class CompositeHost {
  private readonly model = signal({ phone: '', raw: '' });

  readonly contact = form(this.model, path => {
    required(path.phone);
    required(path.raw);
  });
}

describe('WrFormFieldHarness — when the control is not the obvious element', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CompositeHost>>;
  let loader: HarnessLoader;

  const field = (label: string): Promise<WrFormFieldHarness> => loader.getHarness(WrFormFieldHarness.with({ label }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(CompositeHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('follows the label to the bound control, past the first native one in the slot', async () => {
    const phone = await field('Phone');

    // A country-code `<select>` is the first `input, select, textarea` in the slot,
    // and it is not the control: it adopted no id, reads no `aria-invalid`, and
    // blurring it marks nothing touched. The label's `for` is what says which
    // element the field is actually about.
    expect(await phone.getControlId()).toBe(await phone.getLabelFor());
    expect(await phone.getControlId()).toMatch(/^wr-form-field-\d+$/);

    await phone.blurControl();
    expect(await phone.isInvalid()).toBe(true);
    expect(await phone.getErrorTexts()).toEqual(['This field is required.']);
    expect(await phone.isControlInvalid()).toBe(true);
  });

  it('reports a field that went red while its control stayed silent', async () => {
    const raw = await field('Raw');
    await raw.blurControl();

    // A bare `<input [formField]>` with no `[wrInput]`: the field discovers the
    // control and paints the error, but nothing wires the reverse direction, so
    // assistive technology is told nothing at all. The two readings come from
    // different elements, and this is the case that proves it — collapse
    // `isControlInvalid()` into the host's modifier and this is what stops failing.
    expect(await raw.isInvalid()).toBe(true);
    expect(await raw.getErrorTexts()).toEqual(['This field is required.']);
    expect(await raw.isControlInvalid()).toBe(false);
    expect(await raw.getDescribedByIds()).toEqual([]);
    expect(await raw.getAnnouncedDescription()).toBeNull();
    expect(await raw.isLabelLinkedToControl()).toBe(false);
  });
});

/**
 * A field inside another field's control slot. The outer one discovers the SAME
 * `NgControl` through content projection, so both go red together — but each must
 * answer with its own copy, its own hint and its own label.
 */
@Component({
  imports: [FormField, WrFormError, WrFormField, WrInput],
  template: `
    <wr-form-field label="Address" hint="Two lines are enough" [autoErrors]="false">
      <wr-form-error key="required">Street and city, please.</wr-form-error>
      <wr-form-field label="City" hint="No postcode here">
        <input wrInput [formField]="place.city" />
      </wr-form-field>
    </wr-form-field>
  `,
})
class NestedHost {
  private readonly model = signal({ city: '' });

  readonly place = form(this.model, path => {
    required(path.city);
  });
}

describe('WrFormFieldHarness — a field nested in a field', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<NestedHost>>;
  let loader: HarnessLoader;

  const field = (label: string): Promise<WrFormFieldHarness> => loader.getHarness(WrFormFieldHarness.with({ label }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads each field’s own label and hint', async () => {
    // The inner hint sits INSIDE the outer field's control slot, so it comes first
    // in document order — an unanchored `.wr-form-field__hint` query hands the
    // outer field the inner one's words.
    expect(await (await field('Address')).getHint()).toBe('Two lines are enough');
    expect(await (await field('City')).getHint()).toBe('No postcode here');
  });

  it('keeps the inner field’s copy out of the outer field’s answer', async () => {
    const outer = await field('Address');
    const inner = await field('City');
    await inner.blurControl();

    // `contentChild(NgControl)` reaches all the way down, so the outer field is
    // invalid for the inner field's error and shows the sentence IT was given.
    expect(await outer.isInvalid()).toBe(true);
    expect(await outer.getErrorTexts()).toEqual(['Street and city, please.']);
    expect(await inner.getErrorTexts()).toEqual(['This field is required.']);
    expect(await outer.getSuppressedErrorKeys()).toEqual([]);
  });
});

@Component({
  imports: [WrFormError, WrFormItem, WrInput],
  template: `
    <wr-form-item [hasError]="bad()">
      <label for="signup-email">Email</label>
      <input wrInput id="signup-email" />
      <wr-form-error key="required">Invalid email</wr-form-error>
    </wr-form-item>

    <wr-form-item>
      <label for="signup-bio">Bio</label>
      <input wrInput id="signup-bio" />
    </wr-form-item>
  `,
})
class ItemHost {
  readonly bad = signal(false);
}

describe('WrFormItemHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ItemHost>>;
  let loader: HarnessLoader;

  const item = (label: string): Promise<WrFormItemHarness> => loader.getHarness(WrFormItemHarness.with({ label }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ItemHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the label the consumer projected, and narrows by it', async () => {
    const all = await loader.getAllHarnesses(WrFormItemHarness);

    expect(await Promise.all(all.map(one => one.getLabel()))).toEqual(['Email', 'Bio']);
    expect(await (await item('Bio')).getLabel()).toBe('Bio');
  });

  it('paints only the error state it is told to, and narrows by it', async () => {
    const emailItem = await item('Email');
    // No discovery of its own: the item has an invalid-looking control sitting in
    // it and stays neutral until `[hasError]` says otherwise.
    expect(await emailItem.isInvalid()).toBe(false);

    fixture.componentInstance.bad.set(true);
    fixture.detectChanges();
    expect(await emailItem.isInvalid()).toBe(true);

    const invalid = await loader.getAllHarnesses(WrFormItemHarness.with({ invalid: true }));
    expect(await Promise.all(invalid.map(one => one.getLabel()))).toEqual(['Email']);
  });

  it('renders a keyed message unconditionally — a form-item has no gate', async () => {
    const emailItem = await item('Email');

    // `key="required"` and nothing is in error, yet the sentence is on screen: the
    // gating lives in `<wr-form-field>`, and with no field to ask, every message
    // decides it is the one to show. Markup moved between the two components
    // therefore changes behaviour with no error and no visible clue.
    expect(await emailItem.getErrorTexts()).toEqual(['Invalid email']);

    const byText = await loader.getAllHarnesses(WrFormItemHarness.with({ errorText: /Invalid/ }));
    expect(await Promise.all(byText.map(one => one.getLabel()))).toEqual(['Email']);
    expect(await (await item('Bio')).getErrorTexts()).toEqual([]);
  });

  it('composes with the control it wraps, per item', async () => {
    const input = await (await item('Email')).getHarness(WrInputHarness);
    await input.setValue('ada@example.test');

    expect(await input.getValue()).toBe('ada@example.test');
    expect(await (await (await item('Bio')).getHarness(WrInputHarness)).getValue()).toBe('');
  });
});

/**
 * The word inside the optional marker's parentheses.
 *
 * Unlike the `*` beside it, this marker is NOT `aria-hidden` — it sits inside
 * the `<label>` and is read as part of the control's accessible name. It was a
 * literal `(optional)` in the template with no key and no input, so a Russian
 * field announced "Телефон (optional)".
 */
@Component({
  imports: [WrFormField, WrInput],
  template: `
    <wr-form-field label="Телефон" optional><input wrInput /></wr-form-field>
    <wr-form-field label="Заметки" optional optionalLabel="по желанию"><input wrInput /></wr-form-field>
  `,
})
class OptionalHost {}

describe('WrFormField — the optional marker', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<OptionalHost>>;

  const mount = async (providers: (Provider | EnvironmentProviders)[]): Promise<string[]> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(OptionalHost);
    fixture.detectChanges();
    // The static loader resolves asynchronously even for an object literal.
    await fixture.whenStable();
    fixture.detectChanges();

    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-form-field__label')].map(label =>
      (label.textContent ?? '').replaceAll(/\s+/g, ' ').trim()
    );
  };

  afterEach(() => fixture.destroy());

  it('takes the word from the catalog, and the parentheses from the template', async () => {
    const labels = await mount([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);

    expect(labels[0]).toBe('Телефон (необязательно)');
  });

  it('lets a per-field input win over the catalog', async () => {
    const labels = await mount([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);

    expect(labels[1]).toBe('Заметки (по желанию)');
  });

  it('falls back to English when nothing is configured', async () => {
    expect(await mount([])).toEqual(['Телефон (optional)', 'Заметки (по желанию)']);
  });
});
