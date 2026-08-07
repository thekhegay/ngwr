/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Providers this schematic can splice into a bootstrap.
 *
 * `loading-bar` and `cookie` are deliberately absent: those entry points ship the
 * injectable services `WrLoadingBar` / `WrCookie` and no provider function, so
 * there is nothing to add to `providers`.
 */
export type ProviderName = 'overlay' | 'icons' | 'toast' | 'i18n' | 'date-adapter' | 'density' | 'storage' | 'theme';

/** Inputs accepted by `ng g ngwr:provider`. Mirrors `schema.json`. */
export interface Schema {
  /** Provider key. */
  name: ProviderName;

  /** Main bootstrap file. */
  path?: string;

  /** Target Angular project. */
  project?: string;
}
