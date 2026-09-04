import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';

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
    required(path.bio);
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
    expect(description()).toBe('This field is required.');
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
