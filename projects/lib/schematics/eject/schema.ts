/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Inputs accepted by `ng g ngwr:eject`. Mirrors `schema.json`. */
export interface Schema {
  /** The component's path under `ngwr/`, nested ones included: `button`, `charts/bar-chart`. */
  entry: string;

  /** Folder the copy is written to, from the workspace root. Defaults to `src/app/ngwr/<entry>`. */
  path?: string;

  /** A local ngwr checkout to copy from, instead of fetching the installed version's sources. */
  from?: string;
}
