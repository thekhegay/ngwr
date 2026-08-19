/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';

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
  WrDateAdapter: 'an abstract class',
  WrDateFnsAdapter: 'a service',
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
  WrLuxonAdapter: 'a service',
  WrMarkdownHighlight: 'a service',
  WrMedia: 'a service',
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
  WrVisualViewport: 'a service',
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
 * file can be loaded from source — see the note in `./index`.
 */
function useRule(options: Schema, symbolMap: Record<string, string>): Rule {
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
      return tree;
    }

    if (!tree.exists(filePath)) {
      throw new SchematicsException(`ngwr:use: file ${filePath} not found.`);
    }

    const original = tree.readText(filePath);
    let next = original;

    next = addImport(next, symbol, subpath);
    next = addToImportsArray(next, symbol);

    if (next === original) {
      context.logger.info(`ngwr:use: ${filePath} already has ${symbol} — no changes.`);
      return tree;
    }

    tree.overwrite(filePath, next);
    context.logger.info(`✓ Added ${symbol} (from ${subpath}) to ${filePath}.`);
    return tree;
  };
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

/**
 * Find `imports: [...]` inside a `@Component({...})` decorator (single or
 * multi-line) and splice the symbol in. Skips if the symbol is already
 * listed.
 */
function addToImportsArray(source: string, symbol: string): string {
  // Match `imports: [ ... ]` allowing multi-line + trailing commas.
  const arrayRe = /(\bimports\s*:\s*\[)([\s\S]*?)(\])/m;
  const match = arrayRe.exec(source);
  if (!match) {
    // No imports array — try to insert one after the `@Component({`
    // opening brace. Heuristic, not foolproof.
    const componentRe = /@Component\s*\(\s*\{/;
    const compMatch = componentRe.exec(source);
    if (compMatch?.index === undefined) {
      // No @Component decorator at all — leave the file alone, the user
      // probably wants the import only.
      return source;
    }
    const insertAt = compMatch.index + compMatch[0].length;
    return `${source.slice(0, insertAt)}\n  imports: [${symbol}],${source.slice(insertAt)}`;
  }

  const body = match[2];
  if (new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(body)) return source;

  const trimmed = body.replace(/\s+$/, '');
  const sep = trimmed.length && !trimmed.endsWith(',') ? ', ' : trimmed.length ? ' ' : '';
  const replaced = `${match[1]}${trimmed}${sep}${symbol}${match[3]}`;
  return source.replace(match[0], replaced);
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
