/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/** Mode the user explicitly selected. `auto` follows `prefers-color-scheme`. */
export type WrThemeMode = 'light' | 'dark' | 'auto';

/** Resolved scheme — what is actually on screen. */
export type WrResolvedTheme = 'light' | 'dark';

/**
 * Configuration for {@link WrTheme}. Nothing has to provide it — the token
 * defaults to {@link DEFAULT_WR_THEME_CONFIG} — and an app that wants another
 * default mode or storage key passes it to `withTheme()`.
 *
 * A non-`auto` `defaultMode` is applied when {@link WrTheme} is created, which
 * `withTheme()` does at boot; ship `wrThemePrePaintScript()` with the same
 * options to apply it before first paint as well.
 *
 * @example
 * ```ts
 * provideWr(withTheme({ storageKey: 'my-app-theme' }))
 * ```
 */
export interface WrThemeConfig {
  /** Initial mode used when no persisted value is present. @default 'auto' */
  readonly defaultMode: WrThemeMode;
  /** localStorage key for persistence. Set to `null` to disable persistence. @default 'wr-theme' */
  readonly storageKey: string | null;
}

export const DEFAULT_WR_THEME_CONFIG: WrThemeConfig = {
  defaultMode: 'auto',
  storageKey: 'wr-theme',
};

/**
 * Provides {@link WrThemeConfig}. Optional — the factory returns
 * {@link DEFAULT_WR_THEME_CONFIG}.
 *
 * Set it with `withTheme()`, which merges the fields you pass with the defaults
 * and creates {@link WrTheme} at boot. Provided by hand the token applies
 * nothing on its own: a stored choice or a non-`auto` `defaultMode` lands only
 * when the service is first injected. Ship `wrThemePrePaintScript()` with the
 * same options to apply the same choice before first paint and so prevent the
 * flash as well.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withTheme } from 'ngwr/theme';
 *
 * providers: [provideWr(withTheme({ defaultMode: 'dark' }))]
 * ```
 */
export const WR_THEME_CONFIG = new InjectionToken<WrThemeConfig>('WR_THEME_CONFIG', {
  factory: (): WrThemeConfig => DEFAULT_WR_THEME_CONFIG,
});
