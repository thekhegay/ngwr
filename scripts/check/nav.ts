/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Holds the sidebar to the site the build shipped: every nav row links a
 * prerendered page, and every prerendered page has a nav row.
 *
 * Both sides are read from their sources. The pages come from
 * `dist/showcase/prerendered-routes.json`, the manifest the builder writes, so
 * the check runs after `build:showcase`. The rows come from the sidebar
 * configs, imported through tsx like the route tree is - they are plain data on
 * `#routes`, no Angular runtime - so a row written a new way still counts.
 *
 * What is excused is found from the code, not kept in a list here:
 *
 * - A redirect stub (a section index such as `/charts`, a slug v15 folded or
 *   moved) is a meta-refresh page, which `prerenderedPages` reads off the HTML.
 *   It is not a page, so it needs no row - and a row must not point at one.
 * - A page served by an underscore directory (`_home`, `_labels`,
 *   `_core/components/doc-index`) is site scaffolding rather than a docs page:
 *   the home, the label pages, the catalog the reference roots render. The
 *   route walk in `lib/page-routes.ts` says which directory serves a route,
 *   with `labels/:label` matched segment by segment.
 * - A row whose route the router serves but the build did not prerender is a
 *   client-rendered page (the six raw-SVG icon galleries declare
 *   `RenderMode.Client` in `app.routes.server.ts`). Admitted and counted.
 *
 * A prerendered route the walk serves nowhere fails too: either the build is
 * stale or the route was removed, and both deserve a rebuild rather than a pass.
 */

import { join } from 'node:path';
import { exit } from 'node:process';
import { pathToFileURL } from 'node:url';

import type { SidebarGroup } from '../../projects/showcase/app/_core/types/sidebar';
import { prerenderedPages } from '../lib/dist-site';
import { err } from '../lib/log/err';
import { info } from '../lib/log/info';
import { requirePageRoutes } from '../lib/page-routes';
import { SHOWCASE_APP_PATH } from '../lib/paths/showcase-app';

const LABEL = 'check:nav';

const CONFIGS = join(SHOWCASE_APP_PATH, '_layout/sidebar/configs/index.ts');

/** Every `url` the sidebar configs export, group rows and children alike. */
async function navUrls(): Promise<Set<string>> {
  const mod = (await import(pathToFileURL(CONFIGS).href)) as Record<string, unknown>;
  const urls = new Set<string>();
  for (const value of Object.values(mod)) {
    if (!Array.isArray(value)) continue;
    for (const group of value as readonly SidebarGroup[]) {
      if (group.url) urls.add(group.url);
      for (const child of group.children ?? []) if (child.url) urls.add(child.url);
    }
  }
  return urls;
}

/** A walked route as segments, and the page directory serving it. */
interface Served {
  readonly segments: readonly string[];
  readonly dir: string;
}

/** The directory the router serves `route` from, `:param` segments matching any one segment, or `null`. */
function dirServing(route: string, served: readonly Served[]): string | null {
  const segments = route.split('/').filter(Boolean);
  const hit = served.find(
    s => s.segments.length === segments.length && s.segments.every((seg, i) => seg.startsWith(':') || seg === segments[i])
  );
  return hit?.dir ?? null;
}

/** `_home`, `_labels`, `_core/...`: shared scaffolding, never a docs page. */
function isScaffolding(dir: string): boolean {
  return dir.startsWith('_');
}

async function main(): Promise<void> {
  const pages = prerenderedPages(LABEL);
  const routes = await requirePageRoutes();
  const urls = await navUrls();

  const served: Served[] = [];
  for (const [dir, list] of routes.byDirectory) {
    for (const route of list) {
      if (route.includes('*')) continue;
      served.push({ segments: route.split('/').filter(Boolean), dir });
    }
  }

  const stubs = new Map<string, string>();
  for (const page of pages) if (page.redirectTo !== null) stubs.set(page.route, page.redirectTo);
  const canonical = new Set(pages.filter(p => p.redirectTo === null).map(p => p.route));

  const offences: string[] = [];
  let clientRendered = 0;
  let scaffolding = 0;

  for (const url of urls) {
    if (canonical.has(url)) continue;
    const target = stubs.get(url);
    if (target !== undefined) offences.push(`${url}  nav row links a redirect stub (-> ${target})`);
    else if (dirServing(url, served) !== null) clientRendered += 1;
    else offences.push(`${url}  nav row, no prerendered route`);
  }

  for (const route of canonical) {
    if (urls.has(route)) continue;
    const dir = dirServing(route, served);
    if (dir === null) offences.push(`${route}  prerendered, but the router serves it nowhere (stale dist/showcase, or a removed route)`);
    else if (isScaffolding(dir)) scaffolding += 1;
    else offences.push(`${route}  prerendered page, no nav row`);
  }

  if (offences.length > 0) {
    err(`\n✘ ${LABEL}: ${offences.length} route(s) and nav row(s) disagree:\n`);
    for (const line of offences.sort()) err(`    ${line}`);
    err('');
    exit(1);
  }

  info(
    `✓ ${LABEL}: ${urls.size} nav rows and ${canonical.size} prerendered pages agree` +
      ` (${stubs.size} redirect stubs, ${scaffolding} scaffolding pages, ${clientRendered} client-rendered rows excused)`
  );
}

await main();
