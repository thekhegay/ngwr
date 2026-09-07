import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { describe, expect, it, vi } from 'vitest';

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

  /**
   * The lenient mode has its own parse, and therefore its own three ways to be
   * wrong — none of which the strict path exercises, because it never reaches
   * the retry at all.
   */
  describe('with the scheme optional', () => {
    const lenient = WrValidators.url({ requireProtocol: false });

    it('still rejects input that is not a URL even with https bolted on', () => {
      // `new URL('https:// spaces')` throws, and the retry has to answer with an
      // error rather than letting the throw escape a validator.
      expect(lenient(control('not a url'))).toEqual({ url: true });
      expect(lenient(control('%%%'))).toEqual({ url: true });
    });

    it('reads a leading slash as a host, which is the retry being literal', () => {
      // Pinned because it surprises: `https:///reference` collapses to
      // `https://reference/`, so a path typed into a lenient URL field is
      // accepted as a domain. The alternative is a second syntax check the
      // validator does not do — `requireProtocol: false` means "assume https",
      // and this is what assuming https costs.
      expect(lenient(control('/reference'))).toBeNull();
    });

    it('does not smuggle https past an allow-list that excludes it', () => {
      // The retry ASSUMES https, so a field restricted to ftp would otherwise
      // accept a bare domain by inventing the very scheme it forbids.
      const ftpOnly = WrValidators.url({ requireProtocol: false, protocols: ['ftp'] });
      expect(ftpOnly(control('ngwr.dev'))).toEqual({ url: { allowed: ['ftp'] } });
      expect(ftpOnly(control('ftp://ngwr.dev'))).toBeNull();
    });

    it('leaves an explicit scheme to the strict path', () => {
      // Input that already has a scheme is never retried, so a bad one stays bad.
      expect(lenient(control('http:ngwr.dev'))).toEqual({ url: true });
    });
  });
});

/**
 * Every single-field validator reads its control through one of two coercions,
 * and both were only ever handed strings. A control bound to a number is
 * ordinary — `<input type="number">`, a slider, a `[formField]` over a numeric
 * model — and a control bound to an object is what an unfinished binding
 * produces. Neither may throw, and neither may report a value it did not see.
 */
