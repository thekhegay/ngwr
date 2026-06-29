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

  /** How to wire styles. `all` = `@use 'ngwr';`, `none` = skip. */
  styles?: 'all' | 'none';

  /** Date adapter wired via `provideWrDateAdapter`. */
  dateAdapter?: 'none' | 'native' | 'date-fns' | 'luxon';

  /** Default density wired via `provideWrDensity`. */
  density?: 'none' | 'sm' | 'lg';

  /** Theme starter applied to `<html data-wr-theme="...">`. */
  theme?: 'none' | 'light' | 'dark' | 'system';

  /** Skip the NodePackageInstallTask (peers won't be installed). */
  skipPeerInstall?: boolean;
}
