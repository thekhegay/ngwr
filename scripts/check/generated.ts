/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The three `pnpm lint` stages that read the selector data, in one process:
 * `check:selectors`, `check:attrs` and `check:install`, in that order, since
 * the last two read the committed map the first one holds to the source.
 *
 *   pnpm check:generated
 *
 * Each still runs alone under its own name. Together they start tsx once and
 * lex the library once, where three processes did both three times and twice.
 */

import { runInstall } from '../gen/install';
import { runSelectors } from '../gen/selectors';
import { parseFlags } from '../lib/args';

import { runUnknownAttrs } from './unknown-attrs';

async function main(): Promise<void> {
  parseFlags('check:generated', {});
  // Each exits 1 on its own failure, as a stage of the `&&` chain did.
  runSelectors(true);
  runUnknownAttrs();
  await runInstall(true);
}

void main();
