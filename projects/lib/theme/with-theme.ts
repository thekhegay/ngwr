/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { inject, provideEnvironmentInitializer } from '@angular/core';

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WrTheme } from './services/wr-theme';
import { DEFAULT_WR_THEME_CONFIG, WR_THEME_CONFIG, type WrThemeConfig } from './wr-theme-config';

/**
 * Configure and boot {@link WrTheme}, as a feature of `provideWr()`. All fields
 * optional — merged with {@link DEFAULT_WR_THEME_CONFIG}.
 *
 * The theme itself needs no provider: the stylesheet follows the OS through
 * `color-scheme`. What this adds is the moment {@link WrTheme} is created. The
 * service applies a stored choice or a non-`auto` `defaultMode` when it is
 * first injected, so without this an app whose theme toggle sits behind a lazy
 * route follows the OS until that route loads. The initializer creates it at
 * boot instead — the same thing `withDensity()` does for `WrDensity`.
 *
 * Under SSR the server still writes nothing, so a visitor who chose a scheme
 * sees the OS one until the bundle boots; {@link wrThemePrePaintScript} with the
 * same options closes that window.
 *
 * Bootstrap only: {@link WrTheme} is root-provided and reads its config once,
 * from the root injector.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withTheme } from 'ngwr/theme';
 *
 * bootstrapApplication(App, {
 *   providers: [provideWr(withTheme({ defaultMode: 'dark', storageKey: 'my-app-theme' }))],
 * });
 * ```
 */
export function withTheme(config: Partial<WrThemeConfig> = {}): WrFeature<'theme'> {
  return wrFeature('theme', [
    { provide: WR_THEME_CONFIG, useValue: { ...DEFAULT_WR_THEME_CONFIG, ...config } },
    provideEnvironmentInitializer(() => void inject(WrTheme)),
  ]);
}
