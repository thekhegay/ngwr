/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes `#core/generated/deps.ts`: what each entry point needs and what it
 * relates to, read from the library's own imports and the docs pages' demos.
 * `<ngwr-doc-page>` renders the Dependencies section from it and
 * `<ngwr-doc-see-also>` merges the related pages in, so neither can drift
 * from the code.
 *
 *   pnpm gen:deps
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { docPageTags, pageNgwrImports } from '../lib/doc-page';
import { entryFiles, libEntryPoints } from '../lib/entry-points';
import { emitGenerated, GENERATED_DIR, generatedHeader } from '../lib/generated';
import { docPages, requireSingleRoutePages } from '../lib/page-routes';
import { LIB_PATH as LIB } from '../lib/paths/lib';

const OUT_FILE = join(GENERATED_DIR, 'deps.ts');

/**
 * Plumbing every component touches; listing it would say nothing. `charts/core` is the
 * charts' shared palette, number writers and axis: every export is `@internal`, so a
 * "Built on" row naming it would point readers at an entry point they must not import.
 */
const INFRA = new Set(['utils', 'utils/types', 'i18n', 'platform', 'theme', 'charts/core']);

/** Imported by demos to draw the page itself, not related to what it documents. */
const SCAFFOLDING = new Set([
  ...INFRA,
  'typography',
  'layout',
  'grid',
  'pipes',
  'directives',
  'storage',
  // Controls a demo uses to drive the thing it shows: a button that opens a dialog.
  'button',
  'checkbox',
  'keyboard',
  'segmented',
  'slider',
]);

/** CDK helpers used everywhere; the functional modules are what a reader acts on. */
const CDK_HELPERS = new Set(['coercion', 'bidi', 'platform', 'keycodes']);

const KIND: readonly (readonly [string, string])[] = [
  ['reference/components/', 'Component'],
  ['reference/directives/', 'Directive'],
  ['reference/services/', 'Service'],
  ['reference/pipes/', 'Pipe'],
  ['reference/utils/', 'Util'],
  ['reference/validators/', 'Validator'],
  ['reference/interfaces/', 'Type'],
  ['charts/', 'Component'],
  ['bits/', 'Animation'],
  ['guides/', 'Guide'],
];

const kindOf = (route: string): string | undefined => KIND.find(([prefix]) => route.startsWith(prefix))?.[1];

/**
 * The two clusters that document no entry point still say what a page is, so a
 * See also card or a label reads the same for every route. Kept out of `KIND`,
 * which also decides whose demos are read for relations and which pages can
 * document an entry point.
 */
const SECTION_KIND: readonly (readonly [string, string])[] = [
  ['docs/', 'Docs'],
  ['icons/', 'Icons'],
];

const routeKindOf = (route: string): string | null =>
  kindOf(route) ?? SECTION_KIND.find(([prefix]) => route.startsWith(prefix))?.[1] ?? null;

interface Page {
  readonly route: string;
  readonly title: string;
  readonly kind: string;
}

interface Deps {
  uses: string[];
  usedBy: string[];
  peers: { pkg: string; parts: string[]; optional: boolean }[];
  addons: { path: string; peers: string[] }[];
}

