/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Bumps `projects/lib/package.json`, syncs the showcase footer's
 * `NGWR_VERSION`, and prepends a new section to `CHANGELOG.md` based on the
 * conventional commits since the last release.
 *
 * Usage:
 *   pnpm release:prepare --bump=patch
 *   pnpm release:prepare --bump=minor
 *   pnpm release:prepare --bump=major
 *   pnpm release:prepare --bump=rc      # 1.2.3 → 1.2.4-rc.0, 1.2.4-rc.0 → 1.2.4-rc.1
 *
 * Writes the resulting bare version to stdout. When run in CI it also appends
 * `version`, `tag` and `is_rc` to `$GITHUB_OUTPUT` so downstream workflow
 * steps can consume them.
 */

import { appendFileSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

import { regenerateChangelog } from './lib/changelog/regenerate';
import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { out } from './lib/log/out';
import { parseReleaseType } from './lib/parse-release-type';
import { nextVersion } from './lib/version/next';
import { readCurrentVersion } from './lib/version/read-current';
import { writeVersion } from './lib/version/write';

const type = parseReleaseType(argv);
if (!type) {
  err('Usage: release:prepare --bump=<patch|minor|major|rc>');
  exit(1);
}

const current = readCurrentVersion();
const next = nextVersion(current, type);

if (!next) {
  err(`Cannot compute next version from ${current} with bump=${type}`);
  exit(1);
}

writeVersion(next);
info(`✓ Bumped ${current} → ${next}`);
info('✓ Synced WR_VERSION in projects/lib/version/wr-version.ts');

regenerateChangelog();
info('✓ CHANGELOG.md updated');

out(`${next}\n`);

const ghOutput = env['GITHUB_OUTPUT'];
if (ghOutput) {
  appendFileSync(ghOutput, `version=${next}\ntag=v${next}\nis_rc=${type === 'rc'}\n`);
}
