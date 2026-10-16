/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes `projects/showcase/app/_core/generated/css-vars.ts` — the per-component
 * `--wr-*` hooks each reference page publishes, keyed by the page's route.
 *
 *   pnpm gen:css-vars          rewrite the file
 *   pnpm check:css-vars        fail if the committed file is stale
 *
 * Runs as a step of `build:showcase`, beside `gen:selectors` and `gen:quality`,
 * and the output is committed so a clean checkout type-checks before anything is
 * generated.
 *
 * Why the docs need it: the global token layer is catalogued across six
 * `/guides/tokens/*` pages and the ~380 component-scoped properties beside it
 * were catalogued nowhere, so restyling a component the sanctioned way meant
 * reading `node_modules/ngwr/<name>/styles/_index.scss` to find out what exists.
 * A consumer who cannot find a hook overrides the internal BEM class instead —
 * and those class names are published as stable, so the missing catalogue
 * converts straight into a maintenance obligation nobody agreed to take.
 *
 * The scan lives in `scripts/lib/build-css-var-map.ts`; read its header before
 * changing anything here. This file only decides which PAGE shows what, and
 * there is one rule: a page's directory name is its entry point's directory
 * name, at any depth below its cluster. `reference/components/button-group` and
 * `reference/components/form-field` name no entry point and get no section —
 * correctly, since neither `.wr-btn-group` nor `.wr-form-field` publishes a hook
 * of its own.
 *
 * A component whose page cannot be found is REPORTED rather than dropped
 * silently, and rather than thrown over: `check:api-docs` already fails on an
 * entry point with public members and no page, so a second gate saying the same
 * thing would only make one failure look like two.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { exit } from 'node:process';

import { buildCssVarMap, type WrCssVarEntry, type WrCssVarMap } from '../lib/build-css-var-map';
import { buildPageRoutes } from '../lib/page-routes';
import { ROOT_PATH } from '../lib/paths/root';

const OUT_DIR = resolve(ROOT_PATH, 'projects/showcase/app/_core/generated');
const OUT_FILE = join(OUT_DIR, 'css-vars.ts');

/**
 * Where a page for an entry point may live, most specific first.
 *
 * `keyboard` has both `reference/components/keyboard` and `guides/keyboard`, and
 * the component page is the one that documents the component — so the order is
 * the tie-break, and `guides/` is deliberately absent from the list: a guide is
 * prose about a topic, not the reference page for an entry point.
 */
const CLUSTERS = [
  'reference/components',
  'reference/services',
  'reference/directives',
  'reference/pipes',
] as const;

/** A page directory and the one route it is served at. */
interface Page {
  readonly dir: string;
  readonly route: string;
}

/**
 * `alert` → `reference/components/alert`, or `null` when no page documents it.
 *
 * The answer is a ROUTE, because `<ngwr-doc-page>` looks the section up by the
 * URL it is rendered at — and a page's directory stopped being its route when the
 * showcase moved pages into one folder per sidebar group:
 * `reference/components/feedback/alert/` serves `/reference/components/alert`.
 * So the page is found by its DIRECTORY NAME anywhere below a cluster, and the
 * route comes from the router's own tree (`buildPageRoutes`), never from the path.
 *
 * A nested entry point is looked for under its own cluster first — `bits/aurora`
 * under `bits/`, `charts/bar-chart` under `charts/` — and then under each of
 * {@link CLUSTERS} in order, which is where a flat one lives.
 *
 * This used to test `existsSync(cluster/name)`, and the grouping left it finding
 * nine pages where there were eighty: every grouped page fell out of the map, and
 * `check:css-vars` compared the committed copy against the same short output and
 * passed. A generator and its own gate agreeing is the one shape a generated
 * file cannot catch — the second time here, after `animations` became `bits`.
 */
function routeOf(entry: string, pages: ReadonlyMap<string, readonly Page[]>): string | null {
  const slash = entry.lastIndexOf('/');
  const name = entry.slice(slash + 1);
  const candidates = pages.get(name) ?? [];
  const own = slash === -1 ? [] : [entry.slice(0, entry.indexOf('/'))];
  for (const cluster of [...own, ...CLUSTERS]) {
    const hit = candidates.find(p => p.dir.startsWith(`${cluster}/`));
    if (hit) return hit.route;
  }
  return null;
}