/** Runtime import specifiers of one file: `import type` and type-only lists are skipped. */
function runtimeImports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of src.matchAll(/^(?:import|export)\s+(type\s+)?(?:([^'";]*?)\s+from\s+)?'([^']+)'/gm)) {
    const [, typeOnly, clause = '', spec] = m;
    if (typeOnly) continue;
    const list = /\{([^}]*)\}/.exec(clause);
    const bare = clause
      .replace(/\{[^}]*\}/, '')
      .replace(/,/g, '')
      .trim();
    if (list && !bare) {
      const names = list[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (names.length > 0 && names.every(n => n.startsWith('type '))) continue;
    }
    out.push(spec);
  }
  return out;
}

function libDeps(eps: string[], optionalPeers: Set<string>): Map<string, Deps> {
  const all = new Set(eps);
  const map = new Map<string, Deps>();
  for (const ep of eps) {
    if (!existsSync(join(LIB, ep))) continue;
    const uses = new Set<string>();
    const peers = new Map<string, Set<string>>();
    for (const file of entryFiles(ep, { skipInternal: false })) {
      for (const spec of runtimeImports(file)) {
        if (spec.startsWith('ngwr/')) {
          const target = spec.slice(5);
          if (target !== ep && !INFRA.has(target) && !target.startsWith('i18n/') && all.has(target)) uses.add(target);
        } else if (spec.startsWith('@angular/cdk/')) {
          const part = spec.split('/')[2];
          if (!CDK_HELPERS.has(part))
            (peers.get('@angular/cdk') ?? peers.set('@angular/cdk', new Set()).get('@angular/cdk')!).add(part);
        } else if (spec === '@angular/router' || spec === '@angular/common/http') {
          peers.set(spec, peers.get(spec) ?? new Set());
        } else if (spec.startsWith('prosemirror-')) {
          (peers.get('prosemirror') ?? peers.set('prosemirror', new Set()).get('prosemirror')!).add(spec);
        }
      }
    }
    map.set(ep, {
      uses: [...uses].sort(),
      usedBy: [],
      peers: [...peers]
        .map(([pkg, parts]) => ({
          pkg,
          parts: [...parts].sort(),
          optional: pkg === 'prosemirror' ? [...parts].every(p => optionalPeers.has(p)) : optionalPeers.has(pkg),
        }))
        .sort((a, b) => a.pkg.localeCompare(b.pkg)),
      addons: [],
    });
  }

  // An add-on importing its parent is not a user of it; it is listed under `addons`.
  for (const [ep, d] of map) for (const u of d.uses) if (!ep.startsWith(`${u}/`)) map.get(u)?.usedBy.push(ep);
  for (const d of map.values()) d.usedBy.sort();

  // A nested entry point under a real one is its add-on: `tabs/router` for `tabs`.
  for (const ep of eps) {
    const parent = ep.slice(0, ep.lastIndexOf('/'));
    if (!ep.includes('/') || ep.startsWith('i18n/') || !map.has(parent)) continue;
    const own = map.get(ep);
    map.get(parent)!.addons.push({ path: ep, peers: own?.peers.map(p => p.pkg) ?? [] });
  }
  return map;
}

/** `ngwr/*` entry points a page directory's demos import at runtime. */
function pageImports(dir: string, all: Set<string>): Set<string> {
  return new Set(
    [...pageNgwrImports(dir).keys()].map(path => path.slice('ngwr/'.length)).filter(path => all.has(path))
  );
}

function pageTitle(dir: string): string | null {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const title = docPageTags(readFileSync(join(dir, f), 'utf8'))[0]?.get('title');
    if (title) return title;
  }
  return null;
}

/** The static `[labels]="['A', 'B']"` on a page's `<ngwr-doc-page>`, or `[]`. */
function pageLabels(dir: string): string[] {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const [tag] = docPageTags(readFileSync(join(dir, f), 'utf8'));
    if (tag === undefined) continue;
    const list = /^\[([^\]]*)\]$/.exec(tag?.get('[labels]') ?? '')?.[1];
    return list ? [...list.matchAll(/'([^']+)'/g)].map(m => m[1]) : [];
  }
  return [];
}

/**
 * The static `description="…"` on a page's `<ngwr-doc-page>`, as written (the
 * `wrDocRich` forms included), or `null` — for a page with none, and for one
 * that binds `[description]`, which only the running page can read.
 */
function pageDescription(dir: string): string | null {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const [tag] = docPageTags(readFileSync(join(dir, f), 'utf8'));
    if (tag === undefined) continue;
    const description = tag?.get('description')?.trim();
    if (!description) return null;
    return description;
  }
  return null;
}

interface RoutePage {
  readonly title: string;
  readonly kind: string | null;
  readonly labels: readonly string[];
  readonly description: string | null;
}

