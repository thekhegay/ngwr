/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

import { WrTheme } from './services/wr-theme';
import { DEFAULT_WR_THEME_CONFIG, WR_THEME_CONFIG, type WrThemeConfig } from './wr-theme-config';

/**
 * Configure and activate {@link WrTheme}. Config is partial — merged with
 * defaults.
 *
 * Calling this is all it takes: the initializer instantiates {@link WrTheme},
 * whose constructor effect mirrors the resolved theme onto `<html>`. Without
 * that, the service (a tree-shakable `@Service()`) would only be created once
 * something injected it, so `[data-theme]` was never written and an app that
 * followed the docs silently ignored `defaultMode: 'auto'`.
 *
 * @example
 * ```ts
 * provideWrTheme({ defaultMode: 'dark', storageKey: 'my-app-theme' })
 * ```
 */
export function provideWrTheme(config: Partial<WrThemeConfig> = {}): EnvironmentProviders {
  const merged: WrThemeConfig = { ...DEFAULT_WR_THEME_CONFIG, ...config };
  return makeEnvironmentProviders([
    { provide: WR_THEME_CONFIG, useValue: merged },
    provideEnvironmentInitializer(() => void inject(WrTheme)),
  ]);
}
