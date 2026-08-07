/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

/** Pull a number out of a validator payload without trusting its shape. */
function num(error: unknown, field: string): string {
  if (error && typeof error === 'object' && field in error) {
    const value = (error as Record<string, unknown>)[field];
    if (typeof value === 'number' || typeof value === 'string') return String(value);
  }
  return '';
}

/** What a message function is handed to build its sentence. */
export interface WrFormErrorContext {
  /** Validator key (classic forms) or Signal Forms `kind` that produced the error. */
  readonly key: string;
  /**
   * The validator's own payload — `{ requiredLength, actualLength }` for
   * `minlength`, `{ min }` for `wrMinDate`, and so on. `true` for the
   * flag-shaped validators, which carry nothing.
   */
  readonly error: unknown;
  /** The surrounding field's `label`, so a message can name the field. */
  readonly label: string;
}

/** A message, or a function that builds one from the validator's payload. */
export type WrFormErrorMessage = string | ((ctx: WrFormErrorContext) => string);

/** Validator key → message. Keys are matched exactly against `control.errors`. */
export type WrFormErrorMessages = Readonly<Record<string, WrFormErrorMessage>>;

/**
 * App-wide validation copy. Empty by default; `<wr-form-field>` falls through
 * to the `ngwr/i18n` catalog and then to a built-in English sentence, so a
 * form shows a usable message with no configuration at all.
 */
export const WR_FORM_ERRORS = new InjectionToken<WrFormErrorMessages>('WR_FORM_ERRORS', {
  providedIn: 'root',
  factory: () => ({}),
});

/**
 * Register validation messages for the whole app.
 *
 * Only the keys you name are overridden — everything else keeps resolving
 * through the i18n catalog, so this composes with `provideWrI18n()` rather than
 * replacing it. A projected `<wr-form-error key="…">` still wins over both:
 * per-field copy beats app-wide copy.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideWrFormErrors({
 *       required: 'Please fill this in.',
 *       minlength: ({ error }) => `At least ${(error as { requiredLength: number }).requiredLength} characters.`,
 *     }),
 *   ],
 * });
 * ```
 */
export function provideWrFormErrors(messages: WrFormErrorMessages = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: WR_FORM_ERRORS, useValue: messages }]);
}

/**
 * Last-resort English, used when no app catalog and no i18n catalog answer.
 *
 * These exist so that a form with zero configuration still says something true
 * rather than rendering an empty error block. Every key here also ships as a
 * `validation.*` entry in `ngwr/i18n/{en,ru}`, which is what a localized app
 * actually reads.
 */
export const WR_FORM_ERROR_FALLBACKS: WrFormErrorMessages = {
  // Angular built-ins.
  required: 'This field is required.',
  requiredTrue: 'This field must be checked.',
  email: 'Enter a valid email address.',
  minlength: ({ error }) => `Enter at least ${num(error, 'requiredLength')} characters.`,
  maxlength: ({ error }) => `Enter at most ${num(error, 'requiredLength')} characters.`,
  min: ({ error }) => `Enter ${num(error, 'min')} or more.`,
  max: ({ error }) => `Enter ${num(error, 'max')} or less.`,
  pattern: 'This value is not in the expected format.',

  // WrValidators.
  noWhitespace: 'This field cannot be blank.',
  hexColor: 'Enter a hex colour, e.g. #1a2b3c.',
  url: 'Enter a valid URL.',
  cardNumber: 'Enter a valid card number.',
  cvc: ({ error }) => `Enter the ${num(error, 'length')}-digit security code.`,
  iban: 'Enter a valid IBAN.',
  match: 'The two values do not match.',
  oneOf: 'Choose one of the allowed values.',
  minDate: 'Choose a later date.',
  maxDate: 'Choose an earlier date.',
};