/**
 * Every page directory served at exactly one route, grouped by directory name.
 * One directory behind several routes — the icon galleries, a cluster's catalog —
 * documents no single entry point.
 */
async function pagesByName(): Promise<Map<string, Page[]>> {
  const routes = await buildPageRoutes();
  if (routes.problems.length > 0) {
    console.error('\n✘ the route walk is short, so the map would be too:\n');
    for (const p of routes.problems) console.error(`    ${p}`);
    exit(1);
  }
  const byName = new Map<string, Page[]>();
  for (const [dir, forDir] of routes.byDirectory) {
    if (forDir.length !== 1) continue;
    const name = dir.slice(dir.lastIndexOf('/') + 1);
    const list = byName.get(name) ?? [];
    list.push({ dir, route: forDir[0] });
    byName.set(name, list);
  }
  return byName;
}

function rows(entry: WrCssVarEntry): string {
  return entry.vars
    .map(v => {
      const parts = [
        `name: ${JSON.stringify(v.name)}`,
        `default: ${JSON.stringify(v.value)}`,
        `scope: ${JSON.stringify(v.scope)}`,
      ];
      if (!v.base) parts.push('base: false');
      if (v.overrides > 0) parts.push(`overrides: ${v.overrides}`);
      return `      { ${parts.join(', ')} },`;
    })
    .join('\n');
}

function serialize(map: WrCssVarMap, byRoute: ReadonlyMap<string, WrCssVarEntry>): string {
  const blocks = [...byRoute]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, entry]) => {
      return `  ${JSON.stringify(route)}: {
    subpath: ${JSON.stringify(entry.subpath)},
    vars: [
${rows(entry)}
    ],
  },`;
    })
    .join('\n');

  return `/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/* eslint-disable */
/**
 * GENERATED by \`pnpm gen:css-vars\` from the library's stylesheets — do not edit.
 *
 * The \`--wr-*\` hooks each component publishes, keyed by the route of the page
 * that shows them. Rename a hook or retune a default in \`projects/lib\` and
 * re-run; this follows. The scan is \`scripts/lib/build-css-var-map.ts\`.
 *
 * ${map.total} hook(s) across ${byRoute.size} page(s). A property is here only when the
 * library READS it — a hook nothing reads is reported by the generator as a
 * finding rather than listed as a knob — and only when the component that
 * declares it also owns it: ${map.delegated} declaration(s) are one component setting
 * another's hook (\`--wr-icon-size\` inside its own \`<wr-icon>\`) and belong on
 * the owner's page, not on the setter's.
 */

import type { DocCssVarRow } from '#core/components';

/** One page's hooks, and the subpath whose stylesheet declares them. */
export interface DocCssVars {
  readonly subpath: string;
  readonly vars: readonly DocCssVarRow[];
}

/**
 * \`satisfies\` rather than a \`Record<string, …>\` annotation, deliberately: the
 * keys stay literal, which is what makes {@link DocCssVarRoute} a union of the
 * routes that really exist instead of \`string\`. The lookup is by a URL the
 * router hands over at runtime, so it is guarded rather than typed — but the
 * cast it needs can only name a route this file still carries.
 */
export const CSS_VARS = {
${blocks}
} satisfies Record<string, DocCssVars>;

/** Route keys, as a set the page shell can probe without widening the type above. */
export type DocCssVarRoute = keyof typeof CSS_VARS;
`;
}

