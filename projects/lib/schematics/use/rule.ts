/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';

import { type Exports, shipsStyles } from '../utility/global-styles';

import type { Schema } from './schema';

/**
 * The public symbols that are NOT an Angular declarable, and what each one is.
 *
 * `@Component({ imports })` takes components, directives, pipes and NgModules;
 * anything else is rejected outright — "Component imports must be standalone
 * components, directives, pipes, or must be NgModules." The symbol map this
 * schematic resolves a name through carries subpaths only, because the import
 * LINE is the same whatever the symbol is; the `imports` array it also edits is
 * not. So `ng g ngwr:use WrDialog` used to report `✓ Added WrDialog (from
 * ngwr/dialog)` and leave behind a component that no longer builds.
 *
 * Each noun is read off the declaration in the library source — `@Service` /
 * `@Injectable` is a service, the rest are what they are written as. This table
 * has to ship (a consumer's machine has no library source to read), and
 * `rule.spec.ts` derives the same one from every `public-api.ts` in the lib and
 * fails when the two disagree — which is what keeps a newly added service from
 * quietly becoming spliceable again.
 */
const NON_DECLARABLE: Readonly<Record<string, string>> = {
  WrClipboard: 'a service',
  WrConfetti: 'a service',
  WrCookie: 'a service',
  WrDateAdapter: 'a service',
  WrDensity: 'a service',
  WrDialog: 'a service',
  WrDialogRef: 'a class',
  WrDrawerManager: 'a service',
  WrDrawerRef: 'a class',
  WrHaptics: 'a service',
  WrHotkey: 'a service',
  WrI18n: 'a service',
  WrI18nHttpLoader: 'a class',
  WrI18nStaticLoader: 'a class',
  WrLoadingBar: 'a service',
  WrMeta: 'a service',
  WrNativeDateAdapter: 'a service',
  WrOutsideClick: 'a service',
  WrOverlayContainer: 'a service',
  WrPlatform: 'a service',
  WrScroll: 'a service',
  WrStorage: 'a service',
  WrTheme: 'a service',
  WrToast: 'a service',
  WrToastRef: 'a class',
  WrTour: 'a service',
  WrValidators: 'a constant',
  WrWindowManager: 'a service',
  WrWindowRef: 'a class',
};

/**
 * Add `import { WrFoo } from 'ngwr/<subpath>';` to the given component
 * file and splice `WrFoo` into the `@Component({ imports: [...] })`
 * array. Saves the subpath-lookup dance for newcomers — `ng g ngwr:use
 * WrButton --path src/app/my-page.ts`.
 *
 * Only `symbol` is positional (see schema.json); `path` is a named option, so
 * the bare `ng g ngwr:use WrButton src/app/my-page.ts` form fails with
 * `Unknown argument`.
 *
 * Regex-based on purpose to avoid pulling in the TS compiler as a runtime
 * dep. Covers the common standalone-component shape; an unusual file
 * shape gets a clear warning + a copy-pasteable snippet.
 *
 * `symbolMap` is an argument rather than a module-level `require` so that this
 * file can be loaded from source — see the note in `./index`. So is `exports`,
 * the package's `exports` map: when the entry point ships a stylesheet, the
 * rule names the `@use` it also needs, because since v15 a component without
 * one renders unstyled and nothing else says why.
 */
function useRule(options: Schema, symbolMap: Record<string, string>, exports: Exports | null = null): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const symbol = options.symbol.trim();
    if (!symbol) throw new SchematicsException('ngwr:use: missing required `symbol`.');

    const subpath = symbolMap[symbol];
    if (!subpath) {
      throw new SchematicsException(
        `ngwr:use: unknown symbol "${symbol}". Check the catalog at https://ngwr.dev or use the literal import: \`import { ${symbol} } from 'ngwr/<subpath>';\``
      );
    }

    const kind = NON_DECLARABLE[symbol];
    if (kind) {
      throw new SchematicsException(
        `ngwr:use: ${symbol} is ${kind}, not a component, directive or pipe — Angular rejects it in \`@Component({ imports })\`. Import it and use it directly: \`import { ${symbol} } from '${subpath}';\``
      );
    }

    const filePath = resolveTargetFile(tree, options.path);
    if (!filePath) {
      // No file passed: just print the import snippet and stop.
      context.logger.info(printManualSnippet(symbol, subpath));
      logStyles(context, subpath, exports);
      return tree;
    }

    if (!tree.exists(filePath)) {
      throw new SchematicsException(`ngwr:use: file ${filePath} not found.`);
    }

    const original = tree.readText(filePath);

    // The array first, and nothing at all when it cannot be edited: an import
    // line with no `imports` entry is a component that fails to build on an
    // unknown element, after a log line saying it was added.
    const edit = addToImportsArray(original, symbol);
    if ('refused' in edit) {
      context.logger.warn(`ngwr:use: left ${filePath} unchanged — ${edit.refused}.`);
      context.logger.info(printManualSnippet(symbol, subpath));
      logStyles(context, subpath, exports);
      return tree;
    }

    const next = addImport(edit.source, symbol, subpath);

    if (next === original) {
      context.logger.info(`ngwr:use: ${filePath} already has ${symbol} — no changes.`);
      return tree;
    }

    tree.overwrite(filePath, next);
    context.logger.info(`✓ Added ${symbol} (from ${subpath}) to ${filePath}.`);
    logStyles(context, subpath, exports);
    return tree;
  };
}

