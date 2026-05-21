/**
 * Bumps `projects/lib/package.json` and updates `CHANGELOG.md` with the
 * entries since the last release.
 *
 * Usage:
 *   pnpm release:prepare --bump=patch
 *   pnpm release:prepare --bump=minor
 *   pnpm release:prepare --bump=major
 *   pnpm release:prepare --bump=rc       # 1.2.3 → 1.2.4-rc.0, 1.2.4-rc.0 → 1.2.4-rc.1
 *
 * Writes the resulting version to stdout (and to `$GITHUB_OUTPUT` when run in CI).
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import semver from 'semver';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');
const libPkgPath = resolve(root, 'projects/lib/package.json');

type Bump = 'patch' | 'minor' | 'major' | 'rc';

const bump = process.argv
  .find(a => a.startsWith('--bump='))
  ?.split('=')[1]
  ?.trim() as Bump | undefined;

if (!bump || !['patch', 'minor', 'major', 'rc'].includes(bump)) {
  console.error('Usage: release:prepare --bump=<patch|minor|major|rc>');
  process.exit(1);
}

// ──────── 1. Compute next version ────────
const libPkg = JSON.parse(readFileSync(libPkgPath, 'utf8'));
const current: string = libPkg.version;

let next: string | null;
if (bump === 'rc') {
  // If already on an rc, bump the prerelease counter; otherwise start at -rc.0
  // bumped off the next patch.
  next = semver.prerelease(current)
    ? semver.inc(current, 'prerelease', 'rc')
    : semver.inc(current, 'prepatch', 'rc');
} else {
  next = semver.inc(current, bump);
}

if (!next) {
  console.error(`Cannot compute next version from ${current} with bump=${bump}`);
  process.exit(1);
}

libPkg.version = next;
writeFileSync(libPkgPath, `${JSON.stringify(libPkg, null, 2)}\n`);
console.error(`✓ Bumped ${current} → ${next}`);

// ──────── 2. Regenerate CHANGELOG.md ────────
// Note: `conventional-changelog -r 1` prepends the entries since the last tag.
const cc = spawnSync(
  'pnpm',
  [
    'exec',
    'conventional-changelog',
    '-p',
    'conventionalcommits',
    '-i',
    'CHANGELOG.md',
    '-s',
    '-r',
    '1',
    '--pkg',
    'projects/lib/package.json',
  ],
  { cwd: root, stdio: 'inherit' },
);

if (cc.status !== 0) {
  console.error('conventional-changelog failed');
  process.exit(cc.status ?? 1);
}

console.error('✓ CHANGELOG.md updated');

// ──────── 3. Emit version ────────
// Print bare version to stdout so workflows can `$(pnpm release:prepare ...)`.
process.stdout.write(`${next}\n`);

// Plus GitHub Actions outputs when running in CI.
const ghOutput = process.env.GITHUB_OUTPUT;
if (ghOutput) {
  appendFileSync(ghOutput, `version=${next}\ntag=v${next}\nis_rc=${bump === 'rc'}\n`);
}
