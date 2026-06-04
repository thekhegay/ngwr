/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, type Provider, makeEnvironmentProviders } from '@angular/core';

import { DEFAULT_WR_I18N_CONFIG, WR_I18N_CONFIG, type WrI18nConfig, type WrI18nConfigResolved } from './i18n-config';
import { WR_I18N_LOADER, type WrI18nLoader } from './i18n-loader';
import { WrI18nHttpLoader, type WrI18nHttpLoaderConfig } from './loaders/http-loader';
import {
  WrI18nStaticLoader,
  type WrI18nStaticCatalogs,
  type WrI18nStaticScopedCatalogs,
} from './loaders/static-loader';

/**
 * Configure {@link WrI18n}. Either pass a `loader` directly, or use the
 * `provideWrI18nHttpLoader` / `provideWrI18nStaticLoader` helpers in the
 * same providers array.
 */
export interface ProvideWrI18nOptions extends WrI18nConfig {
  readonly loader?: WrI18nLoader;
}

export function provideWrI18n(options: ProvideWrI18nOptions = {}): EnvironmentProviders {
  const { loader, ...config } = options;
  const merged: WrI18nConfigResolved = { ...DEFAULT_WR_I18N_CONFIG, ...config };

  const providers: Provider[] = [{ provide: WR_I18N_CONFIG, useValue: merged }];
  if (loader) providers.push({ provide: WR_I18N_LOADER, useValue: loader });

  return makeEnvironmentProviders(providers);
}

/**
 * Provide a static loader — catalogs already in memory.
 *
 * @param catalogs Root catalogs keyed by locale.
 * @param scopes Optional per-scope catalogs served to `registerScope(name)`.
 */
export function provideWrI18nStaticLoader(
  catalogs: WrI18nStaticCatalogs,
  scopes?: WrI18nStaticScopedCatalogs
): Provider {
  return { provide: WR_I18N_LOADER, useValue: new WrI18nStaticLoader(catalogs, scopes) };
}

/** Provide an HTTP loader — catalogs fetched from URLs. Requires `provideHttpClient`. */
export function provideWrI18nHttpLoader(config: WrI18nHttpLoaderConfig): Provider {
  return { provide: WR_I18N_LOADER, useFactory: () => new WrI18nHttpLoader(config) };
}
