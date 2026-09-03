import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrI18n, wrInterpolate } from './i18n';
import type { WrI18nCatalog } from './i18n-config';
import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nStaticLoader } from './provide-wr-i18n';

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
 * Which locale wins.
 *
 * The library had three inputs and no stated order between them — `LOCALE_ID`,
 * `WR_DATE_LOCALE` and this service's own signal — and an audit found all three
 * disagreeing on one screen. The rule now: a subsystem's explicit option beats
 * the runtime locale beats `LOCALE_ID`, and `navigator.language` is not
 * consulted at all. These pin the two halves this service owns.
 */
describe('WrI18n locale precedence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.resetTestingModule());

  const settle = async (): Promise<void> => {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  };

  it('seeds the default locale from LOCALE_ID when the app states no other', async () => {
    // The whole point: an app that has told Angular what locale it is should not
    // have to tell ngwr a second time, in a second vocabulary.
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }, provideWrI18n()],
    });
    const i18n = TestBed.inject(WrI18n);
    await settle();
    expect(i18n.locale()).toBe('de-DE');
  });

  it('lets an explicit defaultLocale beat LOCALE_ID', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }, provideWrI18n({ defaultLocale: 'ru' })],
    });
    const i18n = TestBed.inject(WrI18n);
    await settle();
    expect(i18n.locale()).toBe('ru');
  });

  it('whitelists the default locale when no list was given', async () => {
    // `availableLocales` used to be a hardcoded `['en']`, so a service configured
    // with `defaultLocale: 'ru'` refused `use('ru')` — its own starting locale
    // was not one it would switch to.
    TestBed.configureTestingModule({
      providers: [provideWrI18n({ defaultLocale: 'ru' })],
    });
    const i18n = TestBed.inject(WrI18n);
    await settle();
    expect(i18n.available()).toEqual(['ru']);

    i18n.use('ru');
    expect(i18n.locale()).toBe('ru');
  });
});

/**
 * A catalog keyed by language answers an app running a full tag. Without this,
 * `ru` and `ru-RU` are unrelated strings and the miss is silent: `t()` returns
 * the key, `useI18nText` reads that as "missing", and a fully translated app
 * renders English fallbacks with nothing logged.
 */
describe('WrI18n locale chain', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.resetTestingModule());

  const settle = async (): Promise<void> => {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  };

  const mount = async (locale: string, catalogs: Record<string, WrI18nCatalog>): Promise<WrI18n> => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: locale, availableLocales: [locale] }),
        provideWrI18nStaticLoader(catalogs),
      ],
    });
    const i18n = TestBed.inject(WrI18n);
    await settle();
    return i18n;
  };

  it('falls back from the region to the language', async () => {
    const i18n = await mount('ru-RU', { ru: { greeting: 'Привет' } });
    expect(i18n.t('greeting')).toBe('Привет');
  });

  it('prefers the region catalog over the language one', async () => {
    const i18n = await mount('pt-BR', { 'pt-BR': { greeting: 'Oi' }, pt: { greeting: 'Olá' } });
    expect(i18n.t('greeting')).toBe('Oi');
  });

  it('fills a gap in the region catalog from the language one', async () => {
    const i18n = await mount('pt-BR', { 'pt-BR': { greeting: 'Oi' }, pt: { bye: 'Tchau' } });
    expect(i18n.t('bye')).toBe('Tchau');
  });

  it('does NOT extend a language into a region', async () => {
    // Truncation only. `en` reaching an `en-US` catalog would be a guess about
    // which region an unqualified language means, and there is no right answer.
    const i18n = await mount('ru', { 'ru-RU': { greeting: 'Привет' } });
    expect(i18n.t('greeting')).toBe('greeting');
  });

  it("chains the base catalogs too, which is how ngwr's own strings are found", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru-RU', availableLocales: ['ru-RU'] }),
        provideWrI18nBaseCatalogs({ ru: wrRu }),
      ],
    });
    const i18n = TestBed.inject(WrI18n);
    await settle();
    expect(i18n.t('select.noResults')).toBe('Ничего не найдено');
  });
});

