/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Choices the user can pick during `ng add ngwr`. Mirrors `schema.json`. */
export interface Schema {
  /** Target Angular project. Defaults to the workspace default. */
  project?: string;

  /** How to wire styles. `theme` = `@use 'ngwr/theme';`, `none` = skip. */
  styles?: 'theme' | 'none';

  /** Default density wired via `provideWr(withDensity())`, plus `@use 'ngwr/density';` in the global stylesheet. */
  density?: 'none' | 'sm' | 'lg';

  /** Skip the NodePackageInstallTask (peers won't be installed). */
  skipPeerInstall?: boolean;
}
