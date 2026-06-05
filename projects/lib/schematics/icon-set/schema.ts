/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Inputs accepted by `ng g ngwr:icon-set`. Mirrors `schema.json`. */
export interface Schema {
  /** Output file name (no extension). @default 'icons' */
  name?: string;

  /** Target Angular project. */
  project?: string;

  /** Output directory. @default `<sourceRoot>/app`. */
  path?: string;

  /** Curated icon set — combined with `icons` when both are passed. */
  set?: 'basic' | 'navigation' | 'forms' | 'feedback';

  /** Comma-separated explicit list. */
  icons?: string;

  /** Identifier name for the exported array. @default 'APP_ICONS' */
  exportName?: string;
}
