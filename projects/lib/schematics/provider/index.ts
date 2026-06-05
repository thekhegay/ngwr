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
  readonly factory: string;
  /** Call expression spliced into the providers array. */
  readonly call: string;
  /** Extra imports needed to make `call` compile. */
  readonly extras?: readonly (readonly [string, string])[];
}

const PROVIDERS: Record<ProviderName, ProviderSpec> = {
  overlay: { subpath: 'ngwr/overlay', factory: 'provideWrOverlay', call: 'provideWrOverlay()' },
  icons: {
    subpath: 'ngwr/icon',
    factory: 'provideWrIcons',
    call: 'provideWrIcons([plus, trash])',
    extras: [['plus, trash', 'ngwr/icon']],
  },
  toast: { subpath: 'ngwr/toast', factory: 'provideWrToast', call: 'provideWrToast()' },
  i18n: { subpath: 'ngwr/i18n', factory: 'provideWrI18n', call: 'provideWrI18n()' },
  'date-adapter': {
    subpath: 'ngwr/date-adapter',
    factory: 'provideWrDateAdapter',
    call: 'provideWrDateAdapter()',
  },
  density: { subpath: 'ngwr/density', factory: 'provideWrDensity', call: 'provideWrDensity()' },
  'loading-bar': {
    subpath: 'ngwr/loading-bar',
    factory: 'provideWrLoadingBar',
    call: 'provideWrLoadingBar()',
  },
  cookie: { subpath: 'ngwr/cookie', factory: 'provideWrCookie', call: 'provideWrCookie()' },
  storage: { subpath: 'ngwr/storage', factory: 'provideWrStorage', call: 'provideWrStorage()' },
  theme: { subpath: 'ngwr/theme', factory: 'provideWrTheme', call: 'provideWrTheme()' },
};

function provider(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const spec = PROVIDERS[options.name];
    if (!spec) throw new SchematicsException(`ngwr:provider: unknown provider "${options.name}".`);

    const filePath = await resolveMainFile(tree, options);
    if (!filePath) {
      context.logger.info(printSnippet(spec));
      return tree;
    }

    const original = tree.readText(filePath);
    let next = original;

    next = ensureImport(next, spec.factory, spec.subpath);
    if (options.name === 'icons') {
      next = ensureImport(next, 'plus', 'ngwr/icon');
      next = ensureImport(next, 'trash', 'ngwr/icon');
    }
    next = ensureProviderCall(next, spec.call);

    if (next === original) {
      context.logger.info(`ngwr:provider: ${filePath} already has ${spec.factory} — no changes.`);
      return tree;
    }

    tree.overwrite(filePath, next);
    context.logger.info(`✓ Added ${spec.call} to ${filePath}.`);
    return tree;
  };
}

async function resolveMainFile(tree: Tree, options: Schema): Promise<string | null> {
  if (options.path && tree.exists(options.path)) return options.path;

  const workspace = await getWorkspace(tree);
  const projectName = options.project ?? (workspace.extensions.defaultProject as string | undefined);
  const project = (projectName && workspace.projects.get(projectName)) ?? workspace.projects.values().next().value;
  if (!project) return null;

  const main = project.targets.get('build')?.options?.main as string | undefined;
  const browser = project.targets.get('build')?.options?.browser as string | undefined;
  const candidate = main ?? browser ?? `${project.sourceRoot ?? 'src'}/main.ts`;
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

function ensureProviderCall(source: string, call: string): string {
  // Splice into the providers array of bootstrapApplication / ApplicationConfig.
  const arrayRe = /(\bproviders\s*:\s*\[)([\s\S]*?)(\])/m;
  const match = arrayRe.exec(source);
  if (!match) return source;

  // Already present?
  const callBase = call.split('(')[0];
  if (new RegExp(`\\b${escapeRegExp(callBase)}\\s*\\(`).test(match[2])) return source;

  const trimmed = match[2].replace(/\s+$/, '');
  const sep = trimmed.length && !trimmed.endsWith(',') ? ', ' : trimmed.length ? ' ' : '';
  const replaced = `${match[1]}${trimmed}${sep}${call}${match[3]}`;
  return source.replace(match[0], replaced);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function printSnippet(spec: ProviderSpec): string {
  return `
ngwr:provider — copy this into your bootstrap:

  import { ${spec.factory} } from '${spec.subpath}';

  bootstrapApplication(AppComponent, {
    providers: [/* …, */ ${spec.call}],
  });
`;
}

export default provider;
