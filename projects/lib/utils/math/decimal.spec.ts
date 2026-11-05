import { describe, expect, it } from 'vitest';

import {
  wrDecimal,
  wrDecimalAdd,
  wrDecimalCompare,
  wrDecimalDivide,
  wrDecimalMultiply,
  wrDecimalRound,
  wrDecimalSubtract,
} from './decimal';

describe('wrDecimal', () => {
  it('canonicalises a decimal string digit for digit', () => {
    expect(wrDecimal('00.10')).toBe('0.10');
    expect(wrDecimal(' -5. ')).toBe('-5');
    expect(wrDecimal('.5')).toBe('0.5');
    expect(wrDecimal('+7')).toBe('7');
    expect(wrDecimal('-0')).toBe('0');
    expect(wrDecimal('-0.00')).toBe('0.00');
    expect(wrDecimal('9007199254740993.01')).toBe('9007199254740993.01');
  });

  it('keeps trailing fraction zeros as precision', () => {
    expect(wrDecimal('1.50')).toBe('1.50');
  });

  it('reads a number from its shortest form, and a bigint whole', () => {
    expect(wrDecimal(0.1)).toBe('0.1');
    expect(wrDecimal(-0)).toBe('0');
    expect(wrDecimal(1e21)).toBe('1000000000000000000000');
    expect(wrDecimal(1e-7)).toBe('0.0000001');
    expect(wrDecimal(12345678901234567890n)).toBe('12345678901234567890');
  });

  it('reads exponent notation exactly', () => {
    expect(wrDecimal('1e5')).toBe('100000');
    expect(wrDecimal('1.5E-3')).toBe('0.0015');
    expect(wrDecimal('2.5e+1')).toBe('25');
  });

  it.each([
    ['', null],
    ['   ', null],
    ['abc', null],
    ['1.2.3', null],
    ['1,5', null],
    ['Infinity', null],
    ['-Infinity', null],
    ['NaN', null],
    ['1e', null],
    ['.', null],
    ['-', null],
    ['0x10', null],
    ['1e1001', null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    [null, null],
    [undefined, null],
    [{}, null],
    [true, null],
  ])('reads %j as malformed, never as zero', (input, expected) => {
    expect(wrDecimal(input)).toBe(expected);
  });
});

describe('wrDecimalAdd and wrDecimalSubtract', () => {
  it('adds without float error', () => {
    expect(wrDecimalAdd('0.1', '0.2')).toBe('0.3');
    expect(wrDecimalAdd(0.1, 0.2)).toBe('0.3');
  });

  it('carries the wider scale', () => {
    expect(wrDecimalAdd('10.00', '0.5')).toBe('10.50');
    expect(wrDecimalSubtract('1', '0.25')).toBe('0.75');
  });

  it('crosses zero and signs', () => {
    expect(wrDecimalSubtract('0.1', '0.3')).toBe('-0.2');
    expect(wrDecimalAdd('-1.5', '1.5')).toBe('0.0');
  });

  it('keeps digits a double cannot hold', () => {
    expect(wrDecimalAdd('9007199254740993.01', '0.01')).toBe('9007199254740993.02');
  });

  it('refuses a malformed side', () => {
    expect(wrDecimalAdd('1', 'abc')).toBeNull();
    expect(wrDecimalSubtract(null, '1')).toBeNull();
  });
});

describe('wrDecimalMultiply', () => {
  it('adds the scales', () => {
    expect(wrDecimalMultiply('1.5', '0.25')).toBe('0.375');
    expect(wrDecimalMultiply('19.99', 3)).toBe('59.97');
    expect(wrDecimalMultiply('0.1', 3)).toBe('0.3');
    expect(wrDecimalMultiply('-2', '0.5')).toBe('-1.0');
  });

  it('refuses a malformed side', () => {
    expect(wrDecimalMultiply('1', '')).toBeNull();
  });
});

describe('wrDecimalDivide', () => {
  it('rounds half away from zero at the given places', () => {
    expect(wrDecimalDivide('10', 3, 2)).toBe('3.33');
    expect(wrDecimalDivide('2', 3, 2)).toBe('0.67');
    expect(wrDecimalDivide('-2.5', 1, 0)).toBe('-3');
    expect(wrDecimalDivide('2.5', 1, 0)).toBe('3');
    expect(wrDecimalDivide('1', 8, 2)).toBe('0.13');
    expect(wrDecimalDivide('-1', 8, 2)).toBe('-0.13');
  });

  it('pads an exact quotient to the places asked for', () => {
    expect(wrDecimalDivide('1', '4', 4)).toBe('0.2500');
    expect(wrDecimalDivide('6', '3', 0)).toBe('2');
  });

  it('refuses zero, a malformed side and a bad scale', () => {
    expect(wrDecimalDivide('1', '0', 2)).toBeNull();
    expect(wrDecimalDivide('x', '1', 2)).toBeNull();
    expect(wrDecimalDivide('1', '3', -1)).toBeNull();
    expect(wrDecimalDivide('1', '3', 1.5)).toBeNull();
  });
});

describe('wrDecimalCompare', () => {
  it('orders by value, not by scale', () => {
    expect(wrDecimalCompare('1.50', '1.5')).toBe(0);
    expect(wrDecimalCompare('0.1', '0.10000000001')).toBe(-1);
    expect(wrDecimalCompare('-1', '-2')).toBe(1);
    expect(wrDecimalCompare('9007199254740993', 9007199254740992)).toBe(1);
  });

  it('sorts', () => {
    expect(['10', '9.5', '-1', '0.25'].sort((a, b) => wrDecimalCompare(a, b) ?? 0)).toEqual([
      '-1',
      '0.25',
      '9.5',
      '10',
    ]);
  });

  it('refuses a malformed side', () => {
    expect(wrDecimalCompare('1', 'abc')).toBeNull();
  });
});

describe('wrDecimalRound', () => {
  it('pads or rounds to exactly the places asked for', () => {
    expect(wrDecimalRound('1.5', 2)).toBe('1.50');
    expect(wrDecimalRound('2.345', 2)).toBe('2.35');
    expect(wrDecimalRound('2.344', 2)).toBe('2.34');
    expect(wrDecimalRound('-2.5', 0)).toBe('-3');
    expect(wrDecimalRound('-2.4', 0)).toBe('-2');
    expect(wrDecimalRound('0.999', 2)).toBe('1.00');
    expect(wrDecimalRound('7', 0)).toBe('7');
  });

  it('rounds what the digits say, with no float on the way', () => {
    expect(wrDecimalRound('1.005', 2)).toBe('1.01');
    expect(wrDecimalRound('1000000001.00000000005', 10)).toBe('1000000001.0000000001');
  });

  it('refuses a malformed value and a bad scale', () => {
    expect(wrDecimalRound('abc', 2)).toBeNull();
    expect(wrDecimalRound('1', -1)).toBeNull();
    expect(wrDecimalRound('1', Number.NaN)).toBeNull();
  });
});
