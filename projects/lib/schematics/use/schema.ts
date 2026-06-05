/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Inputs accepted by `ng g ngwr:use`. Mirrors `schema.json`. */
export interface Schema {
  /** ngwr class to import (e.g. `WrButton`). */
  symbol: string;

  /** Component file to patch. */
  path?: string;

  /** Target Angular project. */
  project?: string;
}
