/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Runs axe-core over the prerendered showcase and fails on real violations.
 *
 * Why this is cheap here: `build:showcase` already renders every route to
 * static HTML under `outputMode: 'static'`, so there is nothing to orchestrate —
 * no dev server, no browser, no navigation. Every component's demo page is
 * already sitting on disk as markup, which is exactly what axe wants.
 *
 * What it can and cannot see: the pages are analysed without their stylesheets,
 * so anything that depends on computed style is meaningless here. Those rules
 * (`color-contrast` and friends) are disabled explicitly rather than left to
 * report noise. What remains is the structural half of a11y — accessible names,
 * ARIA validity, roles, references to ids that must exist, landmark and heading
 * structure — and that is precisely the class the 2026-08-07 audit found by
 * hand: an unnamed speed-dial trigger, icon-only segmented options, a dialog
 * promising `aria-modal` it did not honour.
 *
 * A violation is reported once per rule with every route it appears on, because
 * a single missing label in a shared component otherwise shows up as 188
 * identical failures.
 *
 * Usage:
 *   pnpm check:a11y                 # after build:showcase
 *   pnpm check:a11y --impact=all    # include minor/moderate
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';

import type { AxeResults, ImpactValue, Result } from 'axe-core';
import { JSDOM } from 'jsdom';

import { ROOT_PATH } from './lib/paths/root';

const DIST = resolve(ROOT_PATH, 'dist/showcase');

/**
 * axe captures `window` / `document` when its module is evaluated, so importing
 * it into Node and then pointing `globalThis` at a JSDOM window does not work —
 * it throws "Required window or document globals not defined". The supported
 * shape is to evaluate axe's source INSIDE the JSDOM, which is what this reads.
 */
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core'), 'utf8');

/**
 * Rules that need real layout or painted pixels. Without stylesheets they either
 * cannot run or produce results that mean nothing, so they are off by default —
 * a screenshot-diff pass (roadmap A5) is the right tool for that half.
 */
const STYLE_DEPENDENT_RULES = [
  'color-contrast',
  'color-contrast-enhanced',
  'target-size',
  'scrollable-region-focusable',
];

/** Fail the build on these. `minor` / `moderate` are reported but do not fail. */
const FAILING_IMPACTS: readonly ImpactValue[] = ['serious', 'critical'];

/**
 * Known violations, recorded so the gate can be switched on before they are all
 * fixed. A baselined rule fails only if it spreads to MORE routes than recorded —
 * so the debt cannot grow, and every fix should shrink a number here or delete a
 * line. A rule that stops appearing entirely is reported as ready to remove.
 *
 * It is currently `{}`: the ten rules it was seeded with have all been fixed, so
 * any serious or critical violation now fails the build outright. Add an entry
 * back only to land a gate ahead of a fix, never to silence one.
 */
const BASELINE_PATH = resolve(ROOT_PATH, 'scripts/a11y-baseline.json');
type Baseline = Record<string, { readonly routes: number; readonly note: string }>;

function readBaseline(): Baseline {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  } catch {
    return {};
  }
}

interface Finding {
  readonly rule: string;
  readonly impact: ImpactValue | null | undefined;
  readonly help: string;
  readonly helpUrl: string;
  readonly routes: Set<string>;
  readonly sample: string;
}

function htmlFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      htmlFiles(full, acc);
    } else if (entry.endsWith('.html')) {
      acc.push(full);
    }
  }
  return acc;
}

async function analyse(file: string, findings: Map<string, Finding>): Promise<void> {
  // `dist/showcase/index.html` relativises to `index.html`, which the regex
  // strips to an empty string — so the root route comes out as `/` naturally.
  const route = `/${relative(DIST, file).replace(/(^|\/)index\.html$/, '')}`;

  // `outside-only` lets us inject axe via `window.eval` without running the
  // page's own Angular bundles — the prerendered markup is what we want to
  // analyse, not whatever the app would do after hydration.
  const html = readFileSync(file, 'utf8');

  // The builder emits a `<meta http-equiv="refresh">` stub for every redirect
  // route. No user ever reads one — the browser leaves before paint — so auditing
  // them only reports the stub's own bare `<html>` 22 times.
  if (/<meta\s+http-equiv="refresh"/i.test(html)) return;

  // A window per page, deliberately. Reusing one window and swapping its
  // document is the obvious optimisation — it also degrades into an effective
  // hang somewhere past the first few dozen pages, whether or not `axe.teardown()`
  // runs between them. 211 short-lived windows finish in well under a minute.
  const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;

  try {
    window.eval(AXE_SOURCE);

    const options = {
      resultTypes: ['violations'],
      rules: Object.fromEntries(STYLE_DEPENDENT_RULES.map(id => [id, { enabled: false }])),
    };
    const runner = (window as unknown as { axe: { run: (ctx: unknown, o: unknown) => Promise<AxeResults> } }).axe;
    const results = await runner.run(window.document, options);

    for (const v of results.violations as Result[]) {
      const existing = findings.get(v.id);
      if (existing) {
        existing.routes.add(route);
        continue;
      }
      findings.set(v.id, {
        rule: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        routes: new Set([route]),
        sample: (v.nodes[0]?.html ?? '').trim().slice(0, 160),
      });
    }
  } finally {
    window.close();
  }
}

