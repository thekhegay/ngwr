/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/** Mode the user explicitly selected. `auto` follows `prefers-color-scheme`. */
export type WrThemeMode = 'light' | 'dark' | 'auto';

/** Resolved theme — what's actually applied to the DOM. */
export type WrTheme = 'light' | 'dark';

/** Configuration for {@link WrThemeService}. */
export interface WrThemeConfig {
  /** Initial mode used when no persisted value is present. @default 'auto' */
  readonly defaultMode: WrThemeMode;
  /** localStorage key for persistence. Set to `null` to disable persistence. @default 'wr-theme' */
  readonly storageKey: string | null;
  /** Attribute applied to `<html>` to expose the resolved theme. @default 'data-theme' */
  readonly attribute: string;
}

export const DEFAULT_WR_THEME_CONFIG: WrThemeConfig = {
  defaultMode: 'auto',
  storageKey: 'wr-theme',
  attribute: 'data-theme',
};

export const WR_THEME_CONFIG = new InjectionToken<WrThemeConfig>('WR_THEME_CONFIG', {
  factory: (): WrThemeConfig => DEFAULT_WR_THEME_CONFIG,
});
