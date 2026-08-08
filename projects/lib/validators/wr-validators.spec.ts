import { FormControl, FormGroup } from '@angular/forms';

import { describe, expect, it } from 'vitest';

import { WrValidators } from './wr-validators';

/** A detached control, which is all a single-field validator ever sees. */
const control = (value: unknown): FormControl => new FormControl(value);

describe('WrValidators.noWhitespace', () => {
  it('passes a value with no whitespace', () => {
    expect(WrValidators.noWhitespace(control('abc'))).toBeNull();
  });

  it('fails on whitespace anywhere', () => {
    expect(WrValidators.noWhitespace(control('a b'))).toEqual({ noWhitespace: true });
    expect(WrValidators.noWhitespace(control('a\tb'))).toEqual({ noWhitespace: true });
  });

  it('fails a whitespace-only value — it reads the RAW value, not a trimmed one', () => {
    // Every other validator here trims first; this one must not, or the thing
    // it exists to detect would be stripped before it looked.
    expect(WrValidators.noWhitespace(control('   '))).toEqual({ noWhitespace: true });
  });

  it('passes on empty, leaving that to `required`', () => {
    expect(WrValidators.noWhitespace(control(''))).toBeNull();
    expect(WrValidators.noWhitespace(control(null))).toBeNull();
  });
});

describe('WrValidators.hexColor', () => {
  it('accepts 3, 4, 6 and 8 digits, in either case', () => {
    for (const value of ['#abc', '#ABCD', '#1a2b3c', '#1A2B3C4D']) {
      expect(WrValidators.hexColor(control(value))).toBeNull();
    }
  });

  it('rejects a missing hash, a bad length and non-hex digits', () => {
    for (const value of ['abc', '#ab', '#abcde', '#12345g']) {
      expect(WrValidators.hexColor(control(value))).toEqual({ hexColor: true });
    }
  });

  it('passes on empty', () => {
    expect(WrValidators.hexColor(control(''))).toBeNull();
  });
});

describe('WrValidators.url', () => {
  const url = WrValidators.url();

  it('accepts an absolute URL', () => {
    expect(url(control('https://ngwr.dev/reference'))).toBeNull();
  });

  it('requires a scheme by default', () => {
    expect(url(control('ngwr.dev'))).toEqual({ url: true });
  });

  it('requires the // for schemes that have an authority', () => {
    // `new URL('http:ngwr.dev')` parses — WHATWG fills in the authority for
    // "special" schemes — so the parser alone would wave this through.
    expect(url(control('http:ngwr.dev'))).toEqual({ url: true });
  });

  it('accepts a bare domain when the scheme is optional', () => {
    const lenient = WrValidators.url({ requireProtocol: false });
    expect(lenient(control('ngwr.dev'))).toBeNull();
    expect(lenient(control('https://ngwr.dev'))).toBeNull();
  });

  it('restricts the scheme and reports which ones were allowed', () => {
    const httpsOnly = WrValidators.url({ protocols: ['https'] });
    expect(httpsOnly(control('https://ngwr.dev'))).toBeNull();
    expect(httpsOnly(control('http://ngwr.dev'))).toEqual({ url: { allowed: ['https'] } });
  });

  it('normalizes a trailing colon in the allow-list', () => {
    const httpsOnly = WrValidators.url({ protocols: ['https:'] });
    expect(httpsOnly(control('https://ngwr.dev'))).toBeNull();
  });

  it('passes on empty', () => {
    expect(url(control(''))).toBeNull();
  });
});

describe('WrValidators.cardNumber', () => {
  it('accepts a Luhn-valid number, spaced or dashed', () => {
    expect(WrValidators.cardNumber(control('4242424242424242'))).toBeNull();
    expect(WrValidators.cardNumber(control('4242 4242 4242 4242'))).toBeNull();
    expect(WrValidators.cardNumber(control('4242-4242-4242-4242'))).toBeNull();
  });

  it('rejects a number that fails the checksum', () => {
    expect(WrValidators.cardNumber(control('4242424242424243'))).toEqual({ cardNumber: true });
  });

  it('rejects lengths outside 13..19 and anything non-numeric', () => {
    expect(WrValidators.cardNumber(control('424242424242'))).toEqual({ cardNumber: true });
    expect(WrValidators.cardNumber(control('4242424242424242424242'))).toEqual({ cardNumber: true });
    expect(WrValidators.cardNumber(control('4242abcd42424242'))).toEqual({ cardNumber: true });
  });
});

