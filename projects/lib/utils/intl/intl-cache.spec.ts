import { describe, expect, it } from 'vitest';

import { wrIntlListFormat, wrIntlNumberFormat, wrIntlPluralRules } from './intl-cache';

describe('wrIntl cache', () => {
  it('builds one formatter per locale and options', () => {
    expect(wrIntlNumberFormat('en')).toBe(wrIntlNumberFormat('en'));
    expect(wrIntlNumberFormat('en', { style: 'percent' })).toBe(wrIntlNumberFormat('en', { style: 'percent' }));
    expect(wrIntlPluralRules('en')).toBe(wrIntlPluralRules('en'));
    expect(wrIntlListFormat('en', { type: 'unit' })).toBe(wrIntlListFormat('en', { type: 'unit' }));
  });

  it('keeps locale and every option in the key', () => {
    expect(wrIntlNumberFormat('en')).not.toBe(wrIntlNumberFormat('de'));
    expect(wrIntlNumberFormat('en')).not.toBe(wrIntlNumberFormat('en', { useGrouping: false }));
    expect(wrIntlNumberFormat('en', { maximumFractionDigits: 1 })).not.toBe(
      wrIntlNumberFormat('en', { maximumFractionDigits: 2 })
    );
  });

  it('is not changed by a caller mutating its options afterwards', () => {
    const options: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const first = wrIntlNumberFormat('en', options);
    options.minimumFractionDigits = 0;
    options.maximumFractionDigits = 0;

    expect(first.format(1.5)).toBe('1.50');
    expect(wrIntlNumberFormat('en', options).format(1.5)).toBe('2');
    expect(wrIntlNumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(first);
  });

  it('reads inherited options rather than reusing a formatter keyed on own ones', () => {
    wrIntlNumberFormat('en', {});
    const inherited = Object.create({ style: 'percent' }) as Intl.NumberFormatOptions;

    expect(wrIntlNumberFormat('en', inherited).format(0.5)).toBe('50%');
  });

  it('reads non-enumerable options rather than reusing a formatter keyed on enumerable ones', () => {
    wrIntlNumberFormat('en', {});
    const hidden = Object.defineProperty({}, 'style', { value: 'percent' }) as Intl.NumberFormatOptions;

    expect(wrIntlNumberFormat('en', hidden).format(0.5)).toBe('50%');
  });

  it('builds from the same reading of a getter it keys on', () => {
    let reads = 0;
    const flipping: Intl.NumberFormatOptions = {
      get style() {
        return reads++ === 0 ? 'percent' : 'decimal';
      },
    };

    wrIntlNumberFormat('fr', flipping);

    expect(wrIntlNumberFormat('fr', { style: 'percent' }).format(0.5)).toContain('%');
    expect(wrIntlNumberFormat('fr', { style: 'decimal' }).format(0.5)).toBe('0,5');
  });

  it('keys on the options themselves, not on what a toJSON says', () => {
    wrIntlNumberFormat('en', {});
    const masked = { style: 'percent', toJSON: () => ({}) } as Intl.NumberFormatOptions;

    expect(wrIntlNumberFormat('en', masked).format(0.5)).toBe('50%');
  });

  it('keeps undefined apart from NaN, so Intl still rejects the bad value', () => {
    wrIntlNumberFormat('en', { minimumIntegerDigits: undefined });

    expect(() => wrIntlNumberFormat('en', { minimumIntegerDigits: NaN })).toThrow(RangeError);
  });
});