/**
 * `use()` moves text and nothing else — `LOCALE_ID` is a constant and
 * `WR_DATE_LOCALE` resolves once at bootstrap. That limit is real and cannot be
 * fixed from inside this service; what it CAN do is stop being silent about it.
 * The failure it replaces is a screen of German labels beside `3/15/2026`.
 */
describe('WrI18n runtime-switch warning', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  const mount = async (localeId: string): Promise<WrI18n> => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: localeId },
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'de-DE'] }),
      ],
    });
    const i18n = TestBed.inject(WrI18n);
    TestBed.tick();
    await Promise.resolve();
    return i18n;
  };

  it('names what a runtime switch cannot reach', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const i18n = await mount('en-US');

    i18n.use('de-DE');

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain('de-DE');
    expect(message).toContain('en-US');
    expect(message).toContain('LOCALE_ID');
  });

  it('says it once, not on every switch', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const i18n = await mount('en-US');

    i18n.use('de-DE');
    i18n.use('en');
    i18n.use('de-DE');

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the switch lands back on LOCALE_ID', async () => {
    // Nothing is out of step there, so there is nothing to report — and a
    // warning that fires when everything agrees is one people learn to ignore.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const i18n = await mount('de-DE');

    i18n.use('de-DE');
    expect(warn).not.toHaveBeenCalled();
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
    // Parity between the two catalogs says nothing about a key NEITHER of them
    // has. A miss is silent by design — `useI18nText` reads "translation === key"
    // as absent and serves the English fallback — so a Russian app renders
    // English and every other gate stays green. `imageCropper.window` and
    // `.keyHelp` reached `main` exactly that way.
    //
    // The first version of this gate matched the call with one regex whose
    // optional first-argument group was `[^,()]+`. That cannot cross a
    // parenthesis, so every `useI18nText(signal(null), 'key', …)` matched
    // NOTHING and its key went unchecked — five toast keys among them — and
    // `useI18nFormatter` was not in the alternation at all. Twenty of the
    // library's keys were invisible to a gate whose whole job was to see them,
    // and the `> 50` floor could not tell, because 150 clears it.
    //
    // So: find the call, take its argument list by matching parentheses, and
    // read the first dotted literal inside. Then assert every call yielded one,
    // which is what makes a future call shape fail loudly instead of quietly.
    //
    // Anchored on the workspace root walked up from `process.cwd()`, never on
    // `import.meta.url` — the builder bundles specs, and that URL points inside
    // the bundle. It is the trap that made the MCP suite compile the wrong
    // tsconfig in CI while passing locally.
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
          // Comments blanked, newlines kept so nothing shifts line for line. A
          // JSDoc `@example` spells calls that no code makes: `wr-meta`'s block
          // shows `i18n.t('home.title')`, and read raw that is a key the library
          // asks for and the catalog does not have — a red gate pointing at an
          // illustration. Same reason the api-docs extractor blanks before it
          // scans.
          sources.push(
            readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, c => c.replace(/[^\n]/g, ' '))
          );
        }
      }
    };
    walk(join(root, 'projects/lib'));

    /** The text between a call's opening paren and its matching close. */
    const argsAt = (text: string, from: number): string => {
      let depth = 1;
      let i = from;
      while (i < text.length && depth > 0) {
        const c = text[i++];
        if (c === '(') depth++;
        else if (c === ')') depth--;
      }
      return text.slice(from, i - 1);
    };

    const asked = new Set<string>();
    // Prefixes reached by a template literal — `t(`validation.${key}`)` — where
    // the leaf is a runtime value and no literal key exists to find. The subtree
    // under one of these counts as read.
    const askedPrefixes = new Set<string>();
    let calls = 0;
    let keyless = 0;
    for (const text of sources) {
      for (const m of text.matchAll(/\b(?:useI18nText|readI18nText|useI18nFormatter)\s*\(/g)) {
        calls++;
        const key = /'(\w+(?:\.\w+)+)'/.exec(argsAt(text, m.index + m[0].length));
        if (key) asked.add(key[1]);
        else keyless++;
      }
      // A direct `i18n.t('some.key')`, which the three helpers above are built
      // on and which four components call straight. Not counted toward `calls`:
      // `.t(` also matches unrelated members, so a miss here is not evidence of
      // a call shape going unread the way it is for the helpers.
      for (const m of text.matchAll(/\.t\s*\(\s*'(\w+(?:\.\w+)+)'/g)) asked.add(m[1]);
      for (const m of text.matchAll(/`(\w+(?:\.\w+)*\.)\$\{/g)) askedPrefixes.add(m[1]);
    }

    // Every call must have produced a key. A call shape this cannot read is the
    // failure mode that made the previous version useless, so it fails here
    // rather than shrinking the set it checks.
    expect(keyless, 'i18n calls whose key this spec could not read').toBe(0);
    // A floor, so a walk that matched nothing cannot pass.
    expect(calls).toBeGreaterThan(150);

    // The dotted-key assumption the matcher rests on.
    expect(keysOf(wrEn).filter(key => !key.includes('.'))).toEqual([]);

    const have = new Set(keysOf(wrEn));
    expect([...asked].filter(key => !have.has(key)).sort()).toEqual([]);

    // And the inverse, which is the half that was missing. A shipped key nothing
    // reads is not a translation — it is a promise to a consumer that their
    // override will do something, and it will not. The v14 pagination work left
    // `pagination.of` exactly there: the component stopped assembling the range
    // around it and read one whole `pagination.range` template instead, so every
    // consumer catalog that had translated `of` silently reverted to English
    // with nothing said. Same reasoning as `check:tokens` for a `--wr-*` nobody
    // paints with, and the same escape hatch: a key kept on purpose goes in the
    // list below WITH the reason, so the decision is made out loud rather than
    // by omission.
    // A catalog key is public API in its own right — a consumer may write
    // `{{ 'common.save' | wrT }}` for a string the library itself never renders
    // — so "unread" is not automatically a defect. What is a defect is a key the
    // library USED to read and quietly stopped, because the consumer override
    // that used to work now does nothing and nothing says so.
    //
    // Every entry below was checked against `git log -S`: all of them have been
    // unread since `ngwr/i18n` first shipped, so none is an abandonment. They
    // are the vocabulary half, and they stay.
    const KEPT_UNREAD: ReadonlyMap<string, string> = new Map<string, string>([
      ['common.add', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.back', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.cancel', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.clear', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.close', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.confirm', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.delete', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.edit', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.loading', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.next', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.of', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.ok', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.previous', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.remove', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.save', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.search', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.select', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.today', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.tomorrow', 'shared vocabulary offered to consumers; no component renders it'],
      ['common.yesterday', 'shared vocabulary offered to consumers; no component renders it'],
      ['date.months.jan', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.feb', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.mar', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.apr', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.may', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.jun', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.jul', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.aug', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.sep', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.oct', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.nov', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['date.months.dec', 'adapters take month names from Intl; kept for a consumer rendering its own calendar'],
      ['fileUpload.invalid', 'validation copy a host supplies its own message for'],
      ['fileUpload.tooBig', 'validation copy a host supplies its own message for'],
      ['select.empty', 'the empty state is projected content; this is a default a host can reach for'],
      [
        'pagination.pageOf',
        'compact mode renders `pagination.compact`; this long form has been unread since it shipped',
      ],
    ]);

    const reached = (key: string): boolean =>
      asked.has(key) || [...askedPrefixes].some(prefix => key.startsWith(prefix));

    const unread = [...have].filter(key => !reached(key) && !KEPT_UNREAD.has(key)).sort();
    expect(unread, 'catalog keys nothing in the library reads').toEqual([]);
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
