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
 * default mode or storage key provides {@link WR_THEME_CONFIG} itself.
 *
 * A non-`auto` `defaultMode` is applied when {@link WrTheme} is first injected,
 * not when this is provided: inject the service once at boot, or ship
 * `wrThemePrePaintScript()` with the same options.
 *
 * @example
 * ```ts
 * { provide: WR_THEME_CONFIG, useValue: { ...DEFAULT_WR_THEME_CONFIG, storageKey: 'my-app-theme' } }
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
 * Providing it applies nothing on its own, because there is no provider to run
 * an initializer: a stored choice or a non-`auto` `defaultMode` lands when
 * {@link WrTheme} is first injected. Inject it once at boot — in the root
 * component, or with `provideEnvironmentInitializer(() => inject(WrTheme))` —
 * or ship `wrThemePrePaintScript()` with the same options, which applies the
 * same choice before first paint and so prevents the flash as well.
 *
 * @example
 * ```ts
 * providers: [
 *   { provide: WR_THEME_CONFIG, useValue: { ...DEFAULT_WR_THEME_CONFIG, defaultMode: 'dark' } },
 *   provideEnvironmentInitializer(() => inject(WrTheme)),
 * ]
 * ```
 */
export const WR_THEME_CONFIG = new InjectionToken<WrThemeConfig>('WR_THEME_CONFIG', {
  factory: (): WrThemeConfig => DEFAULT_WR_THEME_CONFIG,
});
