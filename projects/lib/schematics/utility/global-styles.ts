/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';

/**
 * The global-stylesheet half of the schematics, in one place: `component-style`,
 * `page`, `use` and `ng-add` all need to know which entry points ship a
 * stylesheet, where its `@use` goes, or what to say when it cannot go anywhere.
 *
 * Since v15 there is no umbrella sheet. A component renders unstyled until its
 * own `@use 'ngwr/<name>';` is in the global stylesheet, and nothing in the
 * build or the console says so. The order matters too: the theme line comes
 * first, because it is the one that can carry `with ($base-colors: …)`, and Sass
 * configures a module only at its first load. A component sheet loads the theme
 * itself, so a component line above a configured theme line fails the build with
 * "This module was already loaded".
 */

/**
 * What a project whose global stylesheet is not Sass is told, instead of a line.
 *
 * Angular's stylesheet bundler resolves the `sass` condition of the `exports`
 * map from a CSS file too, so `@import 'ngwr/button';` builds there. But each
 * import is a Sass compilation of its own: it copies the token layer into every
 * line, about twice the CSS of the same components through `@use`, and no line
 * can take `with ($base-colors: …)`. So the advice is the rename, and no
 * schematic writes `@import` lines.
 */
const NOT_SASS_ADVICE =
  "ngwr ships Sass sources. A CSS file can `@import 'ngwr/<name>'`, but each import is a Sass compilation " +
  'of its own: it copies the whole theme into every line, and none of them can take `with ($base-colors: …)`. ' +
  'Rename the global stylesheet to .scss (and update its path in angular.json), then add ' +
  "`@use 'ngwr/theme';` to it, and one `@use 'ngwr/<name>';` per component you render after that.";

/** Whether `@use` can be written into this stylesheet. `.sass` is the indented syntax. */
function isSass(path: string): boolean {
  return path.endsWith('.scss') || path.endsWith('.sass');
}

/**
 * The project's first global stylesheet, as `angular.json` names it, or `null`.
 */
async function globalStylesheet(tree: Tree, projectName: string | undefined): Promise<string | null> {
  const workspace = await getWorkspace(tree);
  // Narrowed rather than read off the index signature: this file compiles under
  // the root tsconfig too, which sets `noPropertyAccessFromIndexSignature`.
  const extensions = workspace.extensions as { readonly defaultProject?: string };
  const name = projectName ?? extensions.defaultProject;
  const project = (name && workspace.projects.get(name)) ?? workspace.projects.values().next().value;
  if (!project) return null;

  const options = (project.targets.get('build')?.options ?? {}) as {
    readonly styles?: readonly (string | { readonly input: string })[];
  };
  const first = options.styles?.[0];
  const path = typeof first === 'string' ? first : first?.input;

  return path && tree.exists(path) ? path : null;
}

/** The `exports` map of an ngwr manifest. */
type Exports = Readonly<Record<string, unknown>>;

/**
 * The `exports` map of the ngwr package these schematics shipped in, or `null`.
 *
 * Read from the manifest two levels up — `dist/lib/package.json` once
 * published, `projects/lib/package.json` in the repo — with `fs`, because the
 * `exports` map itself does not expose `package.json`. `null` where that cannot
 * be read: a spec loads this source as an ES module, which has no `__dirname`,
 * and passes a map of its own instead.
 */
function shippedExports(): Exports | null {
  if (typeof __dirname !== 'string') return null;

  const file = join(__dirname, '..', '..', 'package.json');
  if (!existsSync(file)) return null;

  const manifest = JSON.parse(readFileSync(file, 'utf8')) as { readonly name?: string; readonly exports?: Exports };

  return manifest.name === 'ngwr' && manifest.exports ? manifest.exports : null;
}

/** Whether an `exports` entry carries a `sass` condition, which is what `@use` resolves. */
function hasSass(entry: unknown): boolean {
  return typeof entry === 'object' && entry !== null && 'sass' in entry;
}

/** Whether the entry point at `subpath` (no `ngwr/`) ships a stylesheet. */
function shipsStyles(exports: Exports, subpath: string): boolean {
  return hasSass(exports[`./${subpath}`]);
}

/** The entry point a style name refers to, or why there is none. */
type StyleTarget =
  { readonly subpath: string; readonly movedFrom?: string; readonly error?: undefined } | { readonly error: string };

/**
 * The style entry point `name` refers to, checked against the `exports` map.
 *
 * A name with no `sass` condition behind it used to get its `@use` written and
 * a success line, and the user found out at the next build with "Can't find
 * stylesheet to import". v15 made that the likely case for a name typed from
 * memory: the charts and the bits moved under `charts/` and `bits/`. So a bare
 * name that exactly one nested entry point ends with resolves to it, and
 * anything else is refused with the reason.
 *
 * With no map to check against, the name is trusted as given.
 */
