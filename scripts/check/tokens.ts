/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Fails the build when a `var(--wr-color-…)` or `var(--wr-border-…)` names a
 * token the theme never declares.
 *
 * A `var()` at a name nothing declares is invalid at computed-value time, so the
 * browser drops the WHOLE declaration holding it, with nothing said in the
 * build, the console or a test. `danglingReads` below says which reads count and
 * why. Interpolated reads (`var(--wr-color-#{$name}-dark)` in an intent loop) are
 * expanded against the list their `@each` iterates, which
 * `scripts/lib/scss-loops.ts` resolves. Everything here reads source, which is
 * what makes the check work without a build — it belongs in `pnpm lint` rather
 * than in a CI step after one.
 */

import { readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

import { walkFiles } from '../lib/fs/walk-files';
import { LIB_PATH } from '../lib/paths/lib';
import { ROOT_PATH } from '../lib/paths/root';
import { EACH, type LoopList, listsIn, resolveLoopList } from '../lib/scss-loops';
import { blankComments } from '../lib/ts-lex';

/** Where a read counts from — everything, for the reason at `danglingReads`. */
const READ_SOURCES: readonly string[] = [LIB_PATH, join(ROOT_PATH, 'projects/showcase')];
const READ_EXTENSIONS: ReadonlySet<string> = new Set(['.scss', '.html', '.ts']);

/**
 * Two exclusions, and they are the same exclusion twice.
 *
 * A codemod's whole job is the old vocabulary: a token rename is a table
 * mapping each deleted name to its successor, and its spec feeds it fixtures
 * holding every deleted name — including any it must REFUSE to rewrite, which
 * by construction can never resolve. Scanning those is asking a migration to
 * stop naming what it migrates. No shipped migration renames a token today
 * (v15 ships none), and the skip is what lets the next one.
 *
 * `/docs/migration` is the consumer-facing half of exactly that. Its diff
 * snippets show the removed name on the `-` line and its successor on the `+`
 * one, so every dangling read there is the page doing its job. Nothing else in
 * the showcase gets this: the page is the one surface whose subject is the
 * vocabulary a release took away.
 */
const READ_SKIP: readonly string[] = [
  join(ROOT_PATH, 'projects/lib/schematics'),
  join(ROOT_PATH, 'projects/showcase/app/docs/migration'),
];

/**
 * The concrete `var()` lines an interpolated one stands for.
 *
 * Component stylesheets loop over the intents and write
 * `var(--wr-color-#{$name}-dark)`, which reads one concrete token per member.
 * So the binding is resolved and the line is re-emitted once per member, scoped
 * by brace depth so a second `@each` in the same file cannot lend its list to
 * the first.
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
 * A `var(--wr-color-…)` naming a token the theme never declares.
 *
 * A dangling read is a broken rule. A `var()` at a name nothing
 * declares is invalid at computed-value time, so the browser drops the WHOLE
 * declaration holding it: a `border: 1px solid var(--wr-color-gone)` draws no
 * border at all, a `background` paints nothing, and there is no error anywhere —
 * not in the build, not in the console, not in a test. It reads exactly like a
 * rule someone deliberately did not write.
 *
 * v15 is why it exists. Cutting `secondary`, `light`, `medium` and `dark` from
 * the palette left 145 reads behind across the library and the showcase, and
 * every gate stayed green: `pnpm test` does not render, `check:a11y` runs in
 * JSDOM with no stylesheets, and `check:contrast` measures a colour it can only
 * see once something paints it. A dropped declaration is invisible to all of
 * them.
 *
 * Three decisions about scope, each of which is the reason a version of this
 * would otherwise be wrong:
 *
 * **Only the `--wr-color-*` namespace.** The theme layer owns it entirely, so a
 * name in it either resolves there or is a typo. A `--wr-<component>-*` hook is
 * the component's own and may legitimately be declared by a consumer, which is
 * the whole point of publishing it — and `gen:css-vars` catalogues those.
 *
 * **A read in a TEMPLATE or in TypeScript counts.** An inline
 * `style="background: var(--wr-color-light)"` is a live rule that draws nothing,
 * and a `var(--wr-color-dark)` inside a printed SCSS snippet is advice a reader
 * will paste into their own app, where it will draw nothing there instead. Both
 * are wrong, so both are reported. A comment is still not a read.
 *
 * **A declaration counts from a STYLESHEET or a template, never from
 * TypeScript.** `rebrand()` re-emits an intent's whole set on a subtree and a
 * demo may set one on a wrapper, so the theme layer is not the only place a
 * name can come from. But every `--wr-color-…:` in a `.ts` file in this repo is
 * inside a printed snippet — `/guides/theming` once showed a dark block
 * declaring `--wr-color-dark: #f5f6f8`, which was a picture of the OLD palette
 * — and counting those made the check answer that every read of a deleted
 * token resolved. It found 136 of them once the snippets stopped vouching for
 * names nothing declares.
 */
function danglingReads(): { file: string; line: number; name: string }[] {
  const declared = new Set<string>();
  const scanned: { file: string; lines: string[] }[] = [];
  const sources = READ_SOURCES.flatMap(dir =>
    walkFiles(dir, {
      skipDirs: ['node_modules', 'dist'],
      include: p => READ_EXTENSIONS.has(extname(p)) && !READ_SKIP.some(skip => p.startsWith(skip)),
    }).map(file => ({ file, text: readFileSync(file, 'utf8') }))
  );
  // What each `@each` iterates, read from the stylesheets already in hand.
  const lists = listsIn(sources.filter(({ file }) => extname(file) === '.scss').map(({ text }) => text));

  // The namespaces the THEME LAYER owns entirely, which is what makes a
  // dangling read in them reportable: a `var()` at a name nothing declares is
  // invalid at computed-value time, so the browser drops the whole declaration
  // holding it — `border: 1px solid var(--wr-border-gone)` draws no border at
  // all, and nothing says so in the build, the console or a test.
  //
  // `--wr-border-*` joined `--wr-color-*` when the border family was renamed
  // out of the colour namespace. Without it, 235 reads would have left this
  // check's cover in exchange for a better name, which is not a trade.
  //
  // The border half is an ENUMERATION and not a prefix, because the prefix is
  // not the theme's to own: `wr-border-glow` is a component, and
  // `--wr-border-glow-bg` is its hook. A greedy `--wr-border-[\w-]+` reported
  // three of those as dangling theme reads the moment it was tried.
  //
  // The `-rgb` arm outlived the tokens it was written for, deliberately: v15
  // removed every channel list, and the arm is what keeps a leftover
  // `rgba(var(--wr-border-base-rgb), …)` on this check's books as a dangling
  // read. A `--wr-color-…-rgb` needs no arm, since `[\w-]+` already takes it.
  const BORDER_FAMILY = 'subtle|base|strong';
  const THEME_TOKEN_DECL = new RegExp(`(--wr-(?:color-[\\w-]+|border-(?:${BORDER_FAMILY})(?:-rgb)?))\\s*:`, 'g');
  const THEME_TOKEN_READ = new RegExp(
    `var\\(\\s*(--wr-(?:color-[\\w-]+|border-(?:${BORDER_FAMILY})(?:-rgb)?))\\s*[,)]`,
    'g'
  );

  for (const { file, text } of sources) {
    // A comment is documentation, not a read: a `var(--wr-…)` inside one paints nothing.
    const src = blankComments(text, { html: true });
    const lines = [...src.split('\n'), ...expansions(src, lists)];
    scanned.push({ file: relative(ROOT_PATH, file), lines });
    if (extname(file) === '.ts') continue;
    for (const line of lines) {
      for (const m of line.matchAll(THEME_TOKEN_DECL)) declared.add(m[1]);
    }
  }

  const out: { file: string; line: number; name: string }[] = [];
  for (const { file, lines } of scanned) {
    lines.forEach((line, index) => {
      // An expansion has no honest line number, so it is scanned for names only
      // — a dangling read inside a loop is reported at the interpolated source
      // line by the pass over the raw text, which sees the same `var(`.
      if (index >= lines.length) return;
      for (const m of line.matchAll(THEME_TOKEN_READ)) {
        if (declared.has(m[1])) continue;
        out.push({ file, line: index + 1, name: m[1] });
      }
    });
  }

  return out;
}

const dangling = danglingReads();

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

console.log(`✓ Tokens — every \`var(--wr-color-…)\` resolves to a declaration.`);
