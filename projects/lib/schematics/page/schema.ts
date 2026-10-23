/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

export type PagePreset = 'form' | 'table' | 'dashboard';

/** Inputs accepted by `ng g ngwr:page`. Mirrors `schema.json`. */
export interface Schema {
  /** Starter shape. */
  preset: PagePreset;

  /**
   * Component dir name — `--name`, never a second positional: `ng generate`
   * orders positionals by a sort that reads index 0 as none, so `name` at
   * index 1 took the first argument (see `../collection.spec.ts`).
   */
  name?: string;

  /** Parent directory. */
  path?: string;

  /** Target Angular project. */
  project?: string;
}
