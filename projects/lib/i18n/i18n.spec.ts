import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrI18n, wrInterpolate } from './i18n';
import { provideWrI18n, provideWrI18nStaticLoader } from './provide-wr-i18n';

describe('wrInterpolate', () => {
  it('substitutes named placeholders, whitespace and all', () => {
    expect(wrInterpolate('Hello {{name}}', { name: 'Ada' })).toBe('Hello Ada');
    expect(wrInterpolate('Hello {{ name }}', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('stringifies numbers and booleans rather than dropping them', () => {
    // `0` and `false` are the ones a truthiness check would silently eat, and
    // they are exactly what a validation message interpolates.
    expect(wrInterpolate('{{min}} or more', { min: 0 })).toBe('0 or more');
    expect(wrInterpolate('{{flag}}', { flag: false })).toBe('false');
  });

  it('resolves a missing, null or undefined param to an empty string', () => {
    expect(wrInterpolate('a{{nope}}b', { other: 1 })).toBe('ab');
    expect(wrInterpolate('a{{x}}b', { x: null })).toBe('ab');
    expect(wrInterpolate('a{{x}}b', { x: undefined })).toBe('ab');
  });

  it('returns the template untouched when there are no params at all', () => {
    // Not the same as `{}`: a template with no params must survive verbatim so
    // a literal `{{x}}` in copy is not silently blanked.
    expect(wrInterpolate('keep {{x}}', undefined)).toBe('keep {{x}}');
    expect(wrInterpolate('drop {{x}}', {})).toBe('drop ');
  });

  it('replaces every occurrence, not just the first', () => {
    expect(wrInterpolate('{{a}}-{{a}}', { a: 'x' })).toBe('x-x');
  });

  it('accepts dots and dashes in a placeholder name', () => {
    expect(wrInterpolate('{{a.b}} {{c-d}}', { 'a.b': 1, 'c-d': 2 })).toBe('1 2');
  });
});

describe('WrI18n', () => {
  // `use()` writes the locale to `WrStorage`, and `initialLocale()` reads it
  // back — so without this every test after the first one starts in whatever
  // locale its predecessor left behind. jsdom's localStorage outlives TestBed.
  beforeEach(() => localStorage.clear());

  // The root catalog is loaded from an `effect`, and the loader is async even
  // when it is serving an object literal — so a test has to run change
  // detection and then let the microtask queue drain before reading anything.
  const settle = async (): Promise<void> => {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  };

  const setup = async (): Promise<WrI18n> => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'ru'] }),
        provideWrI18nStaticLoader({
          en: { greeting: 'Hello {{name}}', nested: { deep: 'Deep EN' } },
          ru: { greeting: 'Привет, {{name}}', nested: { deep: 'Глубоко' } },
        }),
      ],
    });
    const i18n = TestBed.inject(WrI18n);
    await settle();
    return i18n;
  };

  it('starts on the default locale', async () => {
    expect((await setup()).locale()).toBe('en');
  });

  it('resolves a dotted key through nested objects', async () => {
    expect((await setup()).t('nested.deep')).toBe('Deep EN');
  });

  it('interpolates params', async () => {
    expect((await setup()).t('greeting', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('returns the key itself when it is missing — the signal callers test for', async () => {
    // `useI18nText` treats "translation === key" as missing and swaps in the
    // component's own fallback, so this return value is load-bearing.
    expect((await setup()).t('no.such.key')).toBe('no.such.key');
  });

  it('switches locale and re-resolves', async () => {
    const i18n = await setup();
    i18n.use('ru');
    await settle();
    expect(i18n.locale()).toBe('ru');
    expect(i18n.t('greeting', { name: 'Ада' })).toBe('Привет, Ада');
  });

  it('ignores a locale that is not on the whitelist', async () => {
    const i18n = await setup();
    i18n.use('de');
    expect(i18n.locale()).toBe('en');
  });

  it('exposes the configured locales', async () => {
    expect((await setup()).available()).toEqual(['en', 'ru']);
  });

  it('remembers the locale across service instances', async () => {
    const first = await setup();
    first.use('ru');
    TestBed.resetTestingModule();

    // A fresh injector, and it still comes up Russian — that persistence is the
    // point of `storageKey`, and the reason these tests clear storage.
    expect((await setup()).locale()).toBe('ru');
  });

  it('translate() is reactive to a locale change', async () => {
    const i18n = await setup();
    const greeting = i18n.translate('greeting', { name: 'Ada' });
    expect(greeting()).toBe('Hello Ada');

    i18n.use('ru');
    await settle();
    expect(greeting()).toBe('Привет, Ada');
  });
});
