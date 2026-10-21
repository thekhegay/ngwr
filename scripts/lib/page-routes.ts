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

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { exit } from 'node:process';
import { pathToFileURL } from 'node:url';

import type { Route } from '@angular/router';

import { libEntryPoints } from './entry-points';
import { err } from './log/err';
import { ROOT_PATH } from './paths/root';
import { SHOWCASE_APP_PATH as APP_ROOT } from './paths/showcase-app';

const ENTRY = join(APP_ROOT, 'routing.ts');

/** The specifier inside `() => import('…')`, whatever the transpiler wrapped around it. */
const SPECIFIER = /\bimport\(\s*["']([^"']+)["']\s*\)/;

/** The `imports`-style aliases `tsconfig.json` declares for the showcase. */
const ALIASES: Readonly<Record<string, string>> = {
  '#root': '_root/root',
  '#layout': '_layout/layout',
  '#routing': '_core/constants/routes',
};

/**
 * The subdirectories of `dir` that hold a `routing.ts` of their own.
 *
 * A cluster is assembled from one routing file per sidebar group, and the
 * groups SPREAD their arrays into the cluster's `routing.ts`. A spread is
 * plain data, so by the time this walk sees a route there is nothing left to
 * say which file wrote it — and its `loadComponent` specifier is relative to
 * the GROUP file, not to the cluster file the walk is holding. Rather than
 * make the groups spell a path that would be wrong for the bundler, resolution
 * falls back to these directories.
 */
function groupDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && existsSync(join(dir, e.name, 'routing.ts')))
    .map(e => join(dir, e.name));
}

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

  if (candidate !== null && existsSync(candidate)) return candidate;

  // A relative specifier the cluster file cannot resolve may belong to one of
  // its groups. Ambiguity is a problem rather than a guess, so a specifier
  // that resolves under two groups returns null and is reported.
  if (specifier.startsWith('.')) {
    const hits = groupDirs(dirname(from))
      .map(g => `${resolve(g, specifier)}.ts`)
      .filter(f => existsSync(f));
    if (hits.length === 1) return hits[0];
  }

  return null;
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
   * The directories in {@link byDirectory} whose routed component also carries
   * `children`: a layout shell drawn around pages (`_layout`), not a page.
   */
  readonly shells: ReadonlySet<string>;
  /**
   * Anything the walk could not read. Non-empty means the map is short, and
   * every caller must treat it as untrustworthy rather than as smaller.
   */
  readonly problems: readonly string[];
}

export async function buildPageRoutes(): Promise<WrPageRoutes> {
  const byDirectory = new Map<string, string[]>();
  const shells = new Set<string>();
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
        if (route.children) shells.add(dir);
      }
    }
  };

  seen.add(`${ENTRY}@`);
  const entry = routesOf((await import(pathToFileURL(ENTRY).href)) as unknown);
  if (entry === null) {
    return {
      byDirectory,
      shells,
      problems: [`${relative(ROOT_PATH, ENTRY)}  exports no \`routing\` array — nothing was walked`],
    };
  }
  await walk(entry, '', ENTRY);

  return { byDirectory, shells, problems };
}

/**
 * {@link buildPageRoutes}, or exit 1 with every problem on stderr: a short walk
 * builds a short map, and that reads exactly like a complete one.
 */
export async function requirePageRoutes(): Promise<WrPageRoutes> {
  const routes = await buildPageRoutes();
  if (routes.problems.length > 0) {
    err('\n✘ the route walk is short, so the map would be too:\n');
    for (const p of routes.problems) err(`    ${p}`);
    exit(1);
  }
  return routes;
}

/** A page directory the router serves at exactly one route. */
export interface WrSinglePage {
  /** Relative to `projects/showcase/app`, `/`-separated. */
  readonly dir: string;
  /** The same directory, absolute. */
  readonly abs: string;
  readonly route: string;
}

/**
 * The directories of `byDirectory` served at exactly one route, in walk order,
 * dropping any that is not a directory on disk. One directory behind several
 * routes, the icon galleries or a cluster's catalog, documents no single page.
 */
export function singleRoutePages(byDirectory: ReadonlyMap<string, readonly string[]>): WrSinglePage[] {
  const out: WrSinglePage[] = [];
  for (const [dir, routes] of byDirectory) {
    if (routes.length !== 1) continue;
    const abs = join(APP_ROOT, dir);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
    out.push({ dir, abs, route: routes[0] });
  }
  return out;
}

