/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Rewrites `### Heading` lines in a changelog section to `### <emoji> Heading`. */

import { emojiForHeading } from '../emoji-for-heading';

export function withEmojiHeadings(section: string): string {
  return section
    .split('\n')
    .map(line =>
      line.replace(/^###\s+(.+)$/, (_, heading: string) => {
        // conventional-changelog already prefixes BREAKING CHANGES with ⚠ —
        // strip it so the emoji isn't doubled.
        const text = heading.replace(/^⚠️?\s*/, '');
        return `### ${emojiForHeading(heading)} ${text}`;
      })
    )
    .join('\n');
}
