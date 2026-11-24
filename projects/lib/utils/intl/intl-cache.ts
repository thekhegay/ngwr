/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One map per `Intl` class, keyed on the locale and every option. */
const CACHES = new Map<string, Map<string, object>>();

/** Entries per class before the map starts over; real apps use a few dozen. */
const LIMIT = 256;

function isPlain(options: object): boolean {
  return (
    Object.getPrototypeOf(options) === Object.prototype &&
    Object.getOwnPropertyNames(options).length === Object.keys(options).length
  );
}

/**
 * Building an `Intl` object costs about a tenth of a millisecond and every one is
 * stateless, so one per distinct key serves every caller. The key is computed from
 * `options` at call time, so a caller that mutates its object afterwards cannot
 * change what an earlier key maps to. Option order is part of the key. Options
 * that are not a plain object, or hold a non-enumerable property, are built
 * fresh: `Intl` reads those properties, `JSON.stringify` does not.
 */
function cached<T extends object>(
  kind: string,
  locale: string | undefined,
  options: object | undefined,
  build: () => T
): T {
  if (options && !isPlain(options)) return build();
  let map = CACHES.get(kind);
  if (!map) CACHES.set(kind, (map = new Map<string, object>()));
  const key = options ? `${locale}|${JSON.stringify(options)}` : `${locale}`;
  let found = map.get(key) as T | undefined;
  if (!found) {
    found = build();
    if (map.size >= LIMIT) map.clear();
    map.set(key, found);
  }
  return found;
}

/**
 * Shared `Intl.NumberFormat` for a locale and options.
 *
 * @internal
 */
export function wrIntlNumberFormat(locale: string | undefined, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return cached('number', locale, options, () => new Intl.NumberFormat(locale, options));
}

/**
 * Shared `Intl.DateTimeFormat` for a locale and options.
 *
 * @internal
 */
export function wrIntlDateTimeFormat(
  locale: string | undefined,
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  return cached('date', locale, options, () => new Intl.DateTimeFormat(locale, options));
}

/**
 * Shared `Intl.PluralRules` for a locale and options.
 *
 * @internal
 */
export function wrIntlPluralRules(locale: string | undefined, options?: Intl.PluralRulesOptions): Intl.PluralRules {
  return cached('plural', locale, options, () => new Intl.PluralRules(locale, options));
}

/**
 * Shared `Intl.ListFormat` for a locale and options.
 *
 * @internal
 */
export function wrIntlListFormat(locale: string | undefined, options?: Intl.ListFormatOptions): Intl.ListFormat {
  return cached('list', locale, options, () => new Intl.ListFormat(locale, options));
}

/**
 * Shared `Intl.RelativeTimeFormat` for a locale and options.
 *
 * @internal
 */
export function wrIntlRelativeTimeFormat(
  locale: string | undefined,
  options?: Intl.RelativeTimeFormatOptions
): Intl.RelativeTimeFormat {
  return cached('relative', locale, options, () => new Intl.RelativeTimeFormat(locale, options));
}
