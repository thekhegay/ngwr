/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Fails the build when the token layer declares a `--wr-*` custom property that
 * nothing in the library or the showcase paints with.
 *
 * Why this exists: adding a token is free and using one is not, and the gap
 * between the two is invisible to every other gate. `pnpm test` does not render,
 * `check:a11y` runs in JSDOM with no stylesheets, `check:colors` compares the
 * intent list against `WR_COLORS` and never looks at a role, and `check:theme`
 * asks whether `wrThemeTokens()` reproduces the compiled values — none of them
 * can tell a carefully derived token from a decorative one.
 *
 * So the layer accumulated them. When this check was first written it found six
 * families with zero consumers across the 107 component stylesheets:
 * `--wr-color-border-subtle`, `-border-strong`, `-<intent>-soft-contrast`,
 * `-light-ink`, and all eleven `-gray-*` steps. Every one of them is documented,
 * commented and derived; several sit beside twenty-two files hand-rolling
 * `rgba(var(--wr-color-outline-rgb), α)` at eight different alphas — four of
 * which compute to exactly the tokens nobody reached for.
 *
 * **This is a "say why" gate, not a "don't" gate.** A `--wr-*` property is
 * public API: a token the library never paints with can still be the right thing
 * to ship, because a consumer may want it. What is not acceptable is that nobody
 * decided. So an unused token carries a marker naming the reason:
 *
 *     // unused-ok: a public primitive ramp, for consumers rather than for us
 *     --wr-color-gray-50: #f8fafc;
 *
 * A reference means `var(--wr-token)` in SCSS, HTML or TypeScript. A token's
 * NAME appearing in a docs table is deliberately not a reference — documenting a
 * token is not painting with it, and the six families above are all documented.
 *
 * Interpolated declarations (`--wr-color-#{$name}-soft`) are matched as a
 * family: the loop writes one declaration and the stylesheet references nine
 * concrete names, so the pattern is the honest unit. That is also what makes the
 * check work without a build — it reads SCSS, so it belongs in `pnpm lint`
 * rather than beside `check:theme`, which needs the compiled stylesheet.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const THEME = join(ROOT, 'projects/lib/theme/styles');
/**
 * Where a reference counts from.
 *
 * The library in full, and the showcase's own STYLESHEETS — but not its
 * TypeScript or templates, and that exclusion is the whole point rather than a
 * shortcut. The docs demonstrate tokens: `/guides/tokens/colors` paints a swatch
 * per token with an inline `style` attribute and prints SCSS snippets containing
 * `var(--wr-color-danger-soft-contrast)` as example text. Counting those, this
 * check called three of the dead families alive on its first run — a token was
 * "used" because we had drawn a picture of it, which is exactly backwards.
 */
const SOURCES: readonly (readonly [string, ReadonlySet<string>])[] = [
  [join(ROOT, 'projects/lib'), new Set(['.scss', '.html', '.ts'])],
  [join(ROOT, 'projects/showcase'), new Set(['.scss'])],
];

/**
 * The marker covers a contiguous RUN of declarations, not a fixed number of
 * lines above one — the reach `check:rtl` uses, because a physical property is
 * an individual slip.
 *
 * A token family is not. The eleven `--wr-color-gray-*` steps are one decision
 * written as eleven lines under one comment, and eleven identical markers would
 * be noise nobody reads and everybody copies. So a marker opens at its comment
 * and closes at the first blank line, which is exactly how the token layer is
 * already punctuated.
 */
const MARKER = 'unused-ok:';

interface Declared {
  readonly name: string;
  readonly match: RegExp;
  readonly file: string;
  readonly line: number;
}

function files(dir: string, keep: (path: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...files(path, keep));
    else if (keep(path)) out.push(path);
  }
  return out;
}

/**
 * Every `--wr-*` the token layer declares, minus those carrying a reason.
 *
 * A component declaring its own `--wr-<component>-*` knob is out of scope: those
 * are a component's private surface, and a knob nothing reads is a bug the
 * component's own review should catch, not a property of the theme.
 */
function declarations(): Declared[] {
  const out: Declared[] = [];

  for (const file of files(THEME, p => p.endsWith('.scss'))) {
    const lines = readFileSync(file, 'utf8').split('\n');

    let excused = false;

    lines.forEach((line, index) => {
      if (line.trim() === '') excused = false;
      if (line.includes(MARKER)) excused = true;

      const match = /^\s*(--wr-[\w-]*(?:#\{\$[\w-]+\}[\w-]*)*)\s*:/.exec(line);
      if (!match || excused) return;

      const name = match[1];
      // `--wr-color-#{$name}-soft` is one declaration standing for nine tokens,
      // so it is matched as the family it is.
      const pattern = name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`).replace(/#\\\{\\\$[\w-]+\\\}/g, '[\\w-]+');

      out.push({ name, match: new RegExp(`var\\(\\s*${pattern}\\s*[,)]`), file: relative(ROOT, file), line: index + 1 });
    });
  }

  return out;
}

/**
 * Everything that could paint with a token, as one blob to test against.
 *
 * Interpolation is normalised on the way in, and skipping that step is how this
 * check lies: component stylesheets loop over the intents and write
 * `var(--wr-color-#{$name}-dark)`, which is a real reference to a real family
 * and matches no pattern built out of `[\w-]+`. Eleven distinct interpolated
 * references exist in the catalog today, so a matcher that cannot see them
 * reports the whole shade set as dead.
 */
function consumers(): string {
  const parts: string[] = [];
  for (const [dir, extensions] of SOURCES) {
    for (const file of files(dir, p => extensions.has(extname(p)))) {
      parts.push(readFileSync(file, 'utf8'));
    }
  }
  return parts.join('\n').replace(/#\{[^}]*\}/g, 'interpolated');
}

const haystack = consumers();
const orphans = declarations().filter(d => !d.match.test(haystack));

if (orphans.length > 0) {
  console.error(`\n✖ ${orphans.length} token${orphans.length === 1 ? '' : 's'} declared and never painted with:\n`);
  for (const { name, file, line } of orphans) console.error(`  ${file}:${line}  ${name}`);
  console.error(`
  Nothing in projects/lib or projects/showcase writes \`var(${orphans[0].name})\`.
  Either reach for it where the value is currently hand-rolled, or — if it is
  deliberately a consumer-facing primitive the library itself has no use for —
  say so above the declaration:

    // ${MARKER} <why the library does not paint with this one>
    ${orphans[0].name}: …;

  Documenting a token in the showcase tables is not painting with it. That is the
  state six families were already in when this check was written.
`);
  process.exit(1);
}

console.log(`✓ Tokens — every \`--wr-*\` the theme declares is painted with, or says why not.`);
