/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type AbstractControl, type ValidationErrors, type ValidatorFn } from '@angular/forms';

function stringValue(control: AbstractControl): string {
  const v: unknown = control.value;
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  return '';
}

/** Like {@link stringValue} but preserves whitespace — for checks that inspect spacing. */
function rawStringValue(control: AbstractControl): string {
  const v: unknown = control.value;
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** Luhn checksum. Returns true when the digit string is a valid card number. */
function luhn(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** ISO 13616 mod-97 check for IBANs. Returns the remainder; valid IBANs yield 1. */
function mod97(iban: string): number {
  // Move first 4 chars to the end + convert letters to digits (A=10..Z=35).
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) expanded += (code - 55).toString();
    else expanded += rearranged.charAt(i);
  }
  // Apply mod 97 in chunks — BigInt isn't necessary.
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    const slice = remainder.toString() + expanded.substring(i, i + 7);
    remainder = Number.parseInt(slice, 10) % 97;
  }
  return remainder;
}

function toMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  return Number.NaN;
}

/**
 * Bundled `ValidatorFn`s — pure functions, no DOM, no DI. Mirrors the
 * API shape of Angular's built-in `Validators` so it composes cleanly:
 *
 * ```ts
 * import { Validators } from '@angular/forms';
 * import { WrValidators } from 'ngwr/validators';
 *
 * new FormControl('', [
 *   Validators.required,
 *   WrValidators.cardNumber,
 *   WrValidators.cvc(3),
 *   WrValidators.match('password'),
 *   WrValidators.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
 * ]);
 * ```
 *
 * Each error is keyed under the validator name (e.g. `cardNumber`,
 * `cvc`, `iban`) so consumers can branch in templates.
 *
 * Anything Angular already ships (`required`, `email`, `min`, `max`,
 * `pattern`, …) is deliberately NOT duplicated here.
 *
 * @see https://ngwr.dev/validators
 */
export const WrValidators = {
  // String shape

  /** No whitespace anywhere in the value. */
  noWhitespace: (control: AbstractControl): ValidationErrors | null => {
    const v = rawStringValue(control);
    if (v === '') return null;
    return /\s/.test(v) ? { noWhitespace: true } : null;
  },

  /** 3, 4, 6, or 8-digit hex colour (`#abc`, `#1a2b3c`, `#1a2b3c4d`). */
  hexColor: (control: AbstractControl): ValidationErrors | null => {
    const v = stringValue(control);
    if (v === '') return null;
    return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ? null : { hexColor: true };
  },

  // Network / payments

  /**
   * Valid URL. Accepts any scheme by default; pass `{ protocols: ['https'] }`
   * to restrict.
   */
  url: (options: { readonly protocols?: readonly string[] } = {}): ValidatorFn => {
    const allow = options.protocols?.map(p => p.replace(/:$/, '').toLowerCase());
    return (control: AbstractControl): ValidationErrors | null => {
      const v = stringValue(control);
      if (v === '') return null;
      let parsed: URL;
      try {
        parsed = new URL(v);
      } catch {
        return { url: true };
      }
      const protocol = parsed.protocol.replace(/:$/, '').toLowerCase();
      // WHATWG auto-inserts the authority for "special" schemes, so `http:host`
      // (missing `//`) still parses. Require the explicit `//` for those.
      const needsAuthority = ['http', 'https', 'ws', 'wss', 'ftp', 'file'].includes(protocol);
      if (needsAuthority && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
        return { url: true };
      }
      if (allow && !allow.includes(protocol)) {
        return { url: { allowed: allow } };
      }
      return null;
    };
  },

  /** Credit card number — Luhn check + 13-19 digit length. Spaces and dashes are stripped first. */
  cardNumber: (control: AbstractControl): ValidationErrors | null => {
    const raw = stringValue(control).replace(/[\s-]/g, '');
    if (raw === '') return null;
    if (!/^\d{13,19}$/.test(raw)) return { cardNumber: true };
    return luhn(raw) ? null : { cardNumber: true };
  },

  /** CVC / CVV — N digits (default 3). Common: 3 for Visa/MC, 4 for Amex. */
  cvc: (length = 3): ValidatorFn => {
    const re = new RegExp(`^\\d{${length}}$`);
    return (control: AbstractControl): ValidationErrors | null => {
      const v = stringValue(control);
      if (v === '') return null;
      return re.test(v) ? null : { cvc: { length } };
    };
  },

  /**
   * IBAN — basic structure (CC + 2 digits + up to 30 alphanumerics) +
   * the mod-97 check. Country-length tables not enforced.
   */
  iban: (control: AbstractControl): ValidationErrors | null => {
    const raw = stringValue(control).replace(/\s/g, '').toUpperCase();
    if (raw === '') return null;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(raw)) return { iban: true };
    return mod97(raw) === 1 ? null : { iban: true };
  },

  // Cross-field

  /**
   * Value must equal a sibling control's value (e.g. confirm-password).
   * The target lookup uses `control.parent.get(name)`, so it works
   * inside `FormGroup` and nested groups.
   */
  match: (targetName: string): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
      const target = control.parent?.get(targetName);
      if (!target) return null;
      return control.value === target.value ? null : { match: { target: targetName } };
    };
  },

  // Choice

  /** Value must be one of the allowed entries (strict equality). */
  oneOf: <T>(allowed: readonly T[]): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value as T;
      if (v == null || (v as unknown) === '') return null;
      return allowed.includes(v) ? null : { oneOf: { allowed } };
    };
  },

  // Date bounds

  /** Value (Date | parseable) must be ≥ `min`. */
  minDate: (min: Date | string | number): ValidatorFn => {
    const minMs = toMs(min);
    return (control: AbstractControl): ValidationErrors | null => {
      const v: unknown = control.value;
      if (v == null || v === '') return null;
      const got = toMs(v);
      if (Number.isNaN(got)) return { minDate: { min } };
      return got >= minMs ? null : { minDate: { min } };
    };
  },

  /** Value (Date | parseable) must be ≤ `max`. */
  maxDate: (max: Date | string | number): ValidatorFn => {
    const maxMs = toMs(max);
    return (control: AbstractControl): ValidationErrors | null => {
      const v: unknown = control.value;
      if (v == null || v === '') return null;
      const got = toMs(v);
      if (Number.isNaN(got)) return { maxDate: { max } };
      return got <= maxMs ? null : { maxDate: { max } };
    };
  },
};
