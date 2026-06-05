/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Rule, type SchematicContext, SchematicsException, type Tree } from '@angular-devkit/schematics';

import type { Schema } from './schema';

// Bundled at build time by `scripts/build-symbol-map.ts`. Map of every
// `Wr*` public symbol → the subpath it lives under.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const SYMBOL_MAP = require('./symbol-map.json') as Record<string, string>;

/**
 * Add `import { WrFoo } from 'ngwr/<subpath>';` to the given component
 * file and splice `WrFoo` into the `@Component({ imports: [...] })`
 * array. Saves the subpath-lookup dance for newcomers — `ng g ngwr:use
 * WrButton src/app/my-page.ts`.
 *
 * Regex-based on purpose to avoid pulling in the TS compiler as a runtime
 * dep. Covers the common standalone-component shape; an unusual file
 * shape gets a clear warning + a copy-pasteable snippet.
 */
function use(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const symbol = options.symbol.trim();
    if (!symbol) throw new SchematicsException('ngwr:use: missing required `symbol`.');

    const subpath = SYMBOL_MAP[symbol];
    if (!subpath) {
      throw new SchematicsException(
        `ngwr:use: unknown symbol "${symbol}". Check the catalog at https://ngwr.dev or use the literal import: \`import { ${symbol} } from 'ngwr/<subpath>';\``
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

export default use;
