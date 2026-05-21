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

import { parseBumpArg } from './lib/bump';
import { regenerateChangelog } from './lib/changelog';
import { err, info, out } from './lib/log';
import { nextVersion, readCurrentVersion, writeVersion } from './lib/version';

const bump = parseBumpArg(process.argv);
if (!bump) {
  err('Usage: release:prepare --bump=<patch|minor|major|rc>');
  process.exit(1);
}

const current = readCurrentVersion();
const next = nextVersion(current, bump);

if (!next) {
  err(`Cannot compute next version from ${current} with bump=${bump}`);
  process.exit(1);
}

writeVersion(next);
info(`✓ Bumped ${current} → ${next}`);
info('✓ Synced showcase NGWR_VERSION');

regenerateChangelog();
info('✓ CHANGELOG.md updated');

out(`${next}\n`);

const ghOutput = process.env['GITHUB_OUTPUT'];
if (ghOutput) {
  appendFileSync(ghOutput, `version=${next}\ntag=v${next}\nis_rc=${bump === 'rc'}\n`);
}
