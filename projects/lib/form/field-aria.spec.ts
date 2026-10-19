import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, minLength, required } from '@angular/forms/signals';

import { WrFileUpload } from 'ngwr/file-upload';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { WrInputOtp } from 'ngwr/input-otp';
import { WrKnob } from 'ngwr/knob';
import { WrRating } from 'ngwr/rating';
import { WrTextarea } from 'ngwr/textarea';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFormField } from './form-field';

/**
 * A `<wr-form-field>` renders three kinds of copy — a label, a hint and an error
 * — and only the first two are the same shape of problem. The label reaches the
 * control through `<label for>`; the error reaches it through
 * `aria-describedby`; the HINT reached it through nothing at all. It carried no
 * id, so the sentence explaining what to type was on screen for sighted users
 * and, for everyone else, did not exist.
 *
 * No gate could have caught that: axe has no rule that visible help text must be
 * programmatically associated with its control, which is what makes this file
 * the only check there is.
 *
 * The trap that kept it unfixed is pinned here too. Every control used to derive
 * `aria-invalid` from "is the field describing me", which is the same signal —
 * so simply pointing `aria-describedby` at the hint would have announced every
 * hinted field as being in error. The two readings are separate now:
 * `describedBy` follows whichever copy is on screen, `ariaInvalid` follows the
 * field's error keys.
 *
 * `<wr-textarea>` stands in for the fourteen controls that read the pair through
 * `useFormFieldAria()`. It is a component with a native control inside it, which
 * is the shape where none of this can be done from the consumer's markup.
 */
@Component({
  imports: [FormField, WrFormField, WrTextarea],
  template: `
    <wr-form-field label="Bio" [hint]="hint()">
      <wr-textarea [formField]="profile.bio" />
    </wr-form-field>
  `,
})
class Host {
  readonly hint = signal('Max 200 characters');

  private readonly model = signal({ bio: '' });
  readonly profile = form(this.model, path => {
    required(path.bio, { message: 'Tell us a little about yourself.' });
  });
}

describe('useFormFieldAria', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const control = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('textarea')!;

  /**
   * What a screen reader would read out, resolved through the DOCUMENT rather
   * than off the attribute. An `aria-describedby` naming an id that is nowhere
   * announces exactly as much as no attribute at all, so reading the attribute
   * back would pass on the bug it is here to catch.
   */
  const description = (): string | null => {
    const id = control().getAttribute('aria-describedby');
    if (!id) return null;
    const target = root().querySelector(`#${CSS.escape(id)}`);
    if (!target) throw new Error(`aria-describedby names "${id}", which is not in the document`);
    return target.textContent?.trim() ?? '';
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces the hint with the control', () => {
    expect(description()).toBe('Max 200 characters');
  });

  it('does not call a hinted field invalid', () => {
    // The reason the hint could not simply be folded into `describedBy`: every
    // control read the invalid flag off the same signal, so a described hint
    // would have reported a perfectly valid field as being in error.
    expect(control().hasAttribute('aria-invalid')).toBe(false);
  });

  it('describes nothing when the field has no copy to give', () => {
    fixture.componentInstance.hint.set('');
    fixture.detectChanges();

    expect(control().hasAttribute('aria-describedby')).toBe(false);
  });

  it('hands the slot to the error, and takes the hint out of the document with it', () => {
    // The field swaps the hint out for the message rather than showing both, so
    // the hint's id has to stop being published at the same moment — a control
    // still naming it would point at an element that had just been removed.
    const hintId = control().getAttribute('aria-describedby')!;

    control().dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(root().querySelector(`#${CSS.escape(hintId)}`)).toBeNull();
    expect(control().getAttribute('aria-describedby')).not.toBe(hintId);
    expect(description()).toBe('Tell us a little about yourself.');
    expect(control().getAttribute('aria-invalid')).toBe('true');
  });

  it('gives the hint its slot back once the error clears', () => {
    control().dispatchEvent(new Event('blur', { bubbles: true }));
    fixture.detectChanges();

    control().value = 'Something about me';
    control().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(description()).toBe('Max 200 characters');
    expect(control().hasAttribute('aria-invalid')).toBe(false);
  });

  it('says nothing at all outside a form field', () => {
    // The helper returns inert signals with no field to read, and a control that
    // invented an `aria-describedby` there would dangle by construction.
    const bare = TestBed.createComponent(BareHost);
    bare.detectChanges();
    const textarea = (bare.nativeElement as HTMLElement).querySelector('textarea')!;

    expect(textarea.hasAttribute('aria-describedby')).toBe(false);
    expect(textarea.hasAttribute('aria-invalid')).toBe(false);
    bare.destroy();
  });
});