function serialize(
  deps: Map<string, Deps>,
  pages: Map<string, Page>,
  related: Map<string, string[]>,
  routePages: Map<string, RoutePage>
): string {
  const sorted = <T>(m: Map<string, T>): [string, T][] => [...m].sort(([a], [b]) => a.localeCompare(b));
  const depsBody = sorted(deps)
    .filter(([, d]) => d.uses.length || d.usedBy.length || d.peers.length || d.addons.length)
    .map(([ep, d]) => `  ${JSON.stringify(ep)}: ${JSON.stringify(d)},`)
    .join('\n');
  const pageBody = sorted(pages)
    .map(([ep, p]) => `  ${JSON.stringify(ep)}: ${JSON.stringify(p)},`)
    .join('\n');
  const relatedBody = sorted(related)
    .map(([route, eps]) => `  ${JSON.stringify(route)}: ${JSON.stringify(eps)},`)
    .join('\n');
  const routeBody = sorted(routePages)
    .map(([route, page]) => `  ${JSON.stringify(route)}: ${JSON.stringify(page)},`)
    .join('\n');
  return `${generatedHeader(`/** GENERATED by \`pnpm gen:deps\` from the library's imports and the pages' demos — do not edit. */`)}

export interface DocDepsPeer {
  /** \`@angular/cdk\`, \`@angular/router\`, \`prosemirror\`. */
  readonly pkg: string;
  /** CDK modules, or the prosemirror packages. */
  readonly parts: readonly string[];
  readonly optional: boolean;
}

export interface DocDeps {
  /** ngwr entry points it imports; they come with it, nothing to install. */
  readonly uses: readonly string[];
  readonly usedBy: readonly string[];
  readonly peers: readonly DocDepsPeer[];
  /** Nested entry points that extend it, with the packages each needs. */
  readonly addons: readonly { readonly path: string; readonly peers: readonly string[] }[];
}

/** Entry point → its dependencies. */
export const DEPS: Readonly<Record<string, DocDeps>> = {
${depsBody}
};

/** Entry point → the page documenting it. */
export const DOC_PAGES: Readonly<Record<string, { readonly route: string; readonly title: string; readonly kind: string }>> = {
${pageBody}
};

/** Route → entry points its demos use alongside the one it documents. */
export const DEMO_RELATED: Readonly<Record<string, readonly string[]>> = {
${relatedBody}
};

/**
 * Route → its title, its kind (from the route; \`Docs\` and \`Icons\` for the two
 * clusters that document no entry point), the labels its page declares and its
 * static \`description\` as written, \`null\` where the page binds one.
 */
export const DOC_ROUTES: Readonly<
  Record<
    string,
    {
      readonly title: string;
      readonly kind: string | null;
      readonly labels: readonly string[];
      readonly description: string | null;
    }
  >
> = {
${routeBody}
};
`;
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8')) as {
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  };
  const optionalPeers = new Set(
    Object.entries(manifest.peerDependenciesMeta ?? {})
      .filter(([, m]) => m.optional)
      .map(([name]) => name)
  );

  const eps = libEntryPoints(LIB).filter(e => !e.endsWith('/testing') && !e.startsWith('schematics'));
  const all = new Set(eps);
  const deps = libDeps(eps, optionalPeers);

  // Route → its title, kind, labels and description, and the entry points its demos import.
  const singles = await requireSingleRoutePages();
  const importsByRoute = new Map<string, Set<string>>();
  const routePages = new Map<string, RoutePage>();
  for (const { abs, route } of singles) {
    if (route.includes(':') || route === '') continue;
    const kind = kindOf(route);
    const title = pageTitle(abs);
    if (title) {
      routePages.set(route, {
        title,
        kind: routeKindOf(route),
        labels: pageLabels(abs),
        description: pageDescription(abs),
      });
    }
    if (kind) importsByRoute.set(route, pageImports(abs, all));
  }

  // Entry point → page: the page named after it, if its demos import it. A guide
  // needs no import, and a reference page wins over a guide of the same name.
  const doc = docPages(singles, {
    admit: page => {
      const imports = importsByRoute.get(page.route);
      return imports !== undefined && all.has(page.entry) && (page.cluster === 'guides' || imports.has(page.entry));
    },
  });
  const pages = new Map<string, Page>();
  for (const [entry, { route }] of doc.byEntry) {
    pages.set(entry, { route, title: routePages.get(route)?.title ?? entry, kind: kindOf(route)! });
  }

  const related = new Map<string, string[]>();
  for (const [ep, page] of pages) {
    if (page.kind === 'Guide') continue;
    const extra = [...(importsByRoute.get(page.route) ?? [])].filter(
      e => e !== ep && !SCAFFOLDING.has(e) && !e.startsWith('i18n/') && pages.has(e)
    );
    if (extra.length > 0) related.set(page.route, extra.sort());
  }

  emitGenerated({
    file: OUT_FILE,
    content: serialize(deps, pages, related, routePages),
    command: 'gen:deps',
    written: `${deps.size} entry point(s), ${pages.size} with a page, ${related.size} page(s) with demo relations`,
  });
  const missing = eps.filter(e => !pages.has(e) && !e.startsWith('i18n/'));
  if (missing.length) console.log(`  no page found for: ${missing.join(' ')}`);
}

void main();
