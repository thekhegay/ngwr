/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Prepends a new section to `CHANGELOG.md` for the version currently set in
 * `projects/lib/package.json`, using the `conventional-changelog` v8 fluent
 * API directly (no CLI shellout).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { ConventionalChangelog } from 'conventional-changelog';
import semver from 'semver';

import { CHANGELOG_PATH } from '../paths/changelog';
import { LIB_PKG_PATH } from '../paths/lib-pkg';

import { moveShowcaseEntries } from './showcase-section';

export async function regenerateChangelog(): Promise<void> {
  const { version } = JSON.parse(readFileSync(LIB_PKG_PATH, 'utf8')) as { version: string };
  // A stable release after release candidates describes everything since the
  // last stable one: counted from the newest rc tag, the 15.0.0 section would
  // hold only what landed after the last candidate. A candidate still counts
  // from the tag before it, rc tags included.
  const generator = new ConventionalChangelog()
    .readPackage(LIB_PKG_PATH)
    .readRepository()
    .tags({ skipUnstable: semver.prerelease(version) === null })
    .loadPreset('conventionalcommits');

  let section = '';
  for await (const chunk of generator.write()) {
    section += chunk;
  }

  // Insert the new section *under* the top-level "# Changelog" heading
  // rather than above it — a blind prepend re-strands the H1 between the
  // newest and previous release sections every time.
  const existing = readFileSync(CHANGELOG_PATH, 'utf8');
  const body = existing.replace(/^# Changelog\s*\n+/, '');
  const block = moveShowcaseEntries(section).replace(/\n*$/, '\n\n');
  writeFileSync(CHANGELOG_PATH, `# Changelog\n\n${block}${body}`);
}
