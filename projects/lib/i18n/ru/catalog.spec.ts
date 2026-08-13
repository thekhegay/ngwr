import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { describe, expect, it } from 'vitest';

/** Flatten the nested catalog into the dotted keys `WrI18n.t()` actually resolves. */
function flatten(node: unknown, path = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const dotted = path ? `${path}.${key}` : key;
    if (typeof value === 'object' && value !== null) flatten(value, dotted, out);
    else out[dotted] = value as string;
  }
  return out;
}

/** The `{{tokens}}` a string interpolates, sorted, so two strings can be compared. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map(match => match[1]).sort();
}

/**
 * The Russian catalog owes the English one two things that `i18n.spec.ts` does not
 * check, and both fail silently.
 *
 * A placeholder that went missing in translation is the worse of the two:
 * `wrInterpolate` substitutes what it finds and no more, so a Russian
 * `"Найдено совпадений"` that lost its `{{count}}` renders a sentence with the number
 * cut out of it — no throw, no console warning, and the English string it was copied
 * from still reads perfectly. A placeholder that gained a name is the mirror image: it
 * resolves to an empty string, because nothing passes a param nobody asked for.
 *
 * The other is a value that was never translated at all — a key copied across during a
 * catalog addition and left in English. Two strings legitimately look untranslated and
 * are named below.
 */
describe('wrRu', () => {
  const ru = flatten(wrRu);
  const en = flatten(wrEn);
  const entries = Object.entries(ru);

  /**
   * The two values that are correctly identical in both catalogs: an initialism Russian
   * spells the same way, and a bare numeric ratio with no words in it.
   */
  const SHARED_WITH_ENGLISH = new Set(['common.ok', 'transfer.count']);

  it('is a nested object of plain strings, all the way down', () => {
    for (const [key, value] of entries) {
      expect(typeof value, key).toBe('string');
    }
  });

  it('carries no leading or trailing whitespace', () => {
    for (const [key, value] of entries) {
      expect(value, key).toBe(value.trim());
    }
  });

  it('interpolates exactly the placeholders its English counterpart does', () => {
    for (const [key, value] of entries) {
      expect(placeholders(value), key).toEqual(placeholders(en[key] ?? ''));
    }
  });

  it('writes every placeholder in a form the interpolator will resolve', () => {
    for (const [key, value] of entries) {
      const braces = value.match(/\{\{|\}\}/g)?.length ?? 0;
      expect(braces % 2, `${key} has an unbalanced brace pair`).toBe(0);

      for (const token of value.match(/\{\{[^}]*\}\}/g) ?? []) {
        expect(token, key).toMatch(/^\{\{\s*[\w.-]+\s*\}\}$/);
      }
    }
  });

  it('is actually in Russian, apart from the two strings that are not words', () => {
    for (const [key, value] of entries) {
      if (SHARED_WITH_ENGLISH.has(key)) continue;
      if (!/\p{Script=Latin}/u.test(value)) continue;

      expect(/\p{Script=Cyrillic}/u.test(value), `${key} looks like it was left in English`).toBe(true);
    }
  });

  it('has nothing left in that list that is no longer identical', () => {
    // The allowlist above is the kind of thing that outlives its reason. If a
    // translation lands for one of these, this fails and the entry comes out.
    for (const key of SHARED_WITH_ENGLISH) {
      expect(ru[key], `${key} is translated now — drop it from SHARED_WITH_ENGLISH`).toBe(en[key]);
    }
  });
});
