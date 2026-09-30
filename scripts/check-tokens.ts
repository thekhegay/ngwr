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

/** Where a dangling READ counts from — everything, for the reason at `danglingReads`. */
const READ_SOURCES: readonly (readonly [string])[] = [[join(ROOT, 'projects/lib')], [join(ROOT, 'projects/showcase')]];
const READ_EXTENSIONS: ReadonlySet<string> = new Set(['.scss', '.html', '.ts']);

/**
 * The one exclusion, and it is not a convenience.
 *
 * A codemod's whole job is the old vocabulary: `migration-v15` carries a table
 * mapping `--wr-color-light` to `--wr-color-outline`, and its spec feeds it
 * fixtures holding every deleted name — including the orphan shades it must
 * REFUSE to rewrite, which by construction can never resolve. Scanning those is
 * asking a migration to stop naming what it migrates.
 */
const READ_SKIP = join(ROOT, 'projects/lib/schematics');

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

/**
 * The same question asked backwards: a `var(--wr-color-…)` naming a token the
 * theme never declares.
 *
 * The pass above finds a token with no reader. This one finds a reader with no
 * token, and the two are NOT the same check run in mirror — a dead declaration
 * is tidiness, a dangling read is a broken rule. A `var()` at a name nothing
 * declares is invalid at computed-value time, so the browser drops the WHOLE
 * declaration holding it: a `border: 1px solid var(--wr-color-gone)` draws no
 * border at all, a `background` paints nothing, and there is no error anywhere —
 * not in the build, not in the console, not in a test. It reads exactly like a
 * rule someone deliberately did not write.
 *
 * v15 is why it exists. Cutting `secondary`, `light`, `medium` and `dark` from
 * the palette left 145 reads behind across the library and the showcase, and
 * every gate stayed green: `pnpm test` does not render, `check:a11y` runs in
 * JSDOM with no stylesheets, `check:contrast` measures a colour it can only see
 * once something paints it, and this file's own first pass reports the opposite
 * direction. A dropped declaration is invisible to all of them.
 *
 * Three decisions about scope, each of which is the reason a version of this
 * would otherwise be wrong:
 *
 * **Only the `--wr-color-*` namespace.** The theme layer owns it entirely, so a
 * name in it either resolves there or is a typo. A `--wr-<component>-*` hook is
 * the component's own and may legitimately be declared by a consumer, which is
 * the whole point of publishing it — and `gen:css-vars` catalogues those.
 *
 * **A read in a TEMPLATE or in TypeScript counts, unlike in the pass above.**
 * That pass excludes the showcase's templates because drawing a picture of a
 * token is not painting with it. Here the reasoning inverts: an inline
 * `style="background: var(--wr-color-light)"` is a live rule that draws nothing,
 * and a `var(--wr-color-dark)` inside a printed SCSS snippet is advice a reader
 * will paste into their own app, where it will draw nothing there instead. Both
 * are wrong, so both are reported. A comment is still not a read.
 *
 * **A declaration counts from a STYLESHEET or a template, never from
 * TypeScript.** `rebrand()` re-emits an intent's whole set on a subtree and a
 * demo may set one on a wrapper, so the theme layer is not the only place a
 * name can come from. But every `--wr-color-…:` in a `.ts` file in this repo is
 * inside a printed snippet — `/guides/theming` shows a dark block declaring
 * `--wr-color-dark: #f5f6f8`, which is a picture of the OLD palette — and
 * counting those made the check answer that every read of a deleted token
 * resolved. It found 136 of them once the snippets stopped vouching for names
 * nothing declares.
 */
function danglingReads(lists: ReadonlyMap<string, LoopList>): { file: string; line: number; name: string }[] {
  const declared = new Set<string>();
  const scanned: { file: string; lines: string[] }[] = [];

  for (const [dir] of READ_SOURCES) {
    for (const file of files(dir, p => READ_EXTENSIONS.has(extname(p)) && !p.startsWith(READ_SKIP))) {
      const src = withoutComments(readFileSync(file, 'utf8'));
      const lines = [...src.split('\n'), ...expansions(src, lists)];
      scanned.push({ file: relative(ROOT, file), lines });
      if (extname(file) === '.ts') continue;
      for (const line of lines) {
        for (const m of line.matchAll(/(--wr-color-[\w-]+)\s*:/g)) declared.add(m[1]);
      }
    }
  }

  const out: { file: string; line: number; name: string }[] = [];
  for (const { file, lines } of scanned) {
    lines.forEach((line, index) => {
      // An expansion has no honest line number, so it is scanned for names only
      // — a dangling read inside a loop is reported at the interpolated source
      // line by the pass over the raw text, which sees the same `var(`.
      if (index >= lines.length) return;
      for (const m of line.matchAll(/var\(\s*(--wr-color-[\w-]+)\s*[,)]/g)) {
        if (declared.has(m[1])) continue;
        out.push({ file, line: index + 1, name: m[1] });
      }
    });
  }

  return out;
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

const dangling = danglingReads(loopLists(SOURCES.map(([dir]) => dir)));

if (dangling.length > 0) {
  const names = [...new Set(dangling.map(d => d.name))].sort();
  console.error(
    `\n✖ ${dangling.length} \`var()\` read${dangling.length === 1 ? '' : 's'} at ${names.length} colour token${
      names.length === 1 ? '' : 's'
    } nothing declares:\n`
  );
  for (const name of names) {
    const hits = dangling.filter(d => d.name === name);
    console.error(`  ${name}  (${hits.length})`);
    for (const { file, line } of hits) console.error(`    ${file}:${line}`);
  }
  console.error(`
  A \`var()\` at a name nothing declares is invalid at computed-value time, so the
  browser drops the WHOLE declaration holding it — a border that never draws, a
  background that stays transparent — with nothing said in the build, the console
  or a test. Either the token was removed and the rule has to be rewritten against
  what replaced it, or the name is a typo.
`);
  process.exit(1);
}

console.log(`✓ Tokens — every \`--wr-*\` the theme declares is painted with, or says why not.`);
console.log(`✓ Tokens — every \`var(--wr-color-…)\` resolves to a declaration.`);
