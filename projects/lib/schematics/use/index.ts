/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Rule } from '@angular-devkit/schematics';

import { useRule } from './rule';
import type { Schema } from './schema';

// Bundled at build time by `scripts/build-symbol-map.ts`. Map of every
// `Wr*` public symbol → the subpath it lives under.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SYMBOL_MAP = require('./symbol-map.json') as Record<string, string>;

/**
 * `ng g ngwr:use WrButton --path src/app/my-page.ts` — the rule itself is in
 * `./rule`, which takes the map as an argument.
 *
 * The split is what makes the rule testable: `symbol-map.json` is generated
 * into `dist/lib/schematics/use/` and does not exist in the source tree, so
 * anything reading this file from source — the unit-test builder included —
 * fails to resolve the `require` above. Keeping it alone in this file leaves
 * one un-runnable line instead of the whole schematic.
 */
function use(options: Schema): Rule {
  return useRule(options, SYMBOL_MAP);
}

export default use;