describe('WrValidators.cvc', () => {
  it('defaults to three digits', () => {
    expect(WrValidators.cvc()(control('123'))).toBeNull();
    expect(WrValidators.cvc()(control('1234'))).toEqual({ cvc: { length: 3 } });
  });

  it('takes a length, for Amex', () => {
    expect(WrValidators.cvc(4)(control('1234'))).toBeNull();
    expect(WrValidators.cvc(4)(control('123'))).toEqual({ cvc: { length: 4 } });
  });
});

describe('WrValidators.iban', () => {
  it('accepts a mod-97 valid IBAN, spaced or not', () => {
    expect(WrValidators.iban(control('GB82WEST12345698765432'))).toBeNull();
    expect(WrValidators.iban(control('GB82 WEST 1234 5698 7654 32'))).toBeNull();
    expect(WrValidators.iban(control('de89370400440532013000'))).toBeNull();
  });

  it('rejects a bad checksum and a bad shape', () => {
    expect(WrValidators.iban(control('GB82WEST12345698765433'))).toEqual({ iban: true });
    expect(WrValidators.iban(control('82GBWEST12345698765432'))).toEqual({ iban: true });
  });
});

describe('WrValidators.match', () => {
  const group = (a: string, b: string): FormGroup =>
    new FormGroup({
      password: new FormControl(a),
      confirm: new FormControl(b, WrValidators.match('password')),
    });

  it('passes when the two agree', () => {
    expect(group('hunter2', 'hunter2').get('confirm')?.errors).toBeNull();
  });

  it('reports which control it was compared against, once revalidated', () => {
    const confirm = group('hunter2', 'hunter3').get('confirm');
    confirm?.updateValueAndValidity();
    expect(confirm?.errors).toEqual({ match: { target: 'password' } });
  });

  it('DOES NOT report on a mismatched initial value until the control revalidates', () => {
    // Angular runs a control's validators in its own constructor, before it has
    // a parent — so `control.parent?.get(...)` finds nothing and the validator
    // returns null. Typing revalidates and the error appears, which hides this
    // for hand-typed forms and exposes it for prefilled ones: a group built
    // from a server record whose two fields disagree reports itself VALID.
    const mismatched = group('hunter2', 'hunter3');
    expect(mismatched.get('confirm')?.errors).toBeNull();
    expect(mismatched.valid).toBe(true);
  });

  it('passes when there is no such sibling — a missing target is not the user’s error', () => {
    const detached = new FormControl('x', WrValidators.match('nope'));
    expect(detached.errors).toBeNull();
  });
});

describe('WrValidators.oneOf', () => {
  const validator = WrValidators.oneOf(['sm', 'md', 'lg'] as const);

  it('accepts a listed value', () => {
    expect(validator(control('md'))).toBeNull();
  });

  it('rejects anything else, echoing the allowed list', () => {
    expect(validator(control('xl'))).toEqual({ oneOf: { allowed: ['sm', 'md', 'lg'] } });
  });

  it('passes on empty', () => {
    expect(validator(control(null))).toBeNull();
    expect(validator(control(''))).toBeNull();
  });

  it('compares strictly, so 1 is not "1"', () => {
    expect(WrValidators.oneOf([1, 2])(control('1'))).toEqual({ oneOf: { allowed: [1, 2] } });
  });
});

describe('WrValidators.minDate / maxDate', () => {
  const min = WrValidators.minDate('2026-01-01');
  const max = WrValidators.maxDate(new Date('2026-12-31'));

  it('accepts a Date, a string and a timestamp', () => {
    expect(min(control(new Date('2026-06-01')))).toBeNull();
    expect(min(control('2026-06-01'))).toBeNull();
    expect(min(control(Date.parse('2026-06-01')))).toBeNull();
  });

  it('is inclusive at the bound', () => {
    expect(min(control('2026-01-01'))).toBeNull();
    expect(max(control('2026-12-31'))).toBeNull();
  });

  it('reports the bound it was given, not a parsed copy', () => {
    expect(min(control('2025-12-31'))).toEqual({ minDate: { min: '2026-01-01' } });
  });

  it('treats an unparsable value as out of bounds', () => {
    expect(min(control('not a date'))).toEqual({ minDate: { min: '2026-01-01' } });
  });

  it('passes on empty', () => {
    expect(min(control(null))).toBeNull();
    expect(max(control(''))).toBeNull();
  });
});
