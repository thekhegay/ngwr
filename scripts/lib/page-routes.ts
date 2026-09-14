/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Every showcase page directory, mapped to the ROUTE (or routes) the router
 * actually serves it at.
 *
 * **A page's directory is not its route, and the repository already contains
 * two places where they differ** — which is the whole reason this exists.
 * `reference/components/qr/` serves `/reference/components/qrcode`, and
 * `icons/svg-only/` serves six galleries off one shared template. Anything that
 * keys a per-page map by `dirname()` and is then looked up by URL therefore has
 * a hole in it that no gate can see: the entry is written, the lookup misses,
 * and both halves report success. `#core/generated/since` is looked up by the
 * URL a nav link carries, so it is keyed by what this module answers.
 *
 * **The routing tree is read by importing it, not by parsing it**, and that is
 * deliberate. `projects/showcase/app/routing.ts` and every `*.routing.ts` under
 * it import nothing but types, `#routing` and the sidebar configs — plain data,
 * no Angular runtime — so `tsx` can load them, and the array that comes back is
 * the same object Angular routes with. A textual parse would have to resolve
 * `path: components.qrCode` against a `routes` object of its own, i.e. re-derive
 * the very thing that is already sitting in memory, and it would silently
 * disagree with the router the first time a route was written a new way.
 *
 * `loadComponent` is the one thing NOT invoked: calling it imports an Angular
 * component and pulls the framework into a build script. Its specifier is read
 * out of the function's own source instead — the transpiler keeps it verbatim —
 * and a specifier that cannot be read is reported rather than skipped, because
 * a map that quietly covers most of the pages reads exactly like a complete one.
 */

import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Route } from '@angular/router';

import { ROOT_PATH } from './paths/root';

const APP_ROOT = resolve(ROOT_PATH, 'projects/showcase/app');
const ENTRY = join(APP_ROOT, 'routing.ts');

/** The specifier inside `() => import('…')`, whatever the transpiler wrapped around it. */
const SPECIFIER = /\bimport\(\s*["']([^"']+)["']\s*\)/;

/** The `imports`-style aliases `tsconfig.json` declares for the showcase. */
const ALIASES: Readonly<Record<string, string>> = {
  '#root': '_root/root',
  '#layout': '_layout/layout',
  '#routing': 'routing',
};

/** Resolve an `import()` specifier to a `.ts` file, or `null` when it names something outside the app. */
function fileFor(specifier: string, from: string): string | null {
  const alias = Object.keys(ALIASES).find(a => specifier === a || specifier.startsWith(`${a}/`));
  const candidate = alias
    ? join(APP_ROOT, `${ALIASES[alias]}${specifier.slice(alias.length)}.ts`)
    : specifier.startsWith('#core/')
      ? join(APP_ROOT, '_core', `${specifier.slice('#core/'.length)}.ts`)
      : specifier.startsWith('.')
        ? `${resolve(dirname(from), specifier)}.ts`
        : null;

  return candidate !== null && existsSync(candidate) ? candidate : null;
}

/** The routes a lazily-loaded routing module exports — `default`, or `routing` for the entry file. */
function routesOf(mod: unknown): readonly Route[] | null {
  if (typeof mod !== 'object' || mod === null) return null;
  const record = mod as Record<string, unknown>;
  for (const key of ['default', 'routing']) {
    const value = record[key];
    if (Array.isArray(value)) return value as readonly Route[];
  }
  return null;
}

export interface WrPageRoutes {
  /**
   * Page directory (relative to `projects/showcase/app`, `/`-separated) → every
   * route whose routed component lives in it, in walk order.
   *
   * Several routes for one directory is a real shape rather than a defect —
   * `icons/svg-only` holds six galleries and `_core/components/doc-index` is
   * the catalog page eight cluster roots render — so the ambiguity is handed to
   * the caller instead of being resolved by walk order.
   */
  readonly byDirectory: ReadonlyMap<string, readonly string[]>;
  /**
   * Anything the walk could not read. Non-empty means the map is short, and
   * every caller must treat it as untrustworthy rather than as smaller.
   */
  readonly problems: readonly string[];
}

export async function buildPageRoutes(): Promise<WrPageRoutes> {
  const byDirectory = new Map<string, string[]>();
  const problems: string[] = [];
  /**
   * Guards a routing module that lazily reaches itself, which would otherwise
   * hang the run. Keyed by module AND base path rather than by module alone:
   * one routing file mounted under two prefixes is a legal shape, and a
   * module-only guard would drop the second prefix's pages without a word.
   */
  const seen = new Set<string>();

  const walk = async (routes: readonly Route[], base: string, file: string): Promise<void> => {
    const where = relative(ROOT_PATH, file);

    for (const route of routes) {
      const segment = typeof route.path === 'string' ? route.path : '';
      const full = segment === '' ? base : base === '' ? segment : `${base}/${segment}`;

      if (route.children) await walk(route.children, full, file);

      if (route.loadChildren) {
        const specifier = SPECIFIER.exec(String(route.loadChildren))?.[1];
        const child = specifier === undefined ? null : fileFor(specifier, file);
        if (child === null) {
          problems.push(`${where}  the \`loadChildren\` for /${full} names a module this scan cannot resolve`);
          continue;
        }
        const visit = `${child}@${full}`;
        if (seen.has(visit)) continue;
        seen.add(visit);

        const nested = routesOf((await import(pathToFileURL(child).href)) as unknown);
        if (nested === null) {
          problems.push(`${relative(ROOT_PATH, child)}  exports no route array, so /${full} has no children here`);
          continue;
        }
        await walk(nested, full, child);
      }

      if (route.loadComponent) {
        const specifier = SPECIFIER.exec(String(route.loadComponent))?.[1];
        const component = specifier === undefined ? null : fileFor(specifier, file);
        if (component === null) {
          problems.push(`${where}  the \`loadComponent\` for /${full} names a file this scan cannot resolve`);
          continue;
        }
        const dir = relative(APP_ROOT, dirname(component)).split('\\').join('/');
        const list = byDirectory.get(dir);
        if (list) list.push(full);
        else byDirectory.set(dir, [full]);
      }
    }
  };

  seen.add(`${ENTRY}@`);
  const entry = routesOf((await import(pathToFileURL(ENTRY).href)) as unknown);
  if (entry === null) {
    return { byDirectory, problems: [`${relative(ROOT_PATH, ENTRY)}  exports no \`routing\` array — nothing was walked`] };
  }
  await walk(entry, '', ENTRY);

  return { byDirectory, problems };
}
