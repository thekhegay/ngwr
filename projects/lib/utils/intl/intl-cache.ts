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
 * stateless, so one per distinct key serves every caller. The options are read
 * once into a plain snapshot, which is both the key and what `Intl` is built
 * from, so a getter or a later mutation cannot make the two differ. Each value
 * is keyed with its type, so `undefined`, `null`, `NaN` and `'1'` versus `1`
 * stay apart. Option order is part of the key. Options that are not a plain
 * object, hold a non-enumerable property or an object or function value are
 * built fresh: the key could not tell them apart.
 */
function cached<O extends object, T extends object>(
  kind: string,
  locale: string | undefined,
  options: O | undefined,
  build: (options: O | undefined) => T
): T {
  if (options && !isPlain(options)) return build(options);
  const entries = options ? Object.entries(options) : undefined;
  const snapshot = entries ? (Object.fromEntries(entries) as O) : undefined;
  if (entries?.some(([, value]) => typeof value === 'function' || (typeof value === 'object' && value !== null))) {
    return build(snapshot);
  }
  let map = CACHES.get(kind);
  if (!map) CACHES.set(kind, (map = new Map<string, object>()));
  const typed = entries?.map(([name, value]) => [name, typeof value, String(value)]);
  const key = typed ? `${locale}|${JSON.stringify(typed)}` : `${locale}`;
  let found = map.get(key) as T | undefined;
  if (!found) {
    found = build(snapshot);
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
  return cached('number', locale, options, opts => new Intl.NumberFormat(locale, opts));
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
  return cached('date', locale, options, opts => new Intl.DateTimeFormat(locale, opts));
}

/**
 * Shared `Intl.PluralRules` for a locale and options.
 *
 * @internal
 */
export function wrIntlPluralRules(locale: string | undefined, options?: Intl.PluralRulesOptions): Intl.PluralRules {
  return cached('plural', locale, options, opts => new Intl.PluralRules(locale, opts));
}

/**
 * Shared `Intl.ListFormat` for a locale and options.
 *
 * @internal
 */
export function wrIntlListFormat(locale: string | undefined, options?: Intl.ListFormatOptions): Intl.ListFormat {
  return cached('list', locale, options, opts => new Intl.ListFormat(locale, opts));
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
  return cached('relative', locale, options, opts => new Intl.RelativeTimeFormat(locale, opts));
}
