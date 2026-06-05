/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Inputs accepted by `ng g ngwr:component-style`. Mirrors `schema.json`. */
export interface Schema {
  /** Subpath under `ngwr/`. */
  name: string;

  /** Target Angular project. */
  project?: string;
}
