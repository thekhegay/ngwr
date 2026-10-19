/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';

import type { ProviderName, Schema } from './schema';

interface ProviderSpec {
  readonly subpath: string;
  /** What `call` invokes, imported from `subpath`. */
  readonly factory: string;
  /** Call expression spliced in. */
  readonly call: string;
  /** Extra imports needed to make `call` compile. */
  readonly extras?: readonly (readonly [string, string])[];
  /**
   * A `provideWr()` feature: `call` goes INSIDE the array's `provideWr(...)`,
   * which is added — with its import from `ngwr` — when the array has none.
   * Two `provideWr()` calls would compile, so splicing into the one that is
   * there is what keeps app-wide configuration in one place.
   */
  readonly feature?: boolean;
}

/** The root entry point's single call that carries every feature. */
const PROVIDE_WR = 'provideWr';

// Every entry here has to name a factory that `ngwr` actually exports, with a
// call that type-checks. `ngwr/loading-bar` and `ngwr/cookie` used to be listed
// too, but neither ships a provider — they expose the injectable services
// `WrLoadingBar` / `WrCookie` and need no bootstrap wiring at all, so offering
// to splice a provider for them only ever produced code that would not compile.
// `ngwr/overlay` is absent since v15: its isolated container is the tokens'
// default, with no call. And of the `provideWr()` features, `withTheme()`,
// `withMeta()` and `withDates()` are not offered: each exists to carry a value
// only the app knows — a scheme and its storage key, `<head>` defaults, a
// locale or an adapter.
const PROVIDERS: Record<ProviderName, ProviderSpec> = {
  icons: {
    // `ngwr/icon` ships no icons — there are no bare icon exports. The glyphs
    // come from the app's own `lucide` install through `lucideIcons()`, exactly
    // as `ng add` wires them.
    subpath: 'ngwr/icon',
    factory: 'provideWrIcons',
    call: 'provideWrIcons(lucideIcons({ plus: Plus, trash: Trash2 }))',
    extras: [
      ['lucideIcons', 'ngwr/icon'],
      ['Plus, Trash2', 'lucide'],
    ],
  },
  // `withToast` takes a required config object, so the call cannot be bare.
  toast: { subpath: 'ngwr/toast', factory: 'withToast', call: 'withToast({})', feature: true },
  i18n: { subpath: 'ngwr/i18n', factory: 'provideWrI18n', call: 'provideWrI18n()' },
  density: { subpath: 'ngwr/density', factory: 'withDensity', call: 'withDensity()', feature: true },
  storage: { subpath: 'ngwr/storage', factory: 'withStorage', call: 'withStorage()', feature: true },
};

function provider(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const spec = PROVIDERS[options.name];
    if (!spec) throw new SchematicsException(`ngwr:provider: unknown provider "${options.name}".`);

    const filePath = await resolveTargetFile(tree, options);
    if (!filePath) {
      context.logger.info(printSnippet(spec));
      return tree;
    }

    const original = tree.readText(filePath);
    // Splice FIRST, and bail before touching the file if there is nowhere to
    // splice into. The imports used to go in ahead of this, so by the time the
    // splice found no array the buffer already differed from the original and
    // the `next === original` guard below could not catch it: the file was
    // overwritten with an unused import and reported as `✓ Added <call>`. On a
    // stock app that made `ng g ngwr:provider` print success and leave the
    // providers exactly as they were.
    const spliced = spec.feature ? ensureFeature(original, spec.call) : ensureProviderCall(original, spec.call);
    if (spliced === null) {
      context.logger.info(`ngwr:provider: no providers array in ${filePath}.`);
      context.logger.info(printSnippet(spec));
      return tree;
    }

    let next = spliced.source;

    // `provideWr` first, so a fresh pair lands in the order a reader expects:
    // the call, then the feature it carries.
    if (spec.feature) next = ensureImport(next, PROVIDE_WR, 'ngwr');
    next = ensureImport(next, spec.factory, spec.subpath);
    // Drive the extra imports off `extras` rather than special-casing a provider
    // name here: the two used to drift apart, and the hard-coded branch was
    // emitting icon names that `ngwr/icon` has never exported.
    for (const [symbols, subpath] of spec.extras ?? []) {
      next = ensureImport(next, symbols, subpath);
    }

    if (next === original) {
      context.logger.info(`ngwr:provider: ${filePath} already has ${spec.factory} — no changes.`);
      return tree;
    }

    tree.overwrite(filePath, next);
    const where = spliced.into ? `${spliced.into} in ${filePath}` : filePath;
    context.logger.info(`✓ Added ${spliced.added} to ${where}.`);
    return tree;
  };
}

