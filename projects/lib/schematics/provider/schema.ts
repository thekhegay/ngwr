/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Providers this schematic can splice into a bootstrap.
 *
 * `loading-bar`, `cookie` and `theme` are deliberately absent: those entry points
 * ship the injectable services `WrLoadingBar` / `WrCookie` / `WrTheme` and no
 * provider function, so there is nothing to add to `providers`. `overlay` and
 * `date-adapter` are absent since v15 for the same reason: the isolated
 * container and the native adapter are the defaults.
 */
export type ProviderName = 'icons' | 'toast' | 'i18n' | 'density' | 'storage';

/** Inputs accepted by `ng g ngwr:provider`. Mirrors `schema.json`. */
export interface Schema {
  /** Provider key. */
  name: ProviderName;

  /** Main bootstrap file. */
  path?: string;

  /** Target Angular project. */
  project?: string;
}
