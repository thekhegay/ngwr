/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Inputs accepted by `ng add ngwr`. Mirrors `schema.json`. */
export interface Schema {
  /** Target Angular project. Defaults to the workspace default. */
  project?: string;

  /** Skip appending `@use 'ngwr';` to the global styles file. */
  skipStyles?: boolean;

  /** Skip installing peer deps via NodePackageInstallTask. */
  skipPeerInstall?: boolean;
}
