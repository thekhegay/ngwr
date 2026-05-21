/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Returns the emoji prefix used for a conventional-changelog section heading
 * (e.g. "Features" → 🚀, "Bug Fixes" → 🐛).
 */

const RULES: readonly (readonly [RegExp, string])[] = [
  [/break|⚠/, '⚠️'],
  [/feature/, '🚀'],
  [/bug ?fix|^fix/, '🐛'],
  [/perf/, '⚡'],
  [/docs/, '📝'],
  [/refactor/, '♻️'],
  [/style/, '💅'],
  [/test/, '✅'],
  [/build/, '📦'],
  [/^ci/, '🤖'],
  [/chore/, '🧹'],
  [/revert/, '⏪'],
];

const DEFAULT_EMOJI = '✨';

export function emojiForHeading(heading: string): string {
  const h = heading.toLowerCase();
  for (const [pattern, emoji] of RULES) {
    if (pattern.test(h)) return emoji;
  }
  return DEFAULT_EMOJI;
}
