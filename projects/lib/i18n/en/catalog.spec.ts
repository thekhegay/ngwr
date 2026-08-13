import { wrEn } from 'ngwr/i18n/en';
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

/**
 * The shipped English catalog, checked as DATA rather than through the service.
 *
 * `i18n.spec.ts` already pins what the two catalogs owe each other — the same key set,
 * no empty values. What is left is what only this file can see: whether each string is
 * usable copy. Both failures here are silent ones. A stray space renders in the DOM and
 * shows up in nothing but a screenshot; an interpolation typo — `{{name}` , `{{ }}` —
 * is not a placeholder at all, so `wrInterpolate` leaves it in the sentence verbatim and
 * a user reads the braces.
 */
describe('wrEn', () => {
  const entries = Object.entries(flatten(wrEn));

  it('is a nested object of plain strings, all the way down', () => {
    // The resolver walks objects and stops at anything else, so an array or a number
    // reaches the DOM through `String(value)` rather than failing where it was written.
    for (const [key, value] of entries) {
      expect(typeof value, key).toBe('string');
    }
  });

  it('carries no leading or trailing whitespace', () => {
    for (const [key, value] of entries) {
      expect(value, key).toBe(value.trim());
    }
  });

  it('writes every placeholder in a form the interpolator will resolve', () => {
    // `wrInterpolate` matches `{{ name }}` with an optional space and a name of word
    // characters, dots or dashes. Anything else survives into the rendered string.
    for (const [key, value] of entries) {
      const braces = value.match(/\{\{|\}\}/g)?.length ?? 0;
      expect(braces % 2, `${key} has an unbalanced brace pair`).toBe(0);

      for (const token of value.match(/\{\{[^}]*\}\}/g) ?? []) {
        expect(token, key).toMatch(/^\{\{\s*[\w.-]+\s*\}\}$/);
      }
    }
  });

  it('never puts a plural noun straight after a count', () => {
    // There is no plural machinery here — `wrInterpolate` substitutes and nothing else —
    // so `{{count}} items` reads wrong at one. The catalog says as much in a comment
    // above `mention`, and the two shapes that stay honest are the count LAST
    // (`Matches available: {{count}}`) or a count-neutral word after it
    // (`+{{count}} more`), which is why this looks for a trailing -s rather than for
    // any word at all.
    for (const [key, value] of entries) {
      expect(value, `${key} reads wrong at a count of one`).not.toMatch(/\{\{count\}\}\s+[a-z]+s\b/i);
    }
  });
});
