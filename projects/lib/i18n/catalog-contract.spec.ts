/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrEn } from 'ngwr/i18n/en';
import { describe, expect, it } from 'vitest';

import type { WrI18nCatalog } from './i18n-config';

/**
 * What every shipped catalog owes the English one, in one place.
 *
 * There are twenty-two of them. Written out per locale this would be twenty-two
 * copies of the same six assertions, which is a set that stops being updated
 * after the third — so each locale's own `catalog.spec.ts` is eight lines that
 * hand its catalog to `expectCatalogContract` with the two things only that
 * locale knows: the script its prose is written in, and which of its values are
 * correctly identical to English.
 *
 * **What this deliberately does NOT check, because no assertion could tell a
 * good translation from a bad one:** whether the copy reads naturally, whether
 * the register is right for a UI, and — the one that matters most here —
 * whether a count reads correctly at one. `wrInterpolate` substitutes and does
 * nothing else, so there is no plural machinery anywhere in this library: a
 * translator has to put the count last or choose a count-neutral word, exactly
 * as the English catalog does. English morphology makes that mechanically
 * detectable (a trailing `-s` after `{{count}}`) and nothing else's does, so
 * that one assertion lives in `en/catalog.spec.ts` and this file does not
 * pretend to generalise it.
 */

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
 * The reference catalog runs the contract here rather than in `en/catalog.spec.ts`.
 *
 * Nothing about that is a special case: every locale is checked by exactly one
 * `expectCatalogContract` call, and English's sits beside the definition because
 * it is what the other twenty-one are compared AGAINST — a change to this file
 * that stopped checking anything would otherwise be invisible until a
 * translation regressed. `en/catalog.spec.ts` keeps the one rule that is
 * English's alone.
 */
describe('wrEn (the reference)', () => {
  expectCatalogContract('en', wrEn);
});

/**
 * A locale's own facts.
 *
 * `script` is the Unicode script its prose is written in, and it is the STRONG
 * form of "this was actually translated": a Cyrillic, Arabic or Han catalog
 * cannot accidentally pass while holding English. A Latin-script locale has no
 * such tell, so those fall back to "differs from English", which is weaker —
 * it cannot see a German string left as a plausible English word — and that is
 * why `sharedWithEnglish` has to be justified per entry rather than grown.
 */
export interface WrCatalogFacts {
  /** e.g. `'Cyrillic'`, `'Arabic'`, `'Han'`. Omit for a Latin-script locale. */
  readonly script?: string;
  /** Keys whose value is correctly the same as English — initialisms, key caps, single letters. */
  readonly sharedWithEnglish?: ReadonlySet<string>;
}

/** Runs the whole contract for one shipped catalog. Call it from inside a `describe`. */
export function expectCatalogContract(locale: string, catalog: WrI18nCatalog, facts: WrCatalogFacts = {}): void {
  const flat = flatten(catalog);
  const en = flatten(wrEn);
  const entries = Object.entries(flat);
  const shared = facts.sharedWithEnglish ?? new Set<string>();

  it('covers exactly the English key set', () => {
    // A key present in one catalog and absent from another is silent: `useI18nText`
    // reads "translation === key" as a miss and serves the component's English
    // default, so the app renders English and no gate says a word.
    expect(Object.keys(flat).sort()).toEqual(Object.keys(en).sort());
  });

  it('is a nested object of plain strings, all the way down', () => {
    // The resolver walks objects and stops at anything else, so an array or a
    // number reaches the DOM through `String(value)` rather than failing where
    // it was written.
    for (const [key, value] of entries) expect(typeof value, key).toBe('string');
  });

  it('leaves no value empty', () => {
    // Empty resolves as a real translation rather than a miss, so it reaches the
    // DOM — as a nameless control, in the aria cases.
    for (const [key, value] of entries) expect(value.trim(), `${locale}.${key} is empty`).not.toBe('');
  });

  it('carries no leading or trailing whitespace', () => {
    for (const [key, value] of entries) expect(value, key).toBe(value.trim());
  });

  it('writes every placeholder in a form the interpolator will resolve', () => {
    // `wrInterpolate` matches `{{ name }}` with an optional space and a name of
    // word characters, dots or dashes. Anything else survives into the rendered
    // string and a user reads the braces.
    for (const [key, value] of entries) {
      const braces = value.match(/\{\{|\}\}/g)?.length ?? 0;
      expect(braces % 2, `${key} has an unbalanced brace pair`).toBe(0);
      for (const token of value.match(/\{\{[^}]*\}\}/g) ?? []) {
        expect(token, key).toMatch(/^\{\{\s*[\w.-]+\s*\}\}$/);
      }
    }
  });

  it('interpolates exactly the placeholders its English counterpart does', () => {
    // The worse of the two silent failures. A translation that lost `{{count}}`
    // renders a sentence with the number cut out of it — no throw, no warning,
    // and the English it was copied from still reads perfectly. One that GAINED
    // a name resolves to an empty string, because nothing passes a param nobody
    // asked for.
    for (const [key, value] of entries) expect(placeholders(value), key).toEqual(placeholders(en[key] ?? ''));
  });

  it('is actually translated, apart from the strings that are not words', () => {
    // English is the reference every other catalog is held against, so holding
    // it against itself would assert that every English string differs from
    // itself. The check has nothing to say here; the whole rest of the contract
    // still does.
    if (catalog === wrEn) return;

    for (const [key, value] of entries) {
      if (shared.has(key)) continue;
      // A placeholder NAME is source code, not prose: `'{{from}}–{{to}} из {{total}}'`
      // carries three Latin runs no translator wrote. Judge the words around them.
      const prose = value.replace(/\{\{[^}]*\}\}/g, '');
      if (!/\p{Script=Latin}/u.test(prose)) continue;

      if (facts.script) {
        const own = new RegExp(`\\p{Script=${facts.script}}`, 'u');
        expect(own.test(value), `${key} looks like it was left in English`).toBe(true);
      } else {
        expect(value, `${key} is still the English string`).not.toBe(en[key]);
      }
    }
  });

  it('has nothing left in its shared list that is no longer identical', () => {
    // The allowlist is the kind of thing that outlives its reason. If a
    // translation lands for one of these, this fails and the entry comes out.
    for (const key of shared) {
      expect(flat[key], `${key} is translated now — drop it from sharedWithEnglish`).toBe(en[key]);
    }
  });
}
