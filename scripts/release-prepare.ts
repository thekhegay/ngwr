/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Bumps `projects/lib/package.json`, syncs the lib's `NGWR_VERSION` constant,
 * and prepends a new section to `CHANGELOG.md` based on the conventional
 * commits since the last release.
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
import { breakingSince, lastReleaseTag, truncatedBreakingNotes } from './lib/version/breaking-since';
import { nextVersion } from './lib/version/next';
import { readCurrentVersion } from './lib/version/read-current';
import { writeSupportTable } from './lib/version/support-table';
import { writeVersion } from './lib/version/write';

async function main(): Promise<void> {
  const type = parseReleaseType(argv);
  if (!type) {
    err('Usage: release:prepare --bump=<patch|minor|major|rc>');
    exit(1);
  }

  const current = readCurrentVersion();

  // A breaking change may not ride a minor or a patch. The bump is a
  // hand-picked `workflow_dispatch` input, and that is how v12.2.0 — a MINOR —
  // came to ship a changelog with a breaking section: nothing connected the
  // commits to the number. An adopter on `^12.1.0` received it automatically.
  //
  // `rc` is exempt: a release candidate is where a major is staged, and its
  // own bump names the line it is a candidate for.
  if (type === 'minor' || type === 'patch') {
    const since = lastReleaseTag();
    const breaking = since ? breakingSince(since) : [];
    if (breaking.length > 0) {
      err(`Refusing --bump=${type}: ${breaking.length} breaking commit(s) since ${since}.`);
      for (const subject of breaking) err(`  ${subject}`);
      err('A `!` type or a `BREAKING CHANGE:` footer requires --bump=major.');
      exit(1);
    }
  }

  // A footer line that starts `word:` is a git trailer, and conventional-changelog
  // ends the BREAKING CHANGE body there — silently. v14's date entry lost half its
  // sentence and the whole `<wr-pagination ofLabel>` removal that way, because the
  // note happened to wrap onto a line beginning `calendar: 'gregory'`. The release
  // body is extracted from the same file, so the published note loses it too.
  for (const subject of truncatedBreakingNotes()) {
    err(`Warning: the BREAKING CHANGE note on "${subject}" will be cut short in CHANGELOG.md.`);
    err('  A line in it begins `word:`, which conventional-changelog reads as a new trailer.');
    err('  Check the generated section and fix it in the release PR.');
  }

  const next = nextVersion(current, type);

  if (!next) {
    err(`Cannot compute next version from ${current} with bump=${type}`);
    exit(1);
  }

  writeVersion(next);
  info(`✓ Bumped ${current} → ${next}`);
  info('✓ Synced NGWR_VERSION in projects/lib/version/version.ts');

  if (writeSupportTable(next)) info('✓ SECURITY.md support table follows the release line');

  await regenerateChangelog();
  info('✓ CHANGELOG.md updated');

  out(`${next}\n`);

  const ghOutput = env['GITHUB_OUTPUT'];
  if (ghOutput) {
    appendFileSync(ghOutput, `version=${next}\ntag=v${next}\nis_rc=${type === 'rc'}\n`);
  }
}

main().catch((error: unknown) => {
  err(`Release prepare failed: ${String(error)}`);
  exit(1);
});
