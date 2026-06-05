/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

export type ProviderName =
  | 'overlay'
  | 'icons'
  | 'toast'
  | 'i18n'
  | 'date-adapter'
  | 'density'
  | 'loading-bar'
  | 'cookie'
  | 'storage'
  | 'theme';

/** Inputs accepted by `ng g ngwr:provider`. Mirrors `schema.json`. */
export interface Schema {
  /** Provider key. */
  name: ProviderName;

  /** Main bootstrap file. */
  path?: string;

  /** Target Angular project. */
  project?: string;
}
