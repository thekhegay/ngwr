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
 * A `var()` spelled inside a CODE COMMENT is not one either, for the same
 * reason: `--wr-color-outline-rgb` was green on nothing but the sentence in
 * `_colors.scss` recounting the eight alphas it replaced, so a prose edit that
 * touched no CSS would have turned `pnpm lint` red.
 *
 * Interpolation is handled from both ends, because a loop writes one line and
 * means nine. An interpolated DECLARATION (`--wr-color-#{$name}-soft`) is
 * matched as a family — the loop writes one declaration and the stylesheet
 * references nine concrete names, so the pattern is the honest unit. An
 * interpolated CONSUMER (`var(--wr-color-#{$name}-dark)` in the button's intent
 * loop) is expanded against the list its `@each` actually iterates, which is the
 * only way a concretely-named declaration such as the dark theme's
 * `--wr-color-dark-dark` can be seen for what it is: the background
 * `.wr-btn--dark:hover` paints. Which list that is comes from
 * `scripts/lib/scss-loops.ts`, the same module `check:color-only` unrolls its
 * per-intent rules through, so the two gates cannot read one loop two ways.
 * Both directions read SCSS, which is what makes
 * the check work without a build — it belongs in `pnpm lint` rather than beside
 * `check:theme`, which needs the compiled stylesheet.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { EACH, type LoopList, loopLists, resolveLoopList } from './lib/scss-loops';

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
 * A comment is documentation, not paint.
 *
 * The showcase's templates are excluded above because drawing a picture of a
 * token is not using it; a `var(--wr-…)` written inside a comment — line, block
 * or HTML — is the same category and was counted anyway. The line rule is
 * anchored to the start of a line, so a `https://` inside a TypeScript string
 * survives.
 */
function withoutComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * The concrete `var()` lines an interpolated one stands for.
 *
 * Component stylesheets loop over the intents and write
 * `var(--wr-color-#{$name}-dark)`. Normalising that to a placeholder is enough
 * for an interpolated DECLARATION to find it, but it leaves a concrete
 * declaration — the dark theme re-tunes `--wr-color-dark-dark` by hand — with
 * nothing to match, and the answer "nothing paints with it" is false: the loop
 * runs over `dark` like every other intent. So the binding is resolved and the
 * line is re-emitted once per member, scoped by brace depth so a second `@each`
 * in the same file cannot lend its list to the first.
 */
function expansions(src: string, lists: ReadonlyMap<string, LoopList>): string[] {
  const out: string[] = [];
  const scopes: { depth: number; bound: Map<string, string[]> }[] = [];
  let depth = 0;

  for (const line of src.split('\n')) {
    // `#{$name}` is not a block, so its braces must not move the depth.
    const bare = line.replace(/#\{[^}]*\}/g, '');

    for (const { bound } of scopes) {
      for (const [variable, names] of bound) {
        if (!line.includes(`#{$${variable}}`)) continue;
        for (const name of names) out.push(line.replaceAll(`#{$${variable}}`, name));
      }
    }

    const each = EACH.exec(bare);
    depth += (bare.match(/\{/g)?.length ?? 0) - (bare.match(/\}/g)?.length ?? 0);

    if (each) {
      const [, first, second, expression] = each;
      const list = resolveLoopList(expression, lists);
      if (list) {
        const bound = new Map<string, string[]>([[first, list.keys]]);
        if (second) bound.set(second, list.values);
        scopes.push({ depth, bound });
      }
    }

    while (scopes.length > 0 && scopes[scopes.length - 1].depth > depth) scopes.pop();
  }

  return out;
}

/**
 * Everything that could paint with a token, as one blob to test against.
 *
 * Comments are stripped and interpolation is resolved on the way in; both
 * paragraphs above say why. What cannot be resolved keeps the old placeholder
 * normalisation, so an interpolated declaration still finds an interpolated
 * consumer even when the loop's list is not one this can read.
 */
function consumers(): string {
  const lists = loopLists(SOURCES.map(([dir]) => dir));
  const parts: string[] = [];

  for (const [dir, extensions] of SOURCES) {
    for (const file of files(dir, p => extensions.has(extname(p)))) {
      const src = withoutComments(readFileSync(file, 'utf8'));
      parts.push(src, ...expansions(src, lists));
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
