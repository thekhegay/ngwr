/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import { getRootFontSize } from '../dom';

import { resolveCssSize } from './resolve-css-size';

/**
 * The format table in this function's JSDoc, asserted rather than described.
 *
 * It had no spec, which is why its rem, percent, bare-number and passthrough
 * branches were the least-covered lines in `ngwr/utils` — a layer documented as
 * covered. Nothing here is a coverage errand: `resolveCssSize` is what every
 * component that takes a size input runs its value through, and each branch
 * below decides a different rendered result.
 *
 * The pair it returns is the point. `cssValue` is what reaches the style
 * attribute and `pxValue` is what arithmetic reaches for, and the two disagree
 * on purpose for a percentage — there is no pixel equivalent of `80%` without a
 * container, so it answers `null` rather than a plausible number.
 */
describe('resolveCssSize', () => {
  it('reads a number as pixels, in both halves', () => {
    expect(resolveCssSize(48)).toEqual({ cssValue: '48px', pxValue: 48 });
    expect(resolveCssSize(0)).toEqual({ cssValue: '0px', pxValue: 0 });
    expect(resolveCssSize(-4)).toEqual({ cssValue: '-4px', pxValue: -4 });
  });

  it('keeps a rem in rem and resolves the pixels through the root font size', () => {
    // The whole reason this helper exists rather than a `parseFloat`: the CSS
    // stays in rem so it keeps scaling with the user's own font size, while the
    // caller still gets a number to compute with.
    const root = getRootFontSize();
    expect(resolveCssSize('3rem')).toEqual({ cssValue: '3rem', pxValue: 3 * root });
    expect(resolveCssSize('1.5REM')).toEqual({ cssValue: '1.5rem', pxValue: 1.5 * root });
    expect(resolveCssSize('2 rem')).toEqual({ cssValue: '2rem', pxValue: 2 * root });
  });

  it('normalises a pixel string instead of passing it through', () => {
    expect(resolveCssSize('12px')).toEqual({ cssValue: '12px', pxValue: 12 });
    expect(resolveCssSize('  12.5 PX ')).toEqual({ cssValue: '12.5px', pxValue: 12.5 });
  });

  it('answers null pixels for a percentage, rather than a plausible number', () => {
    // A percentage is relative to a container this function cannot see. Any
    // number here would be made up, and the caller has no way to tell.
    expect(resolveCssSize('80%')).toEqual({ cssValue: '80%', pxValue: null });
    expect(resolveCssSize(' 33.3 % ')).toEqual({ cssValue: '33.3%', pxValue: null });
  });

  it('treats a bare numeric string as pixels', () => {
    // The shape a template hands over: `size="15"` arrives as a string.
    expect(resolveCssSize('15')).toEqual({ cssValue: '15px', pxValue: 15 });
    expect(resolveCssSize(' 7.5 ')).toEqual({ cssValue: '7.5px', pxValue: 7.5 });
  });

  it('passes an unrecognised unit through untouched, with no pixel guess', () => {
    // `vw`, `ch`, `calc()` and custom properties are all legal CSS this helper
    // has no arithmetic for. Passing them through is what lets a consumer write
    // one, and `null` is what stops a caller doing maths on a value it invented.
    for (const raw of ['50vw', 'calc(100% - 2rem)', 'var(--wr-size)', '4ch', 'auto']) {
      expect(resolveCssSize(raw)).toEqual({ cssValue: raw, pxValue: null });
    }
    // Trimmed, because the value lands in a style attribute.
    expect(resolveCssSize('  50vh  ')).toEqual({ cssValue: '50vh', pxValue: null });
  });

  it('falls back to defaultValue only when the input is null or undefined', () => {
    expect(resolveCssSize(null, { defaultValue: '6rem' }).cssValue).toBe('6rem');
    expect(resolveCssSize(undefined, { defaultValue: 24 })).toEqual({ cssValue: '24px', pxValue: 24 });
    // Not for an empty string, which is a value the caller chose to pass.
    expect(resolveCssSize('', { defaultValue: 24 })).toEqual({ cssValue: '', pxValue: null });
    // And not for 0, which is the classic falsy-default bug.
    expect(resolveCssSize(0, { defaultValue: 24 })).toEqual({ cssValue: '0px', pxValue: 0 });
  });

  it('resolves to 0px when there is nothing to resolve at all', () => {
    expect(resolveCssSize(null)).toEqual({ cssValue: '0px', pxValue: 0 });
    expect(resolveCssSize(undefined)).toEqual({ cssValue: '0px', pxValue: 0 });
  });

  it('refuses a value that is neither a number nor a string', () => {
    // An object reaching a style attribute renders as `[object Object]`, so the
    // safe answer is the zero this function already returns for nothing.
    for (const raw of [{}, [], true, Symbol('x'), () => 0]) {
      expect(resolveCssSize(raw)).toEqual({ cssValue: '0px', pxValue: 0 });
    }
  });

  it('refuses a number that is not finite', () => {
    // `NaN` would otherwise render as the literal `NaNpx`.
    for (const raw of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(resolveCssSize(raw)).toEqual({ cssValue: '0px', pxValue: 0 });
    }
  });
});