describe('WrValidators against a non-string control value', () => {
  it('reads a number as its digits', () => {
    // The Luhn check is the clearest witness: the same card number typed into a
    // numeric control and into a text one has to answer the same way.
    expect(WrValidators.cardNumber(control(4242424242424242))).toBeNull();
    expect(WrValidators.cardNumber(control(4242424242424241))).toEqual({ cardNumber: true });
    expect(WrValidators.hexColor(control(123456))).toEqual({ hexColor: true });
  });

  it('reads a boolean as its word', () => {
    expect(WrValidators.noWhitespace(control(true))).toBeNull();
    expect(WrValidators.hexColor(control(false))).toEqual({ hexColor: true });
  });

  it('treats anything else as empty rather than stringifying it', () => {
    // `String({})` is `[object Object]`, which holds a space — so a stringifying
    // coercion would report a `noWhitespace` FAILURE on a value the user can
    // neither see nor fix. Empty is the honest reading, and empty is what every
    // validator here waves through.
    for (const value of [{}, [], () => 0, Symbol('x')]) {
      expect(WrValidators.url()(control(value))).toBeNull();
      expect(WrValidators.noWhitespace(control(value))).toBeNull();
      expect(WrValidators.hexColor(control(value))).toBeNull();
      expect(WrValidators.cardNumber(control(value))).toBeNull();
    }
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
    // The documented constraint, not a bug to fix here. Angular runs a
    // control's validators in its own constructor, before it has a parent, so
    // `control.parent?.get(...)` finds nothing and this returns null.
    //
    // `formControlName` revalidates when it binds, so a form rendered through
    // the reactive-forms directives never shows this. It bites whatever reads
    // validity FIRST — a guard, a resolver, a service that builds and submits
    // a form, or a spec like this one. `matchFields` on the GROUP is the
    // answer; `match` stays because it is what gives a field its message.
    const mismatched = group('hunter2', 'hunter3');
    expect(mismatched.get('confirm')?.errors).toBeNull();
    expect(mismatched.valid).toBe(true);
  });

  it('has no empty guard — a filled value against an empty one reports', () => {
    const half = group('hunter2', '');
    half.get('confirm')?.updateValueAndValidity();
    expect(half.get('confirm')?.errors).toEqual({ match: { target: 'password' } });
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

describe('WrValidators.minDate / maxDate against a value that is not a date', () => {
  // `toMs` has three answers and the third is the one that decides what happens
  // to junk: a Date, something `new Date()` can read, or NaN. A validator that
  // let NaN through would compare `NaN >= minMs`, which is always false, and
  // every date field bound to an object would silently report the bound error
  // instead of saying the value is unreadable.
  const min = WrValidators.minDate('2026-01-01');
  const max = WrValidators.maxDate('2026-12-31');

  it('reports the bound rather than passing an unreadable value', () => {
    for (const [what, value] of [
      ['an object', {}],
      ['an array', []],
      ['a function', () => 0],
      ['a symbol', Symbol('x')],
      ['a boolean', true],
    ] as const) {
      expect(min(control(value)), what).toEqual({ minDate: { min: '2026-01-01' } });
      expect(max(control(value)), what).toEqual({ maxDate: { max: '2026-12-31' } });
    }
  });

  it('reports it for a string no calendar can read, too', () => {
    expect(min(control('not a date'))).toEqual({ minDate: { min: '2026-01-01' } });
  });

  it('still waves through nothing at all', () => {
    // Emptiness is `required`'s job, not a bound's — same rule every other
    // validator here follows.
    expect(min(control(null))).toBeNull();
    expect(min(control(''))).toBeNull();
    expect(max(control(undefined))).toBeNull();
  });

  it('fails everything when the BOUND itself is unreadable', () => {
    // The bound is coerced once, at construction. An unreadable one makes every
    // comparison false, and reporting that as a bound violation on every value
    // is what surfaces the author's mistake rather than hiding it.
    const broken = WrValidators.minDate({} as unknown as Date);
    expect(broken(control(new Date()))).toEqual({ minDate: { min: {} } });
  });
});

describe('WrValidators.matchFields', () => {
  const pair = (a: unknown, b: unknown): FormGroup =>
    new FormGroup(
      { password: new FormControl(a), confirm: new FormControl(b) },
      { validators: [WrValidators.matchFields('password', 'confirm')] }
    );

  const MISMATCH = { matchFields: { fields: ['password', 'confirm'] } };

  it('reports a mismatch that was there from the start — the hole `match` leaves open', () => {
    const group = pair('hunter2', 'hunter3');
    // No `updateValueAndValidity()` anywhere: Angular attaches the children and
    // aggregates their values before it runs the group's own validators.
    expect(group.errors).toEqual(MISMATCH);
    expect(group.valid).toBe(false);
  });

  it('leaves the children alone — the error is the group’s', () => {
    const group = pair('hunter2', 'hunter3');
    expect(group.get('password')?.errors).toBeNull();
    expect(group.get('confirm')?.errors).toBeNull();
    expect(group.get('confirm')?.valid).toBe(true);
  });

  it('passes when the values agree', () => {
    const group = pair('hunter2', 'hunter2');
    expect(group.errors).toBeNull();
    expect(group.valid).toBe(true);
  });

  it('treats null, undefined and the empty string as one empty value', () => {
    expect(pair('', '').errors).toBeNull();
    expect(pair(null, null).errors).toBeNull();
    expect(pair(null, '').errors).toBeNull();
    expect(pair(undefined, null).errors).toBeNull();
  });

  it('reports when only ONE side is empty', () => {
    expect(pair('x', '').errors).toEqual(MISMATCH);
    expect(pair('', 'x').errors).toEqual(MISMATCH);
  });

  it('does not fold other falsy values into empty', () => {
    // `0` is a value someone chose; `''` is the absence of one.
    expect(pair(0, '').errors).toEqual(MISMATCH);
    expect(pair(0, 0).errors).toBeNull();
    expect(pair(false, '').errors).toEqual(MISMATCH);
  });

  it('turns the whole check off when a name resolves to nothing', () => {
    // TWO names that resolve AND disagree, plus one that does not. With only
    // one resolvable name the `values.length < 2` guard would return null on
    // its own, and an implementation that quietly compared the subset that did
    // resolve — the partial comparison the contract forbids — would pass.
    const group = new FormGroup(
      { a: new FormControl('1'), b: new FormControl('2') },
      { validators: [WrValidators.matchFields('a', 'b', 'ghost')] }
    );
    expect(group.errors).toBeNull();
    expect(group.valid).toBe(true);
  });

  it('turns the check off for a name that resolves to a GROUP rather than a control', () => {
    // `matchFields('billing', 'shipping')` instead of `'billing.zip'` is the
    // easy slip. A container resolves, so it slips past the missing-name
    // guard, and comparing two containers by reference is never equal — the
    // form would be unsatisfiable and silent about why.
    const group = new FormGroup(
      {
        billing: new FormGroup({ zip: new FormControl('11') }),
        shipping: new FormGroup({ zip: new FormControl('11') }),
      },
      { validators: [WrValidators.matchFields('billing', 'shipping')] }
    );
    expect(group.errors).toBeNull();
  });

  it('turns the check off for a FormArray name too', () => {
    const group = new FormGroup(
      { xs: new FormArray([new FormControl('1')]), ys: new FormArray([new FormControl('1')]) },
      { validators: [WrValidators.matchFields('xs', 'ys')] }
    );
    expect(group.errors).toBeNull();
  });

  it('starts reporting as soon as a missing control is added', () => {
    // Open-ended shape, so `addControl` typechecks — a strictly typed group
    // cannot gain a key it was not declared with.
    const group = new FormGroup<Record<string, AbstractControl>>(
      { password: new FormControl('x') },
      { validators: [WrValidators.matchFields('password', 'confirm')] }
    );
    group.addControl('confirm', new FormControl('different'));
    expect(group.errors).toEqual(MISMATCH);
  });

  it('is inert on a control that is not a group, and does not throw', () => {
    const control = new FormControl('x', WrValidators.matchFields('a', 'b'));
    expect(control.errors).toBeNull();
    expect(control.valid).toBe(true);
  });

  it('reaches into nested groups through a dotted path', () => {
    const group = new FormGroup(
      {
        billing: new FormGroup({ zip: new FormControl('11') }),
        shipping: new FormGroup({ zip: new FormControl('22') }),
      },
      { validators: [WrValidators.matchFields('billing.zip', 'shipping.zip')] }
    );
    expect(group.errors).toEqual({ matchFields: { fields: ['billing.zip', 'shipping.zip'] } });
    expect(group.get('billing')?.errors).toBeNull();
  });

  it('resolves FormArray index segments', () => {
    const group = new FormGroup(
      { items: new FormArray([new FormControl('n0'), new FormControl('n1')]) },
      { validators: [WrValidators.matchFields('items.0', 'items.1')] }
    );
    expect(group.errors).toEqual({ matchFields: { fields: ['items.0', 'items.1'] } });
  });

  it('compares by reference, so two equal Dates are not equal', () => {
    expect(pair(new Date('2026-01-01'), new Date('2026-01-01')).errors).toEqual(MISMATCH);

    const shared = new Date('2026-01-01');
    expect(pair(shared, shared).errors).toBeNull();
  });

  it('skips a disabled control, so it compares what group.value contains', () => {
    const group = pair('hunter2', 'hunter3');
    group.get('confirm')?.disable();

    expect(group.errors).toBeNull();
    expect(group.valid).toBe(true);
    expect(group.value).toEqual({ password: 'hunter2' });

    group.get('confirm')?.enable();
    expect(group.errors).toEqual(MISMATCH);
  });

  it('disabling ONE name narrows the comparison instead of cancelling it', () => {
    // With two names, "skip the disabled one" and "abort the whole check" are
    // indistinguishable — both give null. Three names tell them apart.
    const group = new FormGroup(
      { a: new FormControl('1'), b: new FormControl('irrelevant'), c: new FormControl('2') },
      { validators: [WrValidators.matchFields('a', 'b', 'c')] }
    );
    group.get('b')?.disable();

    expect(group.errors).toEqual({ matchFields: { fields: ['a', 'c'] } });
  });

  it('names only the controls it actually compared', () => {
    // A message that lists a disabled field points the reader at something
    // they cannot edit.
    const group = new FormGroup(
      { a: new FormControl('1'), b: new FormControl('9'), c: new FormControl('2') },
      { validators: [WrValidators.matchFields('a', 'b', 'c')] }
    );
    group.get('b')?.disable();
    expect((group.errors as { matchFields: { fields: string[] } }).matchFields.fields).not.toContain('b');
  });

  it('short-circuits when fewer than two named controls are enabled, and recovers', () => {
    const group = pair('hunter2', 'hunter3');
    group.get('password')?.disable();
    group.get('confirm')?.disable();
    expect(group.errors).toBeNull();

    // Not a latch: re-enabling both brings the rule straight back.
    group.get('password')?.enable();
    group.get('confirm')?.enable();
    expect(group.errors).toEqual(MISMATCH);
  });

  it('compares every name against the first, and echoes them all in order', () => {
    const group = new FormGroup(
      { a: new FormControl('1'), b: new FormControl('1'), c: new FormControl('2') },
      { validators: [WrValidators.matchFields('a', 'b', 'c')] }
    );
    expect(group.errors).toEqual({ matchFields: { fields: ['a', 'b', 'c'] } });
  });

  it('never puts control values in the payload', () => {
    // It guards passwords, and error objects reach the DOM, logs and reporters.
    const errors = pair('hunter2', 'hunter3').errors;
    expect(errors).not.toBeNull(); // or the assertions below pass vacuously
    const serialized = JSON.stringify(errors);
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('hunter3');
  });

  it('hands out a copy, so a consumer cannot switch the rule off by mutating it', () => {
    // The payload used to BE the validator's own name list. Pushing a name
    // that resolves to nothing then turned the check off, and a form with two
    // plainly different passwords reported itself valid.
    const group = pair('hunter2', 'hunter3');
    (group.errors as { matchFields: { fields: string[] } }).matchFields.fields.push('ghost');

    group.get('confirm')?.setValue('still-different');
    expect(group.errors).toEqual(MISMATCH);
    expect(group.valid).toBe(false);
  });

  it('gives each group its own payload object', () => {
    const validator = WrValidators.matchFields('password', 'confirm');
    const a = new FormGroup(
      { password: new FormControl('1'), confirm: new FormControl('2') },
      { validators: [validator] }
    );
    const b = new FormGroup(
      { password: new FormControl('3'), confirm: new FormControl('4') },
      { validators: [validator] }
    );

    const fieldsOf = (g: FormGroup): string[] => (g.errors as { matchFields: { fields: string[] } }).matchFields.fields;
    expect(fieldsOf(a)).not.toBe(fieldsOf(b));
    expect(fieldsOf(a)).toEqual(fieldsOf(b));
  });

  it('clears and re-reports as the values change', () => {
    const group = pair('a', 'b');
    expect(group.errors).toEqual(MISMATCH);

    group.get('confirm')?.setValue('a');
    expect(group.errors).toBeNull();

    group.get('confirm')?.setValue('c');
    expect(group.errors).toEqual(MISMATCH);
  });

  it('clears on reset, because both controls end up empty', () => {
    const group = pair('a', 'b');
    group.reset();
    expect(group.errors).toBeNull();
  });

  it('is invalid while still untouched and pristine', () => {
    // Validity is immediate; DISPLAY is not — `<wr-form-field>` shows nothing
    // until touched or dirty, which is why the fix is about blocking submit.
    const group = pair('a', 'b');
    expect(group.valid).toBe(false);
    expect(group.touched).toBe(false);
    expect(group.dirty).toBe(false);
  });

  it('warns at warn level, not error — an error fails the showcase prerender', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      new FormGroup({ a: new FormControl('x') }, { validators: [WrValidators.matchFields('a', 'nope')] });
      expect(warn).toHaveBeenCalledOnce();
      expect(error).not.toHaveBeenCalled();
      expect(warn.mock.calls[0][0]).toContain('matchFields');
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it('warns once per run AND once per instance — the latch is not shared', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const first = new FormGroup({ a: new FormControl('x') }, { validators: [WrValidators.matchFields('a', 'nope')] });
      first.updateValueAndValidity();
      first.updateValueAndValidity();
      expect(spy).toHaveBeenCalledOnce();

      // A second validator is a second closure. A module-level latch — which
      // under SSR is shared across every request — would stay silent here.
      new FormGroup({ a: new FormControl('x') }, { validators: [WrValidators.matchFields('a', 'nope')] });
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

  it('says which name is a container, so the fix is obvious', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      new FormGroup(
        { billing: new FormGroup({ zip: new FormControl('1') }), other: new FormControl('1') },
        { validators: [WrValidators.matchFields('billing', 'other')] }
      );
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0][0]).toContain('billing.<field>');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('the two match validators together', () => {
  // The documented pairing: `matchFields` makes the form correct from the first
  // frame, `match` gives the confirm field something to render.
  const form = (): FormGroup =>
    new FormGroup(
      {
        password: new FormControl('hunter2'),
        confirm: new FormControl('hunter3', WrValidators.match('password')),
      },
      { validators: [WrValidators.matchFields('password', 'confirm')] }
    );

  it('is invalid from construction, and both keys appear once anything revalidates', () => {
    const group = form();
    expect(group.valid).toBe(false);
    expect(group.errors).toEqual({ matchFields: { fields: ['password', 'confirm'] } });

    group.get('confirm')?.updateValueAndValidity();
    expect(group.get('confirm')?.errors).toEqual({ match: { target: 'password' } });
  });

  it('both clear together once the values agree', () => {
    const group = form();
    group.get('confirm')?.setValue('hunter2');
    expect(group.errors).toBeNull();
    expect(group.get('confirm')?.errors).toBeNull();
    expect(group.valid).toBe(true);
  });
});

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <input formControlName="password" />
      <input formControlName="confirm" />
    </form>
  `,
})
class BoundForm {
  readonly form = new FormGroup({
    password: new FormControl('hunter2'),
    confirm: new FormControl('hunter3', WrValidators.match('password')),
  });
}

describe('match, once the reactive-forms directives bind it', () => {
  it('self-corrects on the first change detection', () => {
    // This is the boundary of the constraint, and the reason the docs must not
    // claim a rendered form can be submitted with two values that disagree.
    // `formControlName` calls setUpControl -> updateValueAndValidity when it
    // binds, which is the revalidation `match` was waiting for.
    const fixture = TestBed.createComponent(BoundForm);
    const form = fixture.componentInstance.form;

    expect(form.get('confirm')?.errors).toBeNull();
    expect(form.valid).toBe(true);

    fixture.detectChanges();

    expect(form.get('confirm')?.errors).toEqual({ match: { target: 'password' } });
    expect(form.valid).toBe(false);
  });

  it('matchFields needed no such help — it was right before the render', () => {
    const group = new FormGroup(
      { password: new FormControl('hunter2'), confirm: new FormControl('hunter3') },
      { validators: [WrValidators.matchFields('password', 'confirm')] }
    );
    expect(group.valid).toBe(false);
  });
});
