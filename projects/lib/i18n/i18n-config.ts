/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, LOCALE_ID, inject } from '@angular/core';

/** Translation catalog — flat or nested record of strings. */
export interface WrI18nCatalog {
  readonly [key: string]: string | WrI18nCatalog;
}

/** Parameters passed to interpolation — coerced to strings via `String(v)`. */
export type WrI18nParams = Readonly<Record<string, unknown>>;

/** Hook called once on every key that resolves to nothing. */
export type WrI18nMissingHandler = (key: string, locale: string) => string;

/** User-facing config for {@link provideWrI18n}. */
export interface WrI18nConfig {
  /**
   * BCP-47 tag used until the user calls `use()`.
   *
   * Omitted, it is Angular's own `LOCALE_ID` — the app already states its
   * locale there, and ngwr having a second, unrelated default is how a fully
   * Russian app came to render an English calendar inside itself. See
   * {@link WrI18n} for the whole precedence.
   *
   * @default LOCALE_ID
   */
  readonly defaultLocale?: string;

  /**
   * Whitelisted locales — `use()` ignores anything outside this list. Omitted,
   * it is `[defaultLocale]`: it used to be a hardcoded `['en']`, so
   * `provideWrI18n({ defaultLocale: 'ru' })` produced a service whose own
   * default locale was not switchable back to.
   *
   * @default [defaultLocale]
   */
  readonly availableLocales?: readonly string[];

  /**
   * Storage key for persisting the active locale (via `WrStorage`).
   * Set to `null` to disable persistence. @default 'wr:i18n:locale'
   */
  readonly storageKey?: string | null;

  /** Called when a key is missing. Default returns the key itself. */
  readonly missingHandler?: WrI18nMissingHandler;
}

/** Resolved config — every field non-optional. @internal */
export interface WrI18nConfigResolved {
  readonly defaultLocale: string;
  readonly availableLocales: readonly string[];
  readonly storageKey: string | null;
  readonly missingHandler: WrI18nMissingHandler;
}

/**
 * Everything but the locale, which cannot be a constant: it is resolved from
 * `LOCALE_ID` in an injection context. @internal
 */
export const DEFAULT_WR_I18N_CONFIG: Omit<WrI18nConfigResolved, 'defaultLocale' | 'availableLocales'> = {
  storageKey: 'wr:i18n:locale',
  missingHandler: key => key,
};

/**
 * Resolve the locale half of the config. Callable only from an injection
 * context, because the seed is `LOCALE_ID`. @internal
 */
export function resolveWrI18nLocales(
  config: WrI18nConfig
): Pick<WrI18nConfigResolved, 'defaultLocale' | 'availableLocales'> {
  const defaultLocale = config.defaultLocale ?? inject(LOCALE_ID);
  return { defaultLocale, availableLocales: config.availableLocales ?? [defaultLocale] };
}

export const WR_I18N_CONFIG = new InjectionToken<WrI18nConfigResolved>('WR_I18N_CONFIG', {
  factory: () => ({ ...DEFAULT_WR_I18N_CONFIG, ...resolveWrI18nLocales({}) }),
});
