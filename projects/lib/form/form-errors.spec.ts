import { FormControl } from '@angular/forms';

import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { WrValidators } from 'ngwr/validators';
import { describe, expect, it } from 'vitest';

import { WR_FORM_ERROR_FALLBACKS } from './form-errors';

/**
 * Every error key a shipped validator can produce must have copy in all three
 * places the resolution chain consults. A key that is missing everywhere makes
 * `resolve()` return `''`, and `<wr-form-field>` then renders an EMPTY error
 * block with `aria-describedby` pointing at nothing — invalid, and easy to miss
 * in review because the field does still go red.
 *
 * The list is DERIVED from `WrValidators` rather than typed out here: a new
 * validator fails this file until its sentence exists. A hand-written list
 * would only ever cover the validators someone remembered to add to it.
 */

/** Angular's own error keys, which `<wr-form-field>` also answers for. */
const ANGULAR_KEYS = ['required', 'requiredTrue', 'email', 'minlength', 'maxlength', 'min', 'max', 'pattern'] as const;

/** Every validator ngwr ships. Each keys its error under its own name. */
const VALIDATOR_NAMES = Object.keys(WrValidators);

const catalog = (locale: Record<string, unknown>): Record<string, unknown> =>
  (locale['validation'] ?? {}) as Record<string, unknown>;

const missingCopy = (keys: readonly string[]): string[] =>
  keys.filter(key => !(key in WR_FORM_ERROR_FALLBACKS) || !(key in catalog(wrEn)) || !(key in catalog(wrRu)));

describe('validation copy', () => {
  it('finds a validator to check — the derivation is not silently empty', () => {
    expect(VALIDATOR_NAMES.length).toBeGreaterThan(5);
    expect(VALIDATOR_NAMES).toContain('matchFields');
  });

  it('covers every validator ngwr ships', () => {
    // The guard that actually bites: add a validator, and this fails until its
    // sentence exists in the fallback table and in both catalogs.
    expect(missingCopy(VALIDATOR_NAMES)).toEqual([]);
  });

  it('covers the Angular built-ins too', () => {
    expect(missingCopy(ANGULAR_KEYS)).toEqual([]);
  });

  it('has no fallback key without catalog copy in both locales', () => {
    const orphans = Object.keys(WR_FORM_ERROR_FALLBACKS).filter(
      key => !(key in catalog(wrEn)) || !(key in catalog(wrRu))
    );
    expect(orphans).toEqual([]);
  });

  it('keeps the two locales in step — no key in one that is missing from the other', () => {
    expect([...Object.keys(catalog(wrRu))].sort()).toEqual([...Object.keys(catalog(wrEn))].sort());
  });

  it('gives matchFields its own wording, distinct from match', () => {
    // Identical copy in both would be a sign one was pasted and never adapted:
    // `match` is a pair attached to one field, `matchFields` is N-ary and lives
    // on the group.
    expect(catalog(wrEn)['matchFields']).not.toBe(catalog(wrEn)['match']);
    expect(catalog(wrRu)['matchFields']).not.toBe(catalog(wrRu)['match']);
  });

  it('describes noWhitespace by what it rejects, not as a blank field', () => {
    // Copy coverage is not copy correctness, which is how this survived: the
    // sentence was "This field cannot be blank." while the validator PASSES on an
    // empty value and fails on any value that holds whitespace. So the one case
    // that reaches the message is `Ada Lovelace`, and the message called it blank.
    expect(WrValidators.noWhitespace(new FormControl(''))).toBeNull();
    expect(WrValidators.noWhitespace(new FormControl('Ada Lovelace'))).toEqual({ noWhitespace: true });

    const fallback = String(WR_FORM_ERROR_FALLBACKS['noWhitespace']).toLowerCase();
    expect(fallback).not.toContain('blank');
    expect(fallback).toContain('space');
  });

  it('leaves no {{placeholder}} in the matchFields copy', () => {
    // Its payload is an array of control names — code identifiers, and
    // `wrInterpolate` would JSON.stringify them into the sentence.
    expect(String(catalog(wrEn)['matchFields'])).not.toContain('{{');
    expect(String(catalog(wrRu)['matchFields'])).not.toContain('{{');
  });
});