@Component({
  imports: [WrTextarea],
  template: `<wr-textarea />`,
})
class BareHost {}
/**
 * Signal Forms spells its length rules `minLength` / `maxLength` and carries the
 * bound under the same name; reactive forms spell them `minlength` /
 * `maxlength` and carry it as `requiredLength`. The field restates the first as
 * the second before it reads the app's catalog, so one `validation.minlength`
 * entry answers both spellings, with `{{requiredLength}}` filled either way.
 * Without that a Signal Forms field over its length limit went red and said
 * nothing, in an app whose catalog had the sentence all along.
 */
describe('a Signal Forms length error', () => {
  @Component({
    imports: [WrFormField, WrTextarea, FormField],
    template: `<wr-form-field label="Bio"><wr-textarea [formField]="f.bio" /></wr-form-field>`,
  })
  class LengthHost {
    private readonly model = signal({ bio: 'ab' });
    readonly f = form(this.model, path => {
      minLength(path.bio, 5);
    });
  }

  afterEach(() => TestBed.resetTestingModule());

  it('reads the app catalog under the classic key, with its number', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
        provideWrI18nStaticLoader({ en: { validation: { minlength: 'At least {{requiredLength}} characters.' } } }),
      ],
    });
    const fixture = TestBed.createComponent(LengthHost);
    fixture.detectChanges();
    // The static loader resolves asynchronously even for an object literal.
    await fixture.whenStable();
    fixture.componentInstance.f.bio().markAsTouched();
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('At least 5 characters.');
  });
});
/**
 * `<label for>` binds only to a LABELABLE element — button, input, meter,
 * output, progress, select, textarea. A control whose focusable part carries a
 * ROLE instead gets nothing from it, and measured, four of them rendered a
 * field label whose `for` named no element in the document at all: the label
 * was on screen and, for a screen reader, did not exist.
 *
 * No gate reports this. axe's `label` rule looks at native controls, and
 * `check:a11y` walks prerendered HTML where the field and the control are both
 * present and both look fine.
 */
describe('a field label over a role-based control', () => {
  @Component({
    imports: [WrFormField, WrRating, WrKnob, WrInputOtp, WrFileUpload],
    template: `
      <wr-form-field label="Overall satisfaction"><wr-rating /></wr-form-field>
      <wr-form-field label="Volume"><wr-knob /></wr-form-field>
      <wr-form-field label="One-time code"><wr-input-otp /></wr-form-field>
      <wr-form-field label="Attachments"><wr-file-upload /></wr-form-field>
      <wr-form-field label="Ignored"><wr-rating ariaLabel="Explicit wins" /></wr-form-field>
    `,
  })
  class RoleHost {}

  afterEach(() => TestBed.resetTestingModule());

  /** What a screen reader resolves, through the DOCUMENT rather than off the attribute. */
  const nameOf = (root: HTMLElement, field: Element): string | null => {
    const named = field.querySelector('[aria-labelledby],[aria-label]');
    const by = named?.getAttribute('aria-labelledby');
    if (!by) return named?.getAttribute('aria-label') ?? null;
    return by
      .split(/\s+/)
      .map(id => root.querySelector(`[id="${id}"]`)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  };

  // The file upload's zone is a button whose visible copy is part of its name too
  // (WCAG 2.5.3), so its name STARTS with the field label rather than equalling it.
  it('names each one with the field label, and lets an explicit ariaLabel win', () => {
    const fixture = TestBed.createComponent(RoleHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const fields = [...root.querySelectorAll('.wr-form-field')];

    expect(fields.map(f => nameOf(root, f))).toEqual([
      'Overall satisfaction',
      'Volume',
      'One-time code',
      expect.stringMatching(/^Attachments Click to browse/),
      'Explicit wins',
    ]);
  });
});