/** {@link requirePageRoutes}, as {@link singleRoutePages}. */
export async function requireSingleRoutePages(): Promise<WrSinglePage[]> {
  return singleRoutePages((await requirePageRoutes()).byDirectory);
}

/**
 * How many routes render a page: every route in `byDirectory` except a layout
 * shell's ({@link WrPageRoutes.shells}) and the `**` 404, which nobody opens on
 * purpose and the builder never prerenders. A module mounted under two prefixes
 * counts once per prefix, as the router serves it.
 */
export function docRouteCount(routes: WrPageRoutes): number {
  let count = 0;
  for (const [dir, list] of routes.byDirectory) {
    if (routes.shells.has(dir)) continue;
    count += list.filter(route => route !== '**' && !route.endsWith('/**')).length;
  }
  return count;
}

/**
 * The clusters a page documents an entry point from, in the order that decides
 * which page an entry point gets when it has several: the two entry-point
 * groups first, then the reference clusters, guides last.
 */
export const DOC_CLUSTERS: readonly string[] = [
  'charts',
  'bits',
  'reference/components',
  'reference/services',
  'reference/directives',
  'reference/pipes',
  'reference/utils',
  'reference/validators',
  'reference/interfaces',
  'guides',
];

/** One page and the entry point its directory is named after. */
export interface WrDocPage {
  /** Relative to `projects/showcase/app`, `/`-separated. */
  readonly dir: string;
  readonly route: string;
  /** `alert`, or `bits/aurora` for `bits/backgrounds/aurora`. */
  readonly entry: string;
  /** One of {@link DOC_CLUSTERS}: the route's first segment, or its first two under `reference/`. */
  readonly cluster: string;
}

export interface WrDocPages {
  /** Every admitted page, by directory. */
  readonly byDir: ReadonlyMap<string, WrDocPage>;
  /** Every admitted page, by route. */
  readonly byRoute: ReadonlyMap<string, WrDocPage>;
  /** One page per entry point, the first in {@link DOC_CLUSTERS} order, then walk order. */
  readonly byEntry: ReadonlyMap<string, WrDocPage>;
}

export interface WrDocPagesOptions {
  /** Keeps a page when it returns true, before any entry point picks its page. Defaults to every page. */
  readonly admit?: (page: WrDocPage) => boolean;
}

/**
 * Which entry point each page documents, by the DIRECTORY's name rather than
 * the route's, since `reference/components/display/qr/` serves `/qrcode`. A
 * name that is no entry point is looked up inside the groups that only hold
 * entry points (`bits`, `charts`); a page whose name matches none, or whose
 * route sits outside {@link DOC_CLUSTERS}, documents nothing.
 */
export function docPages(
  pages: Iterable<{ readonly dir: string; readonly route: string }>,
  options: WrDocPagesOptions = {}
): WrDocPages {
  const entries = new Set(libEntryPoints());
  const groups = [...new Set([...entries].filter(e => e.includes('/')).map(e => e.slice(0, e.indexOf('/'))))].filter(
    group => !entries.has(group)
  );
  const rank = (cluster: string): number => DOC_CLUSTERS.indexOf(cluster);

  const byDir = new Map<string, WrDocPage>();
  const byRoute = new Map<string, WrDocPage>();
  const byEntry = new Map<string, WrDocPage>();

  for (const { dir, route } of pages) {
    const name = dir.slice(dir.lastIndexOf('/') + 1);
    const entry = entries.has(name) ? name : groups.map(group => `${group}/${name}`).find(e => entries.has(e));
    const segments = route.split('/');
    const cluster = segments[0] === 'reference' ? segments.slice(0, 2).join('/') : segments[0];
    if (entry === undefined || rank(cluster) === -1) continue;

    const page: WrDocPage = { dir, route, entry, cluster };
    if (options.admit && !options.admit(page)) continue;

    byDir.set(dir, page);
    byRoute.set(route, page);
    const held = byEntry.get(entry);
    if (!held || rank(cluster) < rank(held.cluster)) byEntry.set(entry, page);
  }

  return { byDir, byRoute, byEntry };
}
