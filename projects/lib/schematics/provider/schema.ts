/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Providers this schematic can splice into a bootstrap.
 *
 * `toast`, `density` and `storage` are `provideWr()` features since v15: the
 * schematic adds `withToast()` / `withDensity()` / `withStorage()` inside the
 * `provideWr(...)` already in `providers`, or adds `provideWr(withX())` when
 * there is none. `icons` and `i18n` stay calls of their own.
 *
 * `loading-bar` and `cookie` are deliberately absent: those entry points ship
 * the injectable services `WrLoadingBar` / `WrCookie` and no provider function,
 * so there is nothing to add to `providers`. `overlay` is absent since v15 for
 * the same reason: the isolated container is the default. `theme`, `meta` and
 * `date` have features, and exist to carry values only the app knows.
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
