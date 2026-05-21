/**
 * Extracts the topmost section of CHANGELOG.md and rewrites the `###` group
 * headings with emojis, producing the body for the GitHub Release.
 *
 * Usage:
 *   pnpm release:body                         # → stdout
 *   pnpm release:body --output=BODY.md        # → file
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');
const changelogPath = resolve(root, 'CHANGELOG.md');

const md = readFileSync(changelogPath, 'utf8');

// Find the first H2 (## ...) and copy everything up to the next H2.
const lines = md.split('\n');
let start = -1;
let end = lines.length;
for (let i = 0; i < lines.length; i++) {
  if (/^##\s/.test(lines[i])) {
    if (start === -1) {
      start = i;
    } else {
      end = i;
      break;
    }
  }
}
if (start === -1) {
  console.error('No H2 section found in CHANGELOG.md');
  process.exit(1);
}

const section = lines.slice(start, end);

// Drop the H2 itself — GitHub Release already shows the tag/version as the title.
const body = section
  .slice(1)
  .map(line =>
    line.replace(/^###\s+(.+)$/, (_, heading: string) => `### ${emojiFor(heading)} ${heading}`),
  )
  .join('\n')
  .trim();

const output = process.argv.find(a => a.startsWith('--output='))?.split('=')[1];
if (output) {
  writeFileSync(resolve(root, output), `${body}\n`);
} else {
  process.stdout.write(`${body}\n`);
}

function emojiFor(heading: string): string {
  const h = heading.toLowerCase();
  if (/break|⚠/.test(h)) return '⚠️';
  if (/feature/.test(h)) return '🚀';
  if (/bug ?fix|^fix/.test(h)) return '🐛';
  if (/perf/.test(h)) return '⚡';
  if (/docs/.test(h)) return '📝';
  if (/refactor/.test(h)) return '♻️';
  if (/style/.test(h)) return '💅';
  if (/test/.test(h)) return '✅';
  if (/build/.test(h)) return '📦';
  if (/^ci/.test(h)) return '🤖';
  if (/chore/.test(h)) return '🧹';
  if (/revert/.test(h)) return '⏪';
  return '✨';
}