async function main(): Promise<void> {
  const includeAll = process.argv.includes('--impact=all');

  let files: string[];
  try {
    files = htmlFiles(DIST);
  } catch {
    console.error(`✘ ${relative(ROOT_PATH, DIST)} not found — run \`pnpm build:showcase\` first.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`✘ No HTML under ${relative(ROOT_PATH, DIST)} — nothing to check.`);
    process.exit(1);
  }

  const findings = new Map<string, Finding>();
  for (const file of files) {
    await analyse(file, findings);
  }

  const baseline = readBaseline();
  const all = [...findings.values()].sort((a, b) => b.routes.size - a.routes.size);
  const failable = all.filter(f => f.impact && FAILING_IMPACTS.includes(f.impact));

  // New rule, or a known one that spread further than recorded.
  const regressions = failable.filter(f => {
    const known = baseline[f.rule];
    return !known || f.routes.size > known.routes;
  });
  const held = failable.filter(f => !regressions.includes(f));
  const fixed = Object.keys(baseline).filter(rule => !findings.has(rule));

  console.log(`axe-core over ${files.length} prerendered pages\n`);

  const report = includeAll ? all : regressions;
  for (const f of report) {
    const known = baseline[f.rule];
    const where = f.routes.size === 1 ? [...f.routes][0] : `${f.routes.size} routes, e.g. ${[...f.routes][0]}`;
    const grew = known ? `  (baseline ${known.routes} → ${f.routes.size})` : '';
    console.log(`  [${f.impact ?? 'unknown'}] ${f.rule} — ${f.help}${grew}`);
    console.log(`      ${where}`);
    if (f.sample) console.log(`      ${f.sample}`);
    console.log(`      ${f.helpUrl}\n`);
  }

  if (held.length > 0) {
    console.log(`  ${held.length} known violation(s) held at baseline: ${held.map(f => f.rule).join(', ')}`);
  }
  if (fixed.length > 0) {
    console.log(`  ✓ fixed since baseline — drop from ${relative(ROOT_PATH, BASELINE_PATH)}: ${fixed.join(', ')}`);
  }

  if (regressions.length > 0) {
    console.error(`\n✘ ${regressions.length} new or widened serious/critical violation(s).`);
    process.exit(1);
  }
  console.log('\n✓ No new accessibility violations.');
  process.exit(0);
}

/**
 * Runs the scan in a child process and retries once if that child is killed by a
 * signal rather than exiting.
 *
 * 211 JSDOM windows, each compiling axe into its own V8 context, will very
 * occasionally take the process down with SIGSEGV — roughly one run in six here.
 * A crash carries no verdict, so treating it as a failure means a red build with
 * no rule to point at; treating it as a pass would be worse. Only a signal death
 * retries: a clean non-zero exit is a real violation and is forwarded as-is.
 */
function supervise(): void {
  const args = [...process.execArgv, ...process.argv.slice(1)];
  const env = { ...process.env, WR_A11Y_CHILD: '1' };

  for (let attempt = 1; attempt <= 2; attempt++) {
    const child = spawnSync(process.execPath, args, { stdio: 'inherit', env });
    if (child.signal === null) process.exit(child.status ?? 1);
    console.error(`\n⚠ axe run died on ${child.signal}${attempt === 1 ? ' — retrying once' : ''}.`);
  }
  process.exit(1);
}

if (process.env['WR_A11Y_CHILD']) {
  void main();
} else {
  supervise();
}
