import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
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

/** Every key in one catalog must exist in the other. */
const flatKeys = (o: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? flatKeys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

describe('the shipped catalogs', () => {
  it('carry exactly the same keys in en and ru', () => {
    // A key added to one locale and forgotten in the other resolves to the key
    // ITSELF for those users — `t()` returns the key on a miss — so the UI
    // quietly starts announcing `datePicker.panel` instead of a sentence.
    // `form-errors.spec.ts` guards only the `validation.*` subtree; this is the
    // whole catalog.
    const en = flatKeys(wrEn);
    const ru = flatKeys(wrRu);

    expect({ missingFromRu: en.filter(k => !ru.includes(k)), missingFromEn: ru.filter(k => !en.includes(k)) }).toEqual({
      missingFromRu: [],
      missingFromEn: [],
    });
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

/**
 * The two shipped catalogs have to describe the same keys. A key added to `wrEn`
 * alone is invisible: `useI18nText` treats "translation === key" as missing and
 * quietly substitutes the component's English default, so a Russian app renders
 * English with nothing anywhere reporting a gap — and no build gate compares the
 * two files.
 */
describe('the shipped catalogs', () => {
  const keysOf = (node: unknown, prefix = ''): string[] =>
    Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      value !== null && typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
    );

  it('cover exactly the same keys in both locales', () => {
    const en = keysOf(wrEn);
    const ru = keysOf(wrRu);

    expect(en.length).toBeGreaterThan(100);
    expect([...ru].sort()).toEqual([...en].sort());
  });

  it('carry every key the library actually asks for', () => {
    // Parity between the two catalogs was checked; whether a key a COMPONENT
    // reads exists in either of them was not. A miss is silent by design —
    // `useI18nText` treats "translation === key" as absent and serves the
    // English fallback — so a Russian app renders English and every gate stays
    // green. Not hypothetical: `imageCropper.window` and `imageCropper.keyHelp`
    // reached `main` read by the component and absent from both catalogs, with
    // 3881 specs passing either side of the gap.
    //
    // Anchored on the workspace root walked up from `process.cwd()`, never on
    // `import.meta.url`: the builder BUNDLES specs, so that URL points inside
    // the bundle — the trap that made the MCP suite compile the wrong tsconfig
    // in CI and pass locally.
    const root = ((): string => {
      let dir = process.cwd();
      for (;;) {
        if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(join(dir, 'angular.json'))) return dir;
        const up = dirname(dir);
        if (up === dir) throw new Error(`no workspace root above ${process.cwd()}`);
        dir = up;
      }
    })();

    const sources: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'i18n' && entry.name !== 'node_modules') walk(full);
        } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
          sources.push(readFileSync(full, 'utf8'));
        }
      }
    };
    walk(join(root, 'projects/lib'));

    const asked = new Set<string>();
    for (const text of sources) {
      // The key must be DOTTED, and that is not cosmetic: the leading group is
      // optional and greedy, so on the two-argument form
      // `readI18nText('datePicker.hours', 'Hours')` it happily consumes the key
      // and captures the FALLBACK — which then reads as a missing catalog entry
      // called "Hours". Every shipped key is `<component>.<name>`; the assertion
      // below that no top-level scalar exists keeps that true.
      for (const m of text.matchAll(/(?:useI18nText|readI18nText)\s*\(\s*(?:[^,()]+,\s*)?'(\w+(?:\.\w+)+)'/g)) {
        asked.add(m[1]);
      }
    }

    // A floor, so a walk that silently matched nothing cannot pass this test.
    expect(asked.size).toBeGreaterThan(50);

    // The dotted-key assumption the matcher rests on.
    expect(keysOf(wrEn).filter(key => !key.includes('.'))).toEqual([]);

    const have = new Set(keysOf(wrEn));
    expect([...asked].filter(key => !have.has(key)).sort()).toEqual([]);
  });

  it('leave no value empty, in either locale', () => {
    // An empty string resolves as a real translation rather than a miss, so it
    // reaches the DOM — as a nameless button, in the aria cases.
    for (const [locale, catalog] of [
      ['en', wrEn],
      ['ru', wrRu],
    ] as const) {
      const empty = keysOf(catalog).filter(key => {
        const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], catalog);
        return typeof value === 'string' && value.trim() === '';
      });
      expect(empty, `${locale} has empty values`).toEqual([]);
    }
  });
});
