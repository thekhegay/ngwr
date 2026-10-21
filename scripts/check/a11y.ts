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
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { JSDOM } from 'jsdom';

import { parseFlags } from '../lib/args';
import { AXE_SOURCE, isFailingImpact, recordViolation, ruleToggles, type AxeWindow, type Finding } from '../lib/axe';
import { baselinePath, readBaseline } from '../lib/baselines';
import { DIST_SHOWCASE as DIST, prerenderedPages, type PrerenderedPage } from '../lib/dist-site';
import { ROOT_PATH } from '../lib/paths/root';

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
type Baseline = Record<string, { readonly routes: number; readonly note: string }>;

async function analyse({ route, file }: PrerenderedPage, findings: Map<string, Finding>): Promise<void> {
  // `outside-only` lets us inject axe via `window.eval` without running the
  // page's own Angular bundles — the prerendered markup is what we want to
  // analyse, not whatever the app would do after hydration.
  const html = readFileSync(file, 'utf8');

  // A window per page, deliberately. Reusing one window and swapping its
  // document is the obvious optimisation — it also degrades into an effective
  // hang somewhere past the first few dozen pages, whether or not `axe.teardown()`
  // runs between them. Short-lived windows get through the whole site in well
  // under a minute.
  const dom = new JSDOM(html, { pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;

  try {
    window.eval(AXE_SOURCE);

    const options = {
      resultTypes: ['violations'],
      rules: ruleToggles(STYLE_DEPENDENT_RULES),
    };
    const runner = (window as unknown as AxeWindow).axe;
    const results = await runner.run(window.document, options);

    for (const v of results.violations) {
      recordViolation(findings, v.id, v, route, { firstOnly: true, format: node => node.html.trim().slice(0, 160) });
    }
  } finally {
    window.close();
  }
}

async function main(): Promise<void> {
  const { impact } = parseFlags('check:a11y [--impact=all]', { impact: { type: 'string' } });
  const includeAll = impact === 'all';

  const pages = prerenderedPages('a11y');
  if (pages.length === 0) {
    console.error(`✘ No HTML under ${relative(ROOT_PATH, DIST)} — nothing to check.`);
    process.exit(1);
  }

  // The builder emits a `<meta http-equiv="refresh">` stub for every redirect
  // route. No user ever reads one — the browser leaves before paint — so auditing
  // them only reports the stub's own bare `<html>` 22 times.
  const findings = new Map<string, Finding>();
  for (const page of pages) {
    if (page.redirectTo === null) await analyse(page, findings);
  }

  const baseline = readBaseline<Baseline>('a11y');
  const all = [...findings.values()].sort((a, b) => b.routes.size - a.routes.size);
  const failable = all.filter(f => isFailingImpact(f.impact));

  // New rule, or a known one that spread further than recorded.
  const regressions = failable.filter(f => {
    const known = baseline[f.rule];
    return !known || f.routes.size > known.routes;
  });
  const held = failable.filter(f => !regressions.includes(f));
  const fixed = Object.keys(baseline).filter(rule => !findings.has(rule));

  console.log(`axe-core over ${pages.length} prerendered pages\n`);

  const report = includeAll ? all : regressions;
  for (const f of report) {
    const known = baseline[f.rule];
    const where = f.routes.size === 1 ? [...f.routes][0] : `${f.routes.size} routes, e.g. ${[...f.routes][0]}`;
    const grew = known ? `  (baseline ${known.routes} → ${f.routes.size})` : '';
    console.log(`  [${f.impact ?? 'unknown'}] ${f.rule} — ${f.help}${grew}`);
    console.log(`      ${where}`);
    if (f.nodes[0]) console.log(`      ${f.nodes[0]}`);
    console.log(`      ${f.helpUrl}\n`);
  }

  if (held.length > 0) {
    console.log(`  ${held.length} known violation(s) held at baseline: ${held.map(f => f.rule).join(', ')}`);
  }
  if (fixed.length > 0) {
    console.log(
      `  ✓ fixed since baseline — drop from ${relative(ROOT_PATH, baselinePath('a11y'))}: ${fixed.join(', ')}`
    );
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
 * A JSDOM window per page, each compiling axe into its own V8 context, will very
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
