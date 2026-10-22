/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Providers this schematic can splice into an app's providers.
 *
 * `toast`, `density`, `storage` and `theme` are `provideWr()` features since
 * v15: the schematic adds `withToast()` / `withDensity()` / `withStorage()` /
 * `withTheme()` inside the `provideWr(...)` already in `providers`, or adds
 * `provideWr(withX())` when there is none. `icons`, `i18n` and
 * `loading-bar-router` stay calls of their own.
 *
 * `cookie` is deliberately absent: `WrCookie` is an injectable service with no
 * provider function, so there is nothing to add to `providers`. `overlay` is
 * absent since v15 for the same reason: the isolated container is the default.
 * `meta` and `date` have features, and exist to carry values only the app knows.
 */
export type ProviderName = 'icons' | 'toast' | 'i18n' | 'density' | 'storage' | 'theme' | 'loading-bar-router';

/** Inputs accepted by `ng g ngwr:provider`. Mirrors `schema.json`. */
export interface Schema {
  /** Provider key. */
  name: ProviderName;

  /** File that holds the providers array. */
  path?: string;

  /** Target Angular project. */
  project?: string;
}