function styleTarget(name: string, exports: Exports | null): StyleTarget {
  const subpath = name.replace(/^ngwr\//, '').replace(/^\/+|\/+$/g, '');
  if (!exports || shipsStyles(exports, subpath)) return { subpath };

  const nested = Object.keys(exports).filter(key => key.endsWith(`/${subpath}`) && hasSass(exports[key]));
  if (nested.length === 1 && !subpath.includes('/')) return { subpath: nested[0].slice(2), movedFrom: subpath };

  if (exports[`./${subpath}`]) return { error: `ngwr/${subpath} ships no stylesheet, so there is nothing to add.` };

  return {
    error:
      `ngwr/${subpath} is not an entry point with a stylesheet. Give its path under ngwr/, nested ones ` +
      'included: button, charts/bar-chart, bits/aurora.',
  };
}

/** One top-level `@use` / `@forward`: where it starts, where it ends, and what it loads. */
interface UseRule {
  readonly start: number;
  /** The index of its `;`, or of the newline that ends it in the indented syntax. */
  readonly end: number;
  readonly url: string;
}

/**
 * Every top-level `@use` and `@forward` in a stylesheet.
 *
 * Scanned rather than matched line by line, because the statement that matters
 * most is the one that spans lines: `@use 'ngwr/theme' with (` and a map of
 * colours below it. Comments and strings are skipped, and a rule inside a block
 * is not top-level. In the indented syntax a top-level rule starts a line and
 * ends at the newline.
 */
function topLevelUses(source: string, indented: boolean): readonly UseRule[] {
  const found: UseRule[] = [];
  let braces = 0;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);
      if (newline === -1) break;
      i = newline;
    } else if (char === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close === -1) break;
      i = close + 1;
    } else if (char === '"' || char === "'") {
      i = stringEnd(source, i);
    } else if (char === '{') {
      braces++;
    } else if (char === '}') {
      braces--;
    } else if (char === '@' && braces === 0 && (!indented || i === 0 || source[i - 1] === '\n')) {
      const rule = /^@(?:use|forward)\s+(['"])([^'"]*)\1/.exec(source.slice(i));
      if (!rule) continue;

      const end = statementEnd(source, i, indented);
      found.push({ start: i, end, url: rule[2] });
      i = end;
    }
  }

  return found;
}

/** The index of the quote closing the string that opens at `open`. */
function stringEnd(source: string, open: number): number {
  for (let i = open + 1; i < source.length; i++) {
    if (source[i] === '\\') i++;
    else if (source[i] === source[open]) return i;
  }

  return source.length;
}

/** The `;` that ends the statement at `from`, outside every parenthesis and string. */
function statementEnd(source: string, from: number, indented: boolean): number {
  let depth = 0;

  for (let i = from; i < source.length; i++) {
    const char = source[i];

    if (char === '"' || char === "'") i = stringEnd(source, i);
    else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (depth <= 0 && (char === ';' || (indented && char === '\n'))) return i;
  }

  return source.length;
}

/** Whether the stylesheet already loads `ngwr/<subpath>`, configured or not. */
function loads(source: string, subpath: string): boolean {
  return new RegExp(`['"]ngwr/${subpath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(source);
}

/** `source` with `line` on a line of its own, after the statement ending at `end`. */
function insertAfter(source: string, end: number, line: string): string {
  const newline = source.indexOf('\n', end);
  if (newline === -1) return `${source}\n${line}\n`;

  return `${source.slice(0, newline + 1)}${line}\n${source.slice(newline + 1)}`;
}

/** `source` with `line` on a line of its own, above the line holding `at`. */
function insertBefore(source: string, at: number, line: string): string {
  const start = source.lastIndexOf('\n', at - 1) + 1;

  return `${source.slice(0, start)}${line}\n${source.slice(start)}`;
}

/** What {@link addStyleUse} did. */
interface StyleEdit {
  readonly source: string;
  /** The lines it added, in order: none when both were already there. */
  readonly added: readonly string[];
  /** Set when a component line already sits above the theme line, which no edit here reorders. */
  readonly misordered: boolean;
}

/**
 * `source` with `@use 'ngwr/<subpath>';` in it, below the theme.
 *
 * The theme line goes in first when there is none, above any other `ngwr/` line,
 * and a component line goes after the LAST top-level `@use` / `@forward`. That
 * keeps the order v15 requires and the order the lines were asked for, and it
 * never lands a line where Sass refuses one: a `@use` has to precede every rule
 * except `@forward`. Idempotent: a stylesheet that already loads the entry point,
 * configured or not, is handed back as it was.
 */
function addStyleUse(source: string, subpath: string, indented: boolean): StyleEdit {
  const added: string[] = [];
  let next = source;

  if (!loads(next, 'theme')) {
    const rules = topLevelUses(next, indented);
    const firstNgwr = rules.find(rule => rule.url.startsWith('ngwr/'));
    const last = rules.at(-1);
    const line = "@use 'ngwr/theme';";

    if (firstNgwr) next = insertBefore(next, firstNgwr.start, line);
    else if (last) next = insertAfter(next, last.end, line);
    else next = `${line}\n${next}`;
    added.push(line);
  }

  if (subpath !== 'theme' && !loads(next, subpath)) {
    const last = topLevelUses(next, indented).at(-1);
    const line = `@use 'ngwr/${subpath}';`;

    next = last ? insertAfter(next, last.end, line) : `${line}\n${next}`;
    added.push(line);
  }

  const rules = topLevelUses(next, indented).filter(rule => rule.url.startsWith('ngwr/'));
  const theme = rules.findIndex(rule => rule.url === 'ngwr/theme');

  return { source: next, added, misordered: theme > 0 };
}

export {
  NOT_SASS_ADVICE,
  addStyleUse,
  globalStylesheet,
  isSass,
  shippedExports,
  shipsStyles,
  styleTarget,
  topLevelUses,
};
export type { Exports, StyleEdit, StyleTarget };
