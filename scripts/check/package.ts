/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Holds the built package to what its manifest promises, through ngtrue's
 * packaging checks (`ngtrue/node`).
 *
 * Every check reads `dist/lib`, the directory that would be packed, except
 * `peerDependencyMismatches`: it scans TypeScript imports, so it reads the
 * shipped sources in `projects/lib` against the same manifest, leaving out what
 * `tsconfig.lib.json` excludes plus `schematics/` and `mcp/`, which run inside
 * the Angular CLI and Node rather than in an app. Each check returns its
 * findings as sentences; any finding fails the run.
 *
 * Runs after `pnpm build:lib`, in CI and in `check:release`.
 */

import { exit } from 'node:process';

import {
  angularPeerFloorsTooLow,
  globalAttributeInputs,
  peerDependencyMismatches,
  unexportedTypes,
  unloadableEntryPoints,
  unloadableSchematics,
  unresolvableTypes,
  unresolvedExports,
} from 'ngtrue/node';

import { err } from '../lib/log/err';
import { info } from '../lib/log/info';
import { DIST_LIB_PATH, requireBuiltLib } from '../lib/paths/dist-lib';
import { LIB_PATH } from '../lib/paths/lib';

/**
 * A check's exceptions go in its own `ignore`, with the reason beside it; ngtrue
 * reports an entry that excuses nothing, so the list cannot outlive what it was
 * written for.
 */
interface Check {
  readonly name: string;
  readonly run: () => readonly string[] | Promise<readonly string[]>;
}

const CHECKS: readonly Check[] = [
  { name: 'unresolvedExports', run: () => unresolvedExports({ packageDir: DIST_LIB_PATH }) },
  {
    name: 'unresolvableTypes',
    // Two wildcards the check does not probe: the locale catalogs as JSON and
    // the CLI's schematics. Neither carries types for an app to resolve.
    run: () => unresolvableTypes({ packageDir: DIST_LIB_PATH, ignore: ['./i18n/*.json', './schematics/*'] }),
  },
  {
    name: 'unexportedTypes',
    // The schematics are CommonJS factories the CLI loads; no app imports a
    // type from them.
    run: () => unexportedTypes({ packageDir: DIST_LIB_PATH, ignore: ['./schematics/*'] }),
  },
  {
    name: 'peerDependencyMismatches',
    run: () =>
      peerDependencyMismatches({
        packageDir: LIB_PATH,
        sourceDir: '.',
        tsconfig: 'tsconfig.lib.json',
        exclude: ['schematics', 'mcp'],
      }),
  },
  {
    name: 'unloadableEntryPoints',
    // Every entry point imported unlinked, as a server would. The schematics are
    // a pattern the check cannot import literally, and the CLI loads them, not an
    // app; `unloadableSchematics` covers them.
    run: () => unloadableEntryPoints({ packageDir: DIST_LIB_PATH, ignore: ['./schematics/*'] }),
  },
  { name: 'unloadableSchematics', run: () => unloadableSchematics({ packageDir: DIST_LIB_PATH }) },
  { name: 'globalAttributeInputs', run: () => globalAttributeInputs({ packageDir: DIST_LIB_PATH }) },
  { name: 'angularPeerFloorsTooLow', run: () => angularPeerFloorsTooLow({ packageDir: DIST_LIB_PATH }) },
];

async function main(): Promise<void> {
  requireBuiltLib('check:package');

  let findings = 0;
  for (const check of CHECKS) {
    const problems = await check.run();
    if (problems.length === 0) {
      info(`✓ ${check.name}`);
      continue;
    }
    findings += problems.length;
    err(`\n✘ ${check.name} — ${problems.length} finding(s):`);
    for (const problem of problems) err(`  ${problem}`);
  }

  if (findings > 0) {
    err(`\n✘ Package — ${findings} finding(s) across ngtrue's packaging checks.\n`);
    exit(1);
  }
  info(`✓ Package — dist/lib passes all ${CHECKS.length} of ngtrue's packaging checks.`);
}

await main();