/**
 * A page carrying its own copy of a table this run generates.
 *
 * `<ngwr-doc-page>` renders the CSS-variables section itself, from the map
 * below, so a hand-written `{ name: 'CSS — --wr-kbd-bg', … }` row is a second
 * table of the same thing a few hundred pixels higher up the page — and the
 * second one has nobody keeping it true. Three of the five rows on the Keyboard
 * page had drifted when this check was written, the worst documenting
 * `--wr-kbd-shadow` as `0 1px 0 rgba(dark, 0.12)`: not valid CSS in any reading,
 * and naming an intent v15 removed, on a page whose generated table states the
 * real value further down. Nothing caught it — `check:api-docs` filters these
 * rows out, because `CSS — --wr-kbd-bg` matches no library member.
 *
 * Keyed on the exact `CSS — ` prefix, which is the duplicated-table spelling.
 * A row that documents the IDEA of a token family rather than one component's
 * hooks — `density.ts`'s "CSS tokens", `testing.ts`'s "CSS-driven text: …" —
 * writes no em dash and is left alone.
 */
function duplicatedTables(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'generated') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts')) {
        const src = readFileSync(full, 'utf8');
        src.split('\n').forEach((line, i) => {
          // Two spellings, because the first sweep only caught one. `CSS — …`
          // is the prefixed form; a row naming the hook outright is the other,
          // and `burger` and `cascader` were carrying five and two of those.
          const hit = /name:\s*'CSS — /.test(line) || /name:\s*'--wr-[\w-]+'/.test(line);
          if (hit) out.push(`${relative(ROOT_PATH, full)}:${i + 1}`);
        });
      }
    }
  };
  // Only `reference/components`, `charts` and `bits`. The `/guides/tokens/*` pages
  // document the THEME layer — `--wr-text-*`, `--wr-duration-*`, the colour
  // ramp — which the generator does not catalogue, because it reads each
  // component's own `--wr-<name>-*` hooks. Those tables are the only record
  // of the token layer and must stay hand-written.
  walk(join(ROOT_PATH, 'projects/showcase/app/reference/components'));
  walk(join(ROOT_PATH, 'projects/showcase/app/charts'));
  walk(join(ROOT_PATH, 'projects/showcase/app/bits'));
  return out;
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const map = buildCssVarMap();
  const pages = await pagesByName();

  const byRoute = new Map<string, WrCssVarEntry>();
  const homeless: string[] = [];
  for (const entry of map.entries) {
    const route = routeOf(entry.entry, pages);
    if (route) byRoute.set(route, entry);
    else homeless.push(`${entry.subpath} (${entry.vars.length} hook(s))`);
  }

  const next = serialize(map, byRoute);
  const path = relative(ROOT_PATH, OUT_FILE);

  const duplicated = duplicatedTables();
  if (duplicated.length > 0) {
    console.error(`\n✘ ${duplicated.length} hand-written \`CSS — …\` row(s) duplicating the generated section:\n`);
    for (const where of duplicated) console.error(`    ${where}`);
    console.error('\n  Delete them. The section `<ngwr-doc-page>` renders is the single source — a');
    console.error('  hook that needs prose belongs in the stylesheet comment the generator reads.\n');
    process.exit(1);
  }

  if (check) {
    const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== next) {
      console.error(`\n✘ ${path} is out of date with projects/lib. Run \`pnpm gen:css-vars\` and commit the result.\n`);
      process.exit(1);
    }
    console.log(`✓ ${path} — ${map.total} hook(s) across ${byRoute.size} page(s), up to date`);
  } else {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, next);
    console.log(`✓ ${path} — ${map.total} hook(s) across ${byRoute.size} page(s)`);
  }

  console.log(
    `  ${map.entries.length} entry point(s) publish one; ${map.delegated} declaration(s) filed under the hook's owner.`
  );

  if (homeless.length > 0) {
    console.log(`  No reference page to show them on: ${homeless.join(', ')}`);
  }

  if (map.orphans.length > 0) {
    // Printed in full rather than counted, for the reason `check:tokens` gives
    // about the theme layer: a hook nothing reads is not automatically a bug —
    // `--wr-density-text` is published for consumers to read in their own
    // `calc()`, which is exactly the case that has to stay visible instead of
    // being tidied into a number.
    console.log(`  Declared and never read (not listed, ${map.orphans.length}):`);
    for (const { name, where } of map.orphans) console.log(`    ${name}  ${where}`);
  }
}

await main();
