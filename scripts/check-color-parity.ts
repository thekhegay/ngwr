/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Fails the build when the TypeScript colour list and the SCSS palette disagree.
 *
 * Why this exists: the palette is declared twice — `$base-colors` in
 * `theme/styles/_colors.scss` generates every `--wr-color-*` token and, via
 * `$colors: map.keys($base-colors)`, every `--{intent}` modifier class; and
 * `WR_COLORS` in `theme/colors.ts` is what `WrColor` derives from, so it is
 * what every `[color]` input will accept. Nothing connects them but a comment
 * asking the next person to remember.
 *
 * They already drifted. #413 added `info` to the map and not to the array, so
 * v8.0.0 shipped `--wr-color-info`, its soft set and `.wr-btn--info` while
 * `color="info"` stayed a template type error — CSS in the bundle that the
 * types refused to let anyone reach. It survived a whole release because
 * nothing looks: the SCSS compiles, the TS compiles, and neither knows the
 * other exists. That is what this script is for — the drift is invisible
 * precisely because both halves are independently valid.
 *
 * Parsing rather than importing: the map is Sass, so there is nothing to
 * import from Node without a compile step. The two shapes are hand-authored
 * and stable, so a strict match is enough — but "strict" is load-bearing.
 * A parser that quietly finds nothing would report parity between two empty
 * lists and wave the next `info` straight through, so every failure to
 * recognise the source is an error here, never a skip.
 *
 * Wired into `lint` rather than a build, which is what makes it cheap and
 * total: `ci.yml`, `deploy.yml` and `publish.yml` all already run `pnpm lint`,
 * so a desynced palette now fails review, deploy and — the one that matters —
 * publish, without adding a job to any of them.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const SCSS_PATH = resolve(ROOT_PATH, 'projects/lib/theme/styles/_colors.scss');
const TS_PATH = resolve(ROOT_PATH, 'projects/lib/theme/colors.ts');

/**
 * The `$base-colors` map body.
 *
 * Both anchors are deliberate. The file's own header comment contains
 * `//     $base-colors: (primary: #...)` as usage docs, and an unanchored
 * match starts there and then runs to the real `) !default;` — swallowing the
 * comment and the declaration as one blob. The real declaration is the only
 * one at column 0.
 */
const SCSS_MAP = /^\$base-colors:\s*\(([\s\S]*?)^\)\s*!default;/m;

/** The `WR_COLORS` array body. */
const TS_ARRAY = /^export const WR_COLORS = \[([\s\S]*?)^\] as const;/m;

/** A `key:` at the start of a line inside the map body. */
const SCSS_KEY = /^\s*([a-z][a-z0-9-]*)\s*:/gm;

/** A single-quoted member inside the array body. */
const TS_MEMBER = /'([^']+)'/g;

/** Strips `//` line comments so commented-out entries never count as members. */
function stripComments(source: string): string {
  return source.replace(/^\s*\/\/.*$/gm, '');
}

/** Reads one source, or fails loudly — an unreadable half is never parity. */
function read(path: string, label: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    err(`\n✘ Colour parity: cannot read ${label}\n    ${path}\n`);
    return exit(1);
  }
}

/** Pulls a declaration body out of a source, or fails loudly. */
function extract(source: string, pattern: RegExp, label: string, path: string): string {
  const match = source.match(pattern);
  if (!match) {
    err(
      `
✘ Colour parity: could not find ${label} in
    ${path}

  The declaration moved or was reformatted, so this check can no longer see
  it. Fix the pattern in scripts/check-color-parity.ts — do not delete the
  check. It is the only thing tying the two colour lists together.
`
    );
    exit(1);
  }

  return match![1];
}

const scssKeys = [
  ...stripComments(extract(read(SCSS_PATH, '_colors.scss'), SCSS_MAP, '$base-colors', SCSS_PATH)).matchAll(SCSS_KEY),
].map(m => m[1]);

const tsKeys = [
  ...stripComments(extract(read(TS_PATH, 'colors.ts'), TS_ARRAY, 'WR_COLORS', TS_PATH)).matchAll(TS_MEMBER),
].map(m => m[1]);

if (!scssKeys.length || !tsKeys.length) {
  err(
    `
✘ Colour parity: parsed an empty list ($base-colors: ${scssKeys.length}, WR_COLORS: ${tsKeys.length}).

  Both lists have entries, so this is a parser fault, not a real result —
  reporting "in sync" here would be worse than useless.
`
  );
  exit(1);
}

const missingInTs = scssKeys.filter(k => !tsKeys.includes(k));
const missingInScss = tsKeys.filter(k => !scssKeys.includes(k));
const sameMembers = !missingInTs.length && !missingInScss.length;
const sameOrder = sameMembers && scssKeys.every((k, i) => tsKeys[i] === k);

if (sameMembers && sameOrder) {
  info(`✓ Colour parity: ${scssKeys.length} intents match ($base-colors ↔ WR_COLORS).`);
  exit(0);
}

const lines: string[] = [];

if (missingInTs.length) {
  lines.push(
    `  Missing from WR_COLORS (${TS_PATH}):`,
    ...missingInTs.map(k => `    ${k}  — the SCSS generates --wr-color-${k}* and .wr-*--${k}, but WrColor rejects it`)
  );
}

if (missingInScss.length) {
  lines.push(
    `  Missing from $base-colors (${SCSS_PATH}):`,
    ...missingInScss.map(k => `    ${k}  — WrColor accepts it, but no token or modifier class is generated`)
  );
}

if (sameMembers && !sameOrder) {
  lines.push(
    '  Same members, different order:',
    `    $base-colors: ${scssKeys.join(', ')}`,
    `    WR_COLORS:    ${tsKeys.join(', ')}`,
    '',
    '  Nothing breaks at runtime, but the two are meant to read as one list —',
    '  and matching order is how the next person spots a missing entry.'
  );
}

err(
  `
✘ Colour parity: the palette disagrees with the type.

${lines.join('\n')}

  Both sources must list the same intents, in the same order. Whichever half
  is behind, add the entry there — a colour in only one half is invisible:
  the SCSS and the TypeScript each compile perfectly on their own.
`
);
exit(1);
