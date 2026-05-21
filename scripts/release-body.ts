/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Builds the GitHub Release body for the most recent `CHANGELOG.md` section.
 * Rewrites the `###` group headings with emojis (🚀 Features, 🐛 Bug Fixes, …)
 * so the published release matches the look in the docs.
 *
 * Usage:
 *   pnpm release:body                       # → stdout
 *   pnpm release:body --output=BODY.md      # → file
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractLatestSection, withEmojiHeadings } from './lib/changelog';
import { out } from './lib/log';
import { ROOT } from './lib/paths';

const body = withEmojiHeadings(extractLatestSection());

const output = process.argv.find(a => a.startsWith('--output='))?.split('=')[1];
if (output) {
  writeFileSync(resolve(ROOT, output), `${body}\n`);
} else {
  out(`${body}\n`);
}
