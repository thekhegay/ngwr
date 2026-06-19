/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Prepends a new section to `CHANGELOG.md` for the version currently set in
 * `projects/lib/package.json`, using the `conventional-changelog` v7 fluent
 * API directly (no CLI shellout).
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { ConventionalChangelog } from 'conventional-changelog';

import { CHANGELOG_PATH } from '../paths/changelog';
import { LIB_PKG_PATH } from '../paths/lib-pkg';

export async function regenerateChangelog(): Promise<void> {
  const generator = new ConventionalChangelog()
    .readPackage(LIB_PKG_PATH)
    .readRepository()
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
  const block = section.replace(/\n*$/, '\n\n');
  writeFileSync(CHANGELOG_PATH, `# Changelog\n\n${block}${body}`);
}