/** Where the providers array of a `bootstrapApplication` call or an `ApplicationConfig` opens. */
const PROVIDERS_OPEN = /\bproviders\s*:\s*\[/;

/** A splice, and what it added where — for the log line. */
interface Splice {
  readonly source: string;
  readonly added: string;
  /** The call it went inside, when that is not the providers array itself. */
  readonly into?: string;
}

/**
 * The file that actually holds `providers: [ … ]`.
 *
 * Resolving the build target's entry file and stopping there is only right for
 * the pre-v17 shape, where `bootstrapApplication` and its providers sit in
 * `main.ts` together. `ng new` has since split them: `main.ts` is two lines
 * ending in `bootstrapApplication(App, appConfig)` and the array lives in
 * `app/app.config.ts` — the layout `projects/showcase/main.ts` uses as well. So
 * follow the entry file's own RELATIVE imports one level and prefer whichever of
 * them owns the array; one level is what `ng new` generates, and a path alias
 * (`#root`, `@app/…`) is deliberately not followed, since resolving one needs
 * the tsconfig. When nothing found this way has an array, the entry file is
 * handed back and the caller prints a snippet rather than editing it.
 */
async function resolveTargetFile(tree: Tree, options: Schema): Promise<string | null> {
  const entry = await resolveEntryFile(tree, options);
  if (!entry) return null;
  if (findProvidersArray(tree.readText(entry))) return entry;

  return followConfigImport(tree, entry) ?? entry;
}

/** The first module `entry` imports relatively that declares a providers array. */
function followConfigImport(tree: Tree, entry: string): string | null {
  const dir = entry.slice(0, entry.lastIndexOf('/') + 1);

  for (const [, specifier] of tree.readText(entry).matchAll(/from\s*['"](\.[^'"]*)['"]/g)) {
    // TypeScript module specifiers carry no extension; `.ts` is the only one
    // `ng new` produces for this file, and a wrong guess just misses.
    const candidate = normalisePath(`${dir}${specifier}.ts`);
    if (tree.exists(candidate) && findProvidersArray(tree.readText(candidate))) return candidate;
  }

  return null;
}

/** Collapse `.` / `..` in a joined workspace path — `Tree` resolves neither. */
function normalisePath(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }

  return `${path.startsWith('/') ? '/' : ''}${out.join('/')}`;
}

async function resolveEntryFile(tree: Tree, options: Schema): Promise<string | null> {
  if (options.path && tree.exists(options.path)) return options.path;

  const workspace = await getWorkspace(tree);
  // Both bags are `Record<string, JsonValue>`. Named through a shape rather than
  // read with `foo['bar']`, because this file compiles under two configs: its own
  // CommonJS tsconfig, and — since the spec beside it imports it — the root one,
  // which sets `noPropertyAccessFromIndexSignature`.
  const extensions = workspace.extensions as { readonly defaultProject?: string };
  const projectName = options.project ?? extensions.defaultProject;
  const project = (projectName && workspace.projects.get(projectName)) ?? workspace.projects.values().next().value;
  if (!project) return null;

  const build = project.targets.get('build')?.options as
    { readonly main?: string; readonly browser?: string } | undefined;
  const candidate = build?.main ?? build?.browser ?? `${project.sourceRoot ?? 'src'}/main.ts`;
  return tree.exists(candidate) ? candidate : null;
}

function ensureImport(source: string, symbol: string, subpath: string): string {
  if (new RegExp(`\\bimport\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from`).test(source)) return source;

  const sameRe = new RegExp(`(import\\s*\\{)([^}]*)(\\}\\s*from\\s*['"]${escapeRegExp(subpath)}['"])`, 'm');
  const sameMatch = sameRe.exec(source);
  if (sameMatch) {
    const head = sameMatch[1];
    const body = sameMatch[2].trim().replace(/,\s*$/, '');
    const tail = sameMatch[3];
    const merged = body ? `${head} ${body}, ${symbol} ${tail}` : `${head} ${symbol} ${tail}`;
    return source.replace(sameMatch[0], merged);
  }

  const blockRe = /(^|\n)(import\s[^;]+;\s*\n)+/m;
  const block = blockRe.exec(source);
  const newLine = `import { ${symbol} } from '${subpath}';\n`;
  if (block) {
    const end = (block.index ?? 0) + block[0].length;
    return `${source.slice(0, end)}${newLine}${source.slice(end)}`;
  }
  return `${newLine}${source}`;
}

/** The source with `call` spliced into the providers array, or `null` when there is no array. */
function ensureProviderCall(source: string, call: string): Splice | null {
  const array = findProvidersArray(source);
  // `null`, not the untouched source: "nothing to do" and "already done" are
  // different answers, and returning the same value for both is what let the
  // caller report a successful edit it had not made.
  if (!array) return null;

  const body = source.slice(array.start, array.end);
  if (calls(body, call)) return { source, added: call };

  return { source: replaceRange(source, array.start, array.end, appendItem(body, call)), added: call };
}

