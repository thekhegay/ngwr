import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, type ValidationErrors } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';

import { WrInput } from 'ngwr/input';
import { WrTextarea } from 'ngwr/textarea';
import { afterEach, describe, expect, it } from 'vitest';

import { provideWrFormErrors } from './form-errors';
import { WrFormField } from './form-field';

/**
 * A reactive control whose errors change WITHOUT an event.
 *
 * `<wr-form-field>` used to learn about a classic control's errors from
 * `control.events` alone — `touched`, `dirty` and `errors` are not signals, so a
 * computed over them never recomputes on its own. That misses every validity update
 * made with `emitEvent: false`, and Angular makes one itself: a custom control's
 * parse errors (`transformedValue`, which `wr-date-picker` reports a refused entry
 * through) reach a `FormControl` as a validator re-run with
 * `updateValueAndValidity({ emitEvent: false })`. The control went invalid, the
 * form could not submit, and the field went on showing the message from before —
 * or none at all — until something unrelated emitted.
 *
 * A later pass of change detection did not help either — the message was memoised on
 * a revision only events move. Both paths are driven below with a plain validator,
 * the way an app would.
 */
@Component({
  imports: [ReactiveFormsModule, WrFormField, WrInput, WrTextarea],
  template: `
    <wr-form-field label="Name" data-k="native">
      <input wrInput [formControl]="name" />
    </wr-form-field>
    <wr-form-field label="Bio" data-k="custom">
      <wr-textarea [formControl]="bio" />
    </wr-form-field>
    <output>{{ elsewhere() }}</output>
  `,
})
class ReactiveHost {
  readonly name = new FormControl('Ada');
  readonly bio = new FormControl('Mathematician');
  /** Something unrelated on the same view changing — what refreshes it in a real app. */
  readonly elsewhere = signal(0);
}

@Component({
  imports: [FormField, WrFormField, WrTextarea],
  template: `
    <wr-form-field label="Bio">
      <wr-textarea [formField]="profile.bio" />
    </wr-form-field>
    <output>{{ elsewhere() }}</output>
  `,
})
class SignalHost {
  readonly elsewhere = signal(0);
  private readonly model = signal({ bio: '' });
  readonly profile = form(this.model, path => {
    required(path.bio);
  });
}

const refused = (): ValidationErrors => ({ pattern: { requiredPattern: 'x' } });

describe('WrFormField and errors that change without an event', () => {
  afterEach(() => TestBed.resetTestingModule());

  const mount = (): ReturnType<typeof TestBed.createComponent<ReactiveHost>> => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    return fixture;
  };
  const field = (fixture: { nativeElement: unknown }, key: string): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`wr-form-field[data-k="${key}"]`)!;
  const message = (el: HTMLElement): string | null =>
    el.querySelector('.wr-form-field__error')?.textContent?.trim() ?? null;

  for (const key of ['native', 'custom'] as const) {
    it(`shows an error a validator raised silently — ${key} control`, () => {
      const fixture = mount();
      const control = key === 'native' ? fixture.componentInstance.name : fixture.componentInstance.bio;
      control.markAsTouched();
      fixture.detectChanges();
      expect(message(field(fixture, key))).toBeNull();

      control.addValidators(refused);
      control.updateValueAndValidity({ emitEvent: false });
      fixture.detectChanges();

      const el = field(fixture, key);
      expect(control.errors).not.toBeNull();
      expect(el.classList.contains('wr-form-field--invalid')).toBe(true);
      expect(message(el)).toBe('This value is not in the expected format.');
      expect(el.querySelector('input, textarea')!.getAttribute('aria-invalid')).toBe('true');
      fixture.destroy();
    });

    it(`drops an error cleared silently — ${key} control`, () => {
      const fixture = mount();
      const control = key === 'native' ? fixture.componentInstance.name : fixture.componentInstance.bio;
      control.addValidators(refused);
      control.markAsTouched();
      control.updateValueAndValidity();
      fixture.detectChanges();
      expect(message(field(fixture, key))).toBe('This value is not in the expected format.');

      control.removeValidators(refused);
      control.updateValueAndValidity({ emitEvent: false });
      fixture.detectChanges();

      const el = field(fixture, key);
      expect(message(el)).toBeNull();
      expect(el.classList.contains('wr-form-field--invalid')).toBe(false);
      expect(el.querySelector('input, textarea')!.hasAttribute('aria-invalid')).toBe(false);
      fixture.destroy();
    });
  }

  it('re-resolves a silent change on the next pass that reaches the field, and nothing else', () => {
    // Counted through the app's own message function. Each pass changes something
    // unrelated on the same view, which is what refreshes it under zoneless change
    // detection; a pass with nothing dirty refreshes nothing at all.
    let resolved = 0;
    TestBed.configureTestingModule({
      providers: [provideWrFormErrors({ pattern: () => `resolved ${++resolved}` })],
    });
    const fixture = TestBed.createComponent(ReactiveHost);
    const control = fixture.componentInstance.name;
    control.addValidators(refused);
    control.markAsTouched();
    control.updateValueAndValidity();
    fixture.detectChanges();
    const pass = (): void => {
      fixture.componentInstance.elsewhere.update(n => n + 1);
      fixture.detectChanges();
    };
    pass();
    const settled = resolved;
    expect(settled).toBeGreaterThan(0);

    for (let i = 0; i < 5; i++) pass();
    expect(resolved).toBe(settled);

    // A silent swap of one error for another keeps the status INVALID, so the control
    // dirties nothing on the page by itself. The next pass that reaches the field —
    // here an unrelated change; in `wr-date-picker`'s case its own refusal turning
    // visible — used to re-render the memoised message. It now re-resolves it.
    control.setErrors({ pattern: { requiredPattern: 'y' } }, { emitEvent: false });
    pass();
    expect(resolved).toBe(settled + 1);
    expect(field(fixture, 'native').querySelector('.wr-form-field__error')?.textContent?.trim()).toBe(
      `resolved ${settled + 1}`
    );
    fixture.destroy();
  });

  it('leaves a Signal Forms field to its own signals, and does not re-resolve on every pass', async () => {
    // The interop control builds a fresh `errors` object on every read, so comparing
    // it by reference would call it changed on every pass.
    let resolved = 0;
    TestBed.configureTestingModule({
      providers: [provideWrFormErrors({ required: () => `required ${++resolved}` })],
    });
    const fixture = TestBed.createComponent(SignalHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector('textarea')!.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('.wr-form-field__error')?.textContent?.trim()).toMatch(/^required \d+$/);
    const settled = resolved;

    for (let i = 0; i < 5; i++) {
      fixture.componentInstance.elsewhere.update(n => n + 1);
      fixture.detectChanges();
    }
    expect(resolved).toBe(settled);
    fixture.destroy();
  });
});
