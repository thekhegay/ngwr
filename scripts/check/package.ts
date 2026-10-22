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
  unloadableSchematics,
  unresolvableTypes,
  unresolvedExports,
} from 'ngtrue/node';

import { err } from '../lib/log/err';
import { info } from '../lib/log/info';
import { DIST_LIB_PATH, requireBuiltLib } from '../lib/paths/dist-lib';
import { LIB_PATH } from '../lib/paths/lib';

interface Check {
  readonly name: string;
  readonly run: () => readonly string[] | Promise<readonly string[]>;
  /**
   * Findings that are notices rather than defects, by the start of the
   * sentence, for a check with no `ignore` of its own. One that matches nothing
   * fails the run, so the list cannot outlive what it excuses.
   */
  readonly acknowledged?: readonly string[];
}

const CHECKS: readonly Check[] = [
  { name: 'unresolvedExports', run: () => unresolvedExports({ packageDir: DIST_LIB_PATH }) },
  {
    name: 'unresolvableTypes',
    run: () => unresolvableTypes({ packageDir: DIST_LIB_PATH }),
    // Two wildcards the check does not probe: the locale catalogs as JSON and
    // the CLI's schematics. Neither carries types for an app to resolve.
    acknowledged: [
      'exports["./i18n/*.json"] is a wildcard and was not probed',
      'exports["./schematics/*"] is a wildcard and was not probed',
    ],
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
  { name: 'unloadableSchematics', run: () => unloadableSchematics({ packageDir: DIST_LIB_PATH }) },
  {
    name: 'globalAttributeInputs',
    // `WrSortableItem` composes CDK's `CdkDrag` and exposes none of its inputs,
    // and `CdkDrag` has no host directives of its own, so no static attribute
    // reaches an input this check cannot read.
    run: () => globalAttributeInputs({ packageDir: DIST_LIB_PATH, ignore: ['WrSortableItem'] }),
  },
  { name: 'angularPeerFloorsTooLow', run: () => angularPeerFloorsTooLow({ packageDir: DIST_LIB_PATH }) },
];

async function main(): Promise<void> {
  requireBuiltLib('check:package');

  let findings = 0;
  for (const check of CHECKS) {
    const acknowledged = check.acknowledged ?? [];
    const reported = await check.run();
    const problems = [
      ...reported.filter(problem => !acknowledged.some(start => problem.startsWith(start))),
      ...acknowledged
        .filter(start => !reported.some(problem => problem.startsWith(start)))
        .map(start => `acknowledged notice no longer reported, drop it from this script: ${start}`),
    ];
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