/**
 * The source with `feature` inside the array's `provideWr(...)`, or a new
 * `provideWr(feature)` at the end of the array when it has none; `null` when
 * there is no array.
 */
function ensureFeature(source: string, feature: string): Splice | null {
  const array = findProvidersArray(source);
  if (!array) return null;

  const body = source.slice(array.start, array.end);
  const at = new RegExp(`\\b${PROVIDE_WR}\\s*\\(`).exec(body);
  if (!at) {
    const call = `${PROVIDE_WR}(${feature})`;
    return { source: replaceRange(source, array.start, array.end, appendItem(body, call)), added: call };
  }

  const inside = { added: feature, into: `${PROVIDE_WR}()` };
  const open = array.start + at.index + at[0].length - 1;
  const close = closingIndex(source, open);
  // An unbalanced call is not one to edit; the caller prints the snippet.
  if (close === -1) return null;

  const args = source.slice(open + 1, close);
  if (calls(args, feature)) return { source, ...inside };

  return { source: replaceRange(source, open + 1, close, appendItem(args, feature)), ...inside };
}

/** `source` with the text between `start` and `end` replaced by `text`. */
function replaceRange(source: string, start: number, end: number, text: string): string {
  return `${source.slice(0, start)}${text}${source.slice(end)}`;
}

/** Whether `list` already calls what `call` calls. */
function calls(list: string, call: string): boolean {
  return new RegExp(`\\b${escapeRegExp(call.split('(')[0])}\\s*\\(`).test(list);
}

/**
 * Where `providers: [ … ]` sits: the index just past its `[`, and that of the
 * `]` matching it.
 *
 * Bracket-matched rather than read up to the first `]`, which is what this used
 * to do: an array holding `importProvidersFrom([…])` ended inside that inner
 * array, and the call was spliced in there.
 */
function findProvidersArray(source: string): { readonly start: number; readonly end: number } | null {
  const match = PROVIDERS_OPEN.exec(source);
  if (!match) return null;

  const start = match.index + match[0].length;
  const end = closingIndex(source, start - 1);
  return end === -1 ? null : { start, end };
}

/**
 * The index of the bracket closing the one at `open`, or -1 when it never
 * closes. String literals and comments are skipped; a `${…}` inside a template
 * literal and a regular-expression literal are not, which no providers array
 * `ng new` writes contains.
 */
function closingIndex(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (char === '"' || char === "'" || char === '`') {
      // Past the closing quote, stepping over every escaped character.
      for (i++; i < source.length && source[i] !== char; i++) {
        if (source[i] === '\\') i++;
      }
    } else if (char === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i === -1) return -1;
    } else if (char === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i + 2);
      if (i === -1) return -1;
      i++;
    } else if (char === '(' || char === '[' || char === '{') {
      depth++;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * `list` — the inside of an array or of a call's parentheses — with `item` as
 * its last element, in the layout it already has: one element per line gets
 * a line of its own at the same indent, keeping a trailing comma; anything
 * else stays inline.
 */
function appendItem(list: string, item: string): string {
  const content = list.replace(/\s+$/, '');
  if (!content.trim()) return item;

  const comma = content.endsWith(',');
  if (!/^[^\S\n]*\n/.test(list)) return `${content}${comma ? ' ' : ', '}${item}`;

  const indent = /^\s*/.exec(content.slice(content.lastIndexOf('\n') + 1))?.[0] ?? '';
  return `${content}${comma ? '' : ','}\n${indent}${item}${comma ? ',' : ''}${list.slice(content.length)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printSnippet(spec: ProviderSpec): string {
  // This runs when no bootstrap file could be resolved, so the snippet is all the
  // user gets — it has to include `extras`, or the printed code references symbols
  // it never imports. That was exactly the gap `extras` was declared to close.
  // Grouped by module, so an extra from the factory's own entry point
  // (`lucideIcons` beside `provideWrIcons`) joins its line rather than
  // printing a second import of `ngwr/icon` — the shape `ensureImport` writes.
  const bySubpath = new Map<string, string[]>();
  if (spec.feature) bySubpath.set('ngwr', [PROVIDE_WR]);
  bySubpath.set(spec.subpath, [spec.factory]);
  for (const [symbols, subpath] of spec.extras ?? []) {
    bySubpath.set(subpath, [...(bySubpath.get(subpath) ?? []), symbols]);
  }
  const imports = [...bySubpath]
    .map(([subpath, symbols]) => `  import { ${symbols.join(', ')} } from '${subpath}';`)
    .join('\n');

  return `
ngwr:provider — copy this into your bootstrap:

${imports}

  bootstrapApplication(AppComponent, {
    providers: [/* …, */ ${spec.feature ? `${PROVIDE_WR}(${spec.call})` : spec.call}],
  });
${spec.feature ? `\n  Already calling ${PROVIDE_WR}()? Add ${spec.call} inside it instead.\n` : ''}`;
}

export default provider;
