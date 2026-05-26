/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The ngwr library version string, kept in sync with
 * `projects/lib/package.json` by `scripts/release-prepare.ts`.
 *
 * Prefer this over reading `package.json` at runtime — that requires a JSON
 * import or `require`, neither of which tree-shakes well in Angular builds.
 *
 * Distinct from `Version` exported by `@angular/core`, which reports the
 * loaded Angular runtime version (e.g. `'21.2.13'`), not ngwr's.
 */
export const NGWR_VERSION = '6.1.1';
