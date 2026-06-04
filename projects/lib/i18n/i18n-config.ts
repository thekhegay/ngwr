/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

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
  /** BCP-47 tag used until the user calls `setLocale`. @default 'en' */
  readonly defaultLocale?: string;

  /** Whitelisted locales — `setLocale` ignores anything outside this list. */
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

export const DEFAULT_WR_I18N_CONFIG: WrI18nConfigResolved = {
  defaultLocale: 'en',
  availableLocales: ['en'],
  storageKey: 'wr:i18n:locale',
  missingHandler: key => key,
};

export const WR_I18N_CONFIG = new InjectionToken<WrI18nConfigResolved>('WR_I18N_CONFIG', {
  factory: () => DEFAULT_WR_I18N_CONFIG,
});
