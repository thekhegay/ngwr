import { LOCALE_ID, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { clamp, round } from 'ngwr/utils';
import { describe, expect, it } from 'vitest';

import { chartAxis } from './axis';
import { useChartNumbers } from './numbers';
import type { WrChartNumbers } from './types';

/*
 * The oracles: the per-chart code `useChartNumbers` replaces, copied verbatim from
 * v15.0 (`line-chart.ts`, `bar-chart.ts`; the `formatValue` below is the one all seven
 * charts carried, character for character). The shared writer is held to produce
 * exactly what they produced, in every locale tried, so moving a chart onto it can
 * change no number on any page.
 */

function v15FormatValue(locale: string, custom: ((value: number) => string) | null, value: number): string {
  const numbers = new Intl.NumberFormat(locale);
  const smallNumbers = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 });
  if (custom) return custom(value);
  return (value !== 0 && Math.abs(value) < 1 ? smallNumbers : numbers).format(value);
}

function v15BarLabel(locale: string, custom: ((value: number) => string) | null, value: number): string {
  const compactNumbers = new Intl.NumberFormat(locale, { notation: 'compact' });
  if (custom || Math.abs(value) < 1000) return v15FormatValue(locale, custom, value);
  return compactNumbers.format(value);
}

const TICK_COUNT = 4;

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const nice = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return nice * magnitude;
}

function fractionDigits(value: number): number {
  for (let d = 0; d <= 6; d++) if (Math.abs(value * 10 ** d - Math.round(value * 10 ** d)) < 1e-9) return d;
  return 6;
}

function magnitude(value: number): number {
  const abs = Math.abs(value);
  let m = Math.floor(Math.log10(abs));
  if (10 ** (m + 1) <= abs) m++;
  if (10 ** m > abs) m--;
  return m;
}

function lastDigit(step: number): number {
  for (let e = magnitude(step); e > -21; e--) {
    const scaled = step / 10 ** e;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return e;
  }
  return -21;
}

/** `WrLineChart.bounds` and `.yTicks`, without the viewBox `y`. */
function v15LineAxis(all: readonly number[]): { min: number; max: number; step: number; ticks: number[] } {
  const bounds = ((): { min: number; max: number; step: number } => {
    if (all.length === 0) return { min: 0, max: 1, step: 0.25 };
    const rawMin = Math.min(0, Math.min(...all));
    const rawMax = Math.max(...all);
    const span = rawMax - rawMin || Math.abs(rawMax) || 1;
    const step = niceStep(span / TICK_COUNT);
    const min = Math.floor(rawMin / step) * step;
    let max = Math.ceil(rawMax / step) * step;
    if (max === rawMax) max += step;
    return { min, max, step };
  })();
  const ticks: number[] = [];
  const count = Math.round((bounds.max - bounds.min) / bounds.step);
  for (let i = 0; i <= count; i++) ticks.push(round(bounds.max - i * bounds.step, 6));
  return { ...bounds, ticks };
}

/** `WrLineChart.tickLabels`. */
function v15TickLabels(
  locale: string,
  custom: ((value: number) => string) | null,
  ticks: readonly number[],
  step: number
): string[] {
  if (custom) return ticks.map(tick => custom(tick));
  const last = lastDigit(step);
  const full = new Intl.NumberFormat(locale, { maximumFractionDigits: fractionDigits(step) });
  const plain = ticks.map(tick => full.format(tick));
  const compact = ticks.map(value =>
    value === 0
      ? full.format(0)
      : new Intl.NumberFormat(locale, {
          notation: 'compact',
          maximumSignificantDigits: clamp(magnitude(value) - last + 1, 1, 21),
        }).format(value)
  );
  const longest = (labels: readonly string[]): number => Math.max(...labels.map(label => label.length));
  return longest(compact) <= longest(plain) ? compact : plain;
}