/** The stylesheet line the entry point needs, when it ships one. */
function logStyles(context: SchematicContext, subpath: string, exports: Exports | null): void {
  const entry = subpath.replace(/^ngwr\//, '');
  if (!exports || !shipsStyles(exports, entry)) return;

  context.logger.info(
    `  Styles: add \`@use '${subpath}';\` after \`@use 'ngwr/theme';\` in your global stylesheet, ` +
      `or run \`ng g ngwr:component-style ${entry}\`.`
  );
}

function resolveTargetFile(tree: Tree, candidate: string | undefined): string | null {
  if (!candidate) return null;
  const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
  if (tree.exists(path)) return path;
  if (tree.exists(candidate)) return candidate;
  return null;
}

/**
 * Insert `import { Symbol } from 'subpath';` near the existing imports,
 * or merge into an existing line that already references the same path.
 * Idempotent — returns the source untouched if the symbol is already in.
 */
function addImport(source: string, symbol: string, subpath: string): string {
  // Already imported from somewhere?
  const importedAnywhere = new RegExp(`\\bimport\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from`).test(source);
  if (importedAnywhere) return source;

  // Existing import from the same subpath? — splice the symbol in.
  const sameSubpathRe = new RegExp(`(import\\s*\\{)([^}]*)(\\}\\s*from\\s*['"]${escapeRegExp(subpath)}['"])`, 'm');
  const sameSubpathMatch = sameSubpathRe.exec(source);
  if (sameSubpathMatch) {
    const head = sameSubpathMatch[1];
    const body = sameSubpathMatch[2].trim().replace(/,\s*$/, '');
    const tail = sameSubpathMatch[3];
    const merged = body ? `${head} ${body}, ${symbol} ${tail}` : `${head} ${symbol} ${tail}`;
    return source.replace(sameSubpathMatch[0], merged);
  }

  // No related import — prepend a new line after the last top-of-file
  // import we can find.
  const importBlockRe = /(^|\n)(import\s[^;]+;\s*\n)+/m;
  const block = importBlockRe.exec(source);
  const newLine = `import { ${symbol} } from '${subpath}';\n`;

  if (block) {
    // Splice in immediately after the last import in the block.
    const end = (block.index ?? 0) + block[0].length;
    return `${source.slice(0, end)}${newLine}${source.slice(end)}`;
  }

  // No existing imports — just prepend.
  return `${newLine}${source}`;
}

/** The edited source, or why the decorator's `imports` cannot be edited as text. */
type ArrayEdit = { readonly source: string } | { readonly refused: string };

/**
 * Splice the symbol into the `imports` array of the file's `@Component({...})`,
 * or add the key when the decorator has none. Skips if the symbol is already
 * listed.
 *
 * Everything is matched against {@link codeOnly}, never the raw text: a
 * whole-file search for `imports: [` used to edit the first one it met — in a
 * JSDoc example, in an inline template, in another object — and report success
 * while the decorator kept its own array. The key is looked up among the
 * decorator object's OWN properties, so a value it cannot edit as text
 * (`imports: SHARED`, a shorthand `imports`) refuses instead of growing a second
 * `imports` key beside it, and so does a file declaring more than one component,
 * where which one renders the symbol is not something the text says.
 */
function addToImportsArray(source: string, symbol: string): ArrayEdit {
  const code = codeOnly(source);
  const decorators = [...code.matchAll(/@Component\s*\(\s*\{/g)];
  // No @Component decorator at all — leave the file alone, the user probably
  // wants the import only.
  if (decorators.length === 0) return { source };
  if (decorators.length > 1) {
    return { refused: `it declares ${decorators.length} components, and which one renders ${symbol} is yours to say` };
  }

  const open = decorators[0].index + decorators[0][0].length - 1;
  const close = closingBracket(code, open);
  if (close < 0) return { refused: 'its @Component({ … }) never closes' };

  const key = ownProperty(code, open, close, 'imports');
  if (key === null) {
    return { source: `${source.slice(0, open + 1)}\n  imports: [${symbol}],${source.slice(open + 1)}` };
  }

  const colon = /^\s*:\s*/.exec(code.slice(key));
  const start = colon ? key + colon[0].length : -1;
  if (start < 0 || code[start] !== '[') {
    return { refused: 'its `imports` is not an array literal' };
  }

  const end = closingBracket(code, start);
  if (end < 0) return { refused: 'its `imports` array never closes' };
  if (new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(code.slice(start + 1, end))) return { source };

  // After the last CODE in the array, so a trailing `// comment` stays a comment
  // rather than swallowing the symbol.
  const at = start + 1 + code.slice(start + 1, end).trimEnd().length;
  const sep = at === start + 1 ? '' : code[at - 1] === ',' ? ' ' : ', ';
  return { source: `${source.slice(0, at)}${sep}${symbol}${source.slice(at)}` };
}

/**
 * The source with every comment, string and template literal blanked to spaces
 * (line breaks kept), so an index into it is an index into the source and no
 * bracket or `imports` inside a literal is ever read as code. A regex literal
 * is not recognised — none belongs in a component's decorator.
 */
function codeOnly(source: string): string {
  const out = source.split('');
  let i = 0;
  while (i < source.length) {
    const end = skipLiteral(source, i);
    if (end === i) {
      i++;
      continue;
    }
    for (let k = i; k < end; k++) if (out[k] !== '\n') out[k] = ' ';
    i = end;
  }
  return out.join('');
}

/** The index just past the comment or literal starting at `i`, or `i` when none starts there. */
function skipLiteral(source: string, i: number): number {
  const c = source[i];
  if (c === '/' && source[i + 1] === '/') {
    const end = source.indexOf('\n', i);
    return end < 0 ? source.length : end;
  }
  if (c === '/' && source[i + 1] === '*') {
    const end = source.indexOf('*/', i + 2);
    return end < 0 ? source.length : end + 2;
  }
  if (c !== '"' && c !== "'" && c !== '`') return i;

  let k = i + 1;
  while (k < source.length) {
    const ch = source[k];
    if (ch === '\\') k += 2;
    else if (ch === c) return k + 1;
    else if (c === '`' && ch === '$' && source[k + 1] === '{') k = interpolationEnd(source, k + 2);
    else if (c !== '`' && ch === '\n') return k;
    else k++;
  }
  return source.length;
}

/** The index just past the `}` that closes a template literal's `${`, literals inside it skipped. */
function interpolationEnd(source: string, i: number): number {
  let depth = 0;
  while (i < source.length) {
    const end = skipLiteral(source, i);
    if (end !== i) {
      i = end;
      continue;
    }
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && depth-- === 0) return i + 1;
    i++;
  }
  return source.length;
}

/** The index of the bracket closing the one at `open`, in {@link codeOnly} text; -1 when it never closes. */
function closingBracket(code: string, open: number): number {
  const pairs: Readonly<Record<string, string>> = { '{': '}', '[': ']', '(': ')' };
  const stack: string[] = [];
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === '}' || c === ']' || c === ')') {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/**
 * The index just past the name of the object's own `name` property — not one
 * nested in a value — in {@link codeOnly} text, or `null` when it has none.
 */
function ownProperty(code: string, open: number, close: number, name: string): number | null {
  const re = new RegExp(`[{,]\\s*${name}\\b`, 'y');
  let depth = 0;
  for (let i = open; i < close; i++) {
    const c = code[i];
    // The object's own brace, or a comma between its own properties.
    if (i === open || (depth === 1 && c === ',')) {
      re.lastIndex = i;
      const match = re.exec(code);
      if (match) return i + match[0].length;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printManualSnippet(symbol: string, subpath: string): string {
  return `
ngwr:use — copy this into your component:

  import { ${symbol} } from '${subpath}';

  @Component({
    imports: [/* …, */ ${symbol}],
    /* … */
  })
`;
}

export { NON_DECLARABLE, useRule };
