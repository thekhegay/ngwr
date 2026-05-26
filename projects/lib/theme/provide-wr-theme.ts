/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { DEFAULT_WR_THEME_CONFIG, WR_THEME_CONFIG, type WrThemeConfig } from './wr-theme-config';

/**
 * Configure {@link WrTheme}. Partial — merged with defaults.
 *
 * @example
 * ```ts
 * provideWrTheme({ defaultMode: 'dark', storageKey: 'my-app-theme' })
 * ```
 */
export function provideWrTheme(config: Partial<WrThemeConfig> = {}): EnvironmentProviders {
  const merged: WrThemeConfig = { ...DEFAULT_WR_THEME_CONFIG, ...config };
  return makeEnvironmentProviders([{ provide: WR_THEME_CONFIG, useValue: merged }]);
}