/** A small seeded generator (Park–Miller), so the sweep is wide and the same on every run. */
function prng(seed: number): () => number {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const LOCALES = ['en-US', 'en', 'de', 'fr', 'es', 'pt-BR', 'ru', 'uk', 'pl', 'tr', 'ja', 'zh', 'ko', 'hi', 'ar', 'he'];

const VALUES = [
  0,
  1,
  -1,
  0.5,
  0.25,
  0.0004,
  -0.0004,
  0.000123456,
  0.123456,
  0.999,
  1.5,
  12.5,
  -12.5,
  99.95,
  999,
  999.4,
  999.5,
  1000,
  1001,
  1234.5,
  -1234.5,
  9999,
  12_345,
  99_999,
  999_999,
  1_000_000,
  1_250_000,
  3_400_000,
  -7_500_000,
  1_200_000_000,
  4.2e12,
  1e15,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];

/** Data sets the line chart's own spec pins, plus a seeded sweep across fifteen orders of magnitude. */
const SERIES: readonly (readonly number[])[] = (() => {
  const pinned = [
    [3, 12, 18, 9, 22, 30, 35],
    [12, 23],
    [100, 8400],
    [0.2, 0.9],
    [400, 1000],
    [-1050, -950],
    [0, 3_400_000],
    [0, 1_200_000_000],
    [0.0001, 0.0009],
    [1234.5, 3_400_000, 2_000_000],
    [5, 5, 5],
    [0, 0],
    [-3, -3],
    [-20, 40],
    [0.0004, 0.0012, 1234.5],
    [],
  ];
  const random = prng(1501);
  const swept: number[][] = [];
  for (let i = 0; i < 160; i++) {
    const scale = 10 ** Math.floor(random() * 15 - 5);
    const length = 2 + Math.floor(random() * 6);
    const signed = random() < 0.3;
    swept.push(Array.from({ length }, () => (random() - (signed ? 0.5 : 0)) * scale));
  }
  return [...pinned, ...swept];
})();

const format = (custom: ((value: number) => string) | null = null, locale = 'en-US'): WrChartNumbers =>
  useChartNumbers(signal(custom), locale);

describe('useChartNumbers', () => {
  describe('writes exactly what the v15 charts wrote', () => {
    it.each(LOCALES)('a full value, in %s', locale => {
      const numbers = format(null, locale);
      for (const value of VALUES) expect(numbers.value(value), String(value)).toBe(v15FormatValue(locale, null, value));
    });

    it.each(LOCALES)("a bar's label, in %s", locale => {
      const numbers = format(null, locale);
      for (const value of VALUES) expect(numbers.label(value), String(value)).toBe(v15BarLabel(locale, null, value));
    });

    it.each(LOCALES)("the line chart's y axis, in %s", locale => {
      const numbers = format(null, locale);
      for (const data of SERIES) {
        const oracle = v15LineAxis(data);
        const axis =
          data.length === 0 ? chartAxis(Number.NaN, Number.NaN) : chartAxis(Math.min(0, ...data), Math.max(...data));
        expect({ min: axis.min, max: axis.max, step: axis.step }, String(data)).toEqual({
          min: oracle.min,
          max: oracle.max,
          step: oracle.step,
        });
        expect(axis.ticks, String(data)).toEqual(oracle.ticks);
        expect(numbers.ticks(axis.ticks, axis.step), String(data)).toEqual(
          v15TickLabels(locale, null, oracle.ticks, oracle.step)
        );
      }
    });

    it('a custom `valueFormat`, in all three', () => {
      const custom = (value: number): string => `${value} ms`;
      const numbers = format(custom, 'de');
      for (const value of VALUES) {
        expect(numbers.value(value)).toBe(v15FormatValue('de', custom, value));
        expect(numbers.label(value)).toBe(v15BarLabel('de', custom, value));
      }
      expect(numbers.ticks([40, 30, 20, 10, 0], 10)).toEqual(v15TickLabels('de', custom, [40, 30, 20, 10, 0], 10));
    });
  });

  it('never abbreviates a full value, and keeps a tiny one off zero', () => {
    const numbers = format();
    expect(numbers.value(1234.5)).toBe('1,234.5');
    expect(numbers.value(3_400_000)).toBe('3,400,000');
    expect(numbers.value(0.0004)).toBe('0.0004');
  });

  it('abbreviates a label from a thousand up and not below', () => {
    const numbers = format();
    expect(numbers.label(999.5)).toBe('999.5');
    expect(numbers.label(12.5)).toBe('12.5');
    expect(numbers.label(1234)).toBe('1.2K');
    expect(numbers.label(-3_400_000)).toBe('-3.4M');
  });

  it('decides the ticks for the whole axis', () => {
    const numbers = format();
    expect(numbers.ticks([1250, 1000, 750, 500, 250, 0], 250)).toEqual(['1.25K', '1K', '750', '500', '250', '0']);
    // Too fine a step for the abbreviation to be shorter: every tick in full.
    expect(numbers.ticks([-925, -950, -975, -1000, -1025, -1050], 25)).toEqual([
      '-925',
      '-950',
      '-975',
      '-1,000',
      '-1,025',
      '-1,050',
    ]);
    expect(numbers.ticks([], 1)).toEqual([]);
  });

  it("follows the locale's own units", () => {
    expect(format(null, 'de').ticks([4e6, 3e6, 2e6, 1e6, 0], 1e6)).toEqual([
      '4 Mio.',
      '3 Mio.',
      '2 Mio.',
      '1 Mio.',
      '0',
    ]);
    expect(format(null, 'de').value(1234.5)).toBe('1.234,5');
  });

  it('reads `valueFormat` on every call, so a computed follows it', () => {
    const custom = signal<((value: number) => string) | null>(null);
    const numbers = useChartNumbers(custom, 'en-US');
    const text = computed(() => numbers.value(1234.5));
    expect(text()).toBe('1,234.5');
    custom.set(value => value.toFixed(2));
    expect(text()).toBe('1234.50');
  });

  it("hands the formatter the chart's own extra arguments", () => {
    const seen: string[] = [];
    const custom = signal<((value: number, axis: 'x' | 'y') => string) | null>((value, axis) => {
      seen.push(axis);
      return `${axis}=${value}`;
    });
    const numbers = useChartNumbers(custom, 'en-US');
    expect(numbers.value(2, 'x')).toBe('x=2');
    expect(numbers.label(3000, 'y')).toBe('y=3000');
    expect(numbers.ticks([1, 0], 1, 'y')).toEqual(['y=1', 'y=0']);
    expect(seen).toEqual(['x', 'y', 'y', 'y']);
  });

  it('takes LOCALE_ID by default', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const numbers = TestBed.runInInjectionContext(() => useChartNumbers(signal(null)));
    expect(numbers.value(1234.5)).toBe('1.234,5');
  });
});
