/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The other half of the a11y gate: the rules that need painted pixels.
 *
 * `check:a11y` runs axe over the prerendered HTML in JSDOM, which has no
 * stylesheets and no layout — so it turns `color-contrast` and `target-size`
 * OFF rather than report noise. Those two are exactly the rules that found the
 * systematic light-theme failure the `--wr-color-*-ink` ramp fixed, and nothing
 * has guarded them since. This script is that guard: a real Chromium, real CSS,
 * both themes.
 *
 * Why it is a separate script and not a flag on `check:a11y`: it needs a
 * browser and an HTTP server, it takes minutes rather than seconds, and it
 * fails for a different KIND of reason. Keeping them apart means the cheap
 * structural gate stays cheap.
 *
 * Both themes, every run. The two are separate colour systems — the `-ink` ramp
 * is a `color-mix` toward `--wr-color-gray-6`, which is itself a `light-dark()`
 * pair — so a token that passes in one can fail in the other, and checking only
 * one would hide half the surface.
 *
 * PLACEHOLDERS ARE MEASURED BY A SWAP, because axe never measures them. It
 * reads an empty field's `color`, which is the TYPED text, so an input whose
 * placeholder painted 2.91:1 was reported as passing at 17.85:1 — and two of
 * the library's placeholder hooks sat at that 2.91 under a green nightly. After
 * the painted run, every field showing its placeholder gets its `::placeholder`
 * colour copied onto `color` and axe runs `color-contrast` over those fields
 * alone, so the ratio printed is still axe's own. A failure is reported as
 * `placeholder-contrast (theme, mode)` and held to the baseline like any other
 * rule, with no allowance: none was needed when it landed. What it cannot see:
 * a placeholder drawn as generated content rather than `::placeholder`, and
 * one inside an overlay, which does not exist on a page at rest — both are held
 * to the placeholder token at the source by `theme/styles.spec.ts` instead. axe
 * exempts a disabled field here as it does anywhere; a readonly one is
 * measured, because it is not inactive. And the pass has to show it measured
 * something, since one that measured nothing prints the same green line: an
 * empty `::placeholder` read, a read equal to the typed colour on every field,
 * or a full sweep under `PLACEHOLDER_ROUTE_FLOOR` routes fails the run, and the
 * count per theme and mode is printed either way.
 *
 * Usage:
 *   pnpm check:contrast                    # after build:showcase
 *   pnpm check:contrast --theme=dark       # one theme
 *   pnpm check:contrast --routes=20        # a sample, for a quick local pass
 *   pnpm check:contrast --filter=alert     # only routes containing a substring
 *   pnpm check:contrast --verbose          # list every failing node
 */

import { exit } from 'node:process';

import type { Page } from 'playwright';

import { narrow, parseFlags, pickOne } from '../lib/args';
import {
  describeAxeNode,
  isFailingImpact,
  recordViolation,
  runAxe,
  type Finding,
  type RecordOptions,
} from '../lib/axe';
import { readBaseline } from '../lib/baselines';
import { newPinnedContext } from '../lib/browser-context';
import { openInScheme, prerenderedRoutes, withDistBrowser } from '../lib/dist-site';
import { err } from '../lib/log/err';
import { info } from '../lib/log/info';

/** The rules JSDOM cannot answer. This script exists for exactly these. */
const PAINTED_RULES = ['color-contrast', 'target-size'] as const;

/** The name a placeholder failure is reported and baselined under — see the header. */
const PLACEHOLDER_RULE = 'placeholder-contrast';

/** Marks the fields a placeholder pass measures, so axe can be scoped to them. */
const PLACEHOLDER_PROBE = 'data-wr-placeholder-probe';

/**
 * Routes showing a placeholder at rest, per theme and contrast mode, below which
 * a FULL sweep fails — set at the count when the probe landed, with no slack.
 *
 * A probe that measures nothing prints the same green line as one that measured
 * everything and found it fine. Its query can stop matching, the demos that
 * show a placeholder at rest can go, or a Chromium can stop answering for the
 * pseudo-element: `getComputedStyle(el, '::nonsense').color` is `""`, and
 * copying that onto `color` REMOVES the override, so the field is measured in
 * its typed colour at 17.85:1 and passes. The empty read and the typed-colour
 * read fail on their own, on any sweep; this catches the rest. Raise it when a
 * demo adds a field; a drop is a gate going blind.
 */
const PLACEHOLDER_ROUTE_FLOOR = 27;

/** What the placeholder pass measured, per theme and contrast mode. */
interface PlaceholderTally {
  fields: number;
  readonly routes: Set<string>;
  /** Fields whose `::placeholder` read came back empty — nothing was measured. */
  unreadable: number;
  /** Fields whose `::placeholder` read equals their typed colour. */
  indistinct: number;
}

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/**
 * The second axis: what the reader asked the OS for.
 *
 * `more` is a real emulation, not a class the page opts into — Playwright sets
 * it on the context and Chromium recomputes styles against it, so the theme
 * layer's `@media (prefers-contrast: more)` block is what gets measured. That
 * block exists precisely because the defaults miss two bars on purpose (AAA on
 * muted text, 3:1 on the hairline), each for a reason recorded at the token.
 * Measuring only the default sweep would leave the whole high-contrast path a
 * claim nobody checks — which is the thing this repo keeps finding.
 */
const CONTRAST_MODES = ['no-preference', 'more'] as const;
type ContrastMode = (typeof CONTRAST_MODES)[number];

/** Two nodes from each violation, eight per rule, each with axe's own measurement. */
const NODES: RecordOptions = {
  perViolation: 2,
  max: 8,
  format: (node, route) => `${route} — ${node.html.slice(0, 100)}${describeAxeNode(node, 'bracketed')}`,
};

type Baseline = Record<string, { readonly routes: number; readonly note: string }>;

async function audit(
  page: Page,
  origin: string,
  route: string,
  theme: Theme,
  mode: ContrastMode,
  into: Map<string, Finding>,
  tally: PlaceholderTally
): Promise<void> {
  // One load per route: the context's `colorScheme` is the whole switch, so
  // there is no storage to seed and nothing to reload. What the emulation
  // cannot promise is that the page obeyed it, and that is the probe's job.
  await openInScheme(page, origin, route, theme, {
    label: 'contrast',
    reason: 'refusing to report a theme that was never painted',
  });

  const results = await runAxe(page, null, {
    resultTypes: ['violations'],
    // Only these two. Everything structural is `check:a11y`'s job, and
    // reporting it twice would make one fix look like two regressions.
    runOnly: { type: 'rule', values: [...PAINTED_RULES] },
  });

  for (const violation of results.violations) {
    recordViolation(into, `${violation.id} (${theme}, ${mode})`, violation, route, NODES);
  }

  // The placeholder pass, after the painted one on purpose: it repaints fields,
  // and the run above has to see the page as it ships. `:placeholder-shown` is
  // exactly "the placeholder is what is drawn", so a field holding a value is
  // left alone.
  const probed = await page.evaluate(attr => {
    let count = 0;
    let unreadable = 0;
    let indistinct = 0;
    for (const field of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
      if (!field.matches(':placeholder-shown')) continue;
      const colour = getComputedStyle(field, '::placeholder').color;
      if (!colour) {
        unreadable++;
        continue;
      }
      if (colour === getComputedStyle(field).color) indistinct++;
      field.style.setProperty('color', colour, 'important');
      field.setAttribute(attr, '');
      count++;
    }
    return { count, unreadable, indistinct };
  }, PLACEHOLDER_PROBE);
  tally.fields += probed.count;
  tally.unreadable += probed.unreadable;
  tally.indistinct += probed.indistinct;
  if (probed.count === 0) return;
  tally.routes.add(route);

  const placeholders = await runAxe(
    page,
    { include: [`[${PLACEHOLDER_PROBE}]`] },
    { resultTypes: ['violations'], runOnly: { type: 'rule', values: ['color-contrast'] } }
  );

  for (const violation of placeholders.violations) {
    recordViolation(into, `${PLACEHOLDER_RULE} (${theme}, ${mode})`, violation, route, {
      ...NODES,
      prefix: 'A placeholder, painted as the field text',
    });
  }
}

async function main(): Promise<void> {
  const { verbose, theme, contrast, routes, filter } = parseFlags(
    'check:contrast [--verbose] [--theme=<light|dark>] [--contrast=<no-preference|more>] [--routes=<n>] [--filter=<substring>]',
    {
      verbose: { type: 'boolean', default: false },
      theme: { type: 'string' },
      contrast: { type: 'string' },
      routes: { type: 'number', default: 0 },
      filter: { type: 'string', default: '' },
    }
  );

  const themes = pickOne(THEMES, theme, 'contrast', 'theme');
  const modes = pickOne(CONTRAST_MODES, contrast, 'contrast', 'contrast mode');

  const everything = prerenderedRoutes('contrast');
  const { targets } = narrow(everything, { filter, limit: routes, label: 'contrast', noun: 'route' });

  const findings = new Map<string, Finding>();
  const placeholders = new Map<string, PlaceholderTally>();

  await withDistBrowser('spa', async ({ browser, origin }) => {
    // One context per theme, and `colorScheme` set on it, which is the entire
    // theme switch: `:root` declares `color-scheme: light dark`, so every token
    // resolves to the emulated side from the first paint and there is no flash
    // to capture as a violation.
    for (const theme of themes) for (const mode of modes) {
      // Reduced motion, which every pinned context gets, is what makes the pass
      // deterministic. Every animation component short-circuits to its final
      // state under it, so nothing is ever measured mid-flight — a
      // `wr-blur-text` piece caught at `opacity: 0; filter: blur(10px)` reports
      // a contrast failure that describes a frame, not a design.
      //
      // The clock is pinned for the reason `check:state-a11y` pins it: the
      // event-calendar demo builds its events relative to `new Date()`, so how
      // many chips a month cell holds — and therefore whether they trip
      // `target-size` at all — changes from one day to the next. This gate
      // counts ROUTES, so that surfaced as the count sliding between 1 and 2 on
      // its own, which is worse than a failure: it means the allowance can only
      // ever be set to the loosest day, and on every other day it hides a real
      // regression behind the slack. The date-picker and calendar demos drift
      // the same way.
      const context = await newPinnedContext(browser, { colorScheme: theme, contrast: mode, pinClock: true });
      const page = await context.newPage();

      info(`  ${theme} / contrast ${mode}: ${targets.length} routes`);
      const tally: PlaceholderTally = { fields: 0, routes: new Set(), unreadable: 0, indistinct: 0 };
      placeholders.set(`${theme} / contrast ${mode}`, tally);
      for (const route of targets) await audit(page, origin, route, theme, mode, findings, tally);

      await context.close();
    }
  });

  const baseline = readBaseline<Baseline>('contrast');
  const failures: string[] = [];

  for (const finding of [...findings.values()].sort((a, b) => b.routes.size - a.routes.size)) {
    const allowed = baseline[finding.rule]?.routes ?? 0;
    const count = finding.routes.size;
    const failing = isFailingImpact(finding.impact);
    const over = count > allowed;

    const line = `${finding.rule} — ${count} route(s), impact ${finding.impact ?? 'n/a'}`;
    if (failing && over) {
      failures.push(line);
      err(`  ✘ ${line}${allowed > 0 ? ` (baselined at ${allowed})` : ''}`);
      err(`      ${finding.help} — ${finding.helpUrl}`);

      // The route list, not just sample nodes. A rule that spans several pages
      // used to report only the nodes it happened to sample first, which meant
      // a count of 11 with every example drawn from one page — a number you
      // cannot act on.
      const routes = [...finding.routes].sort();
      const shown = verbose ? routes : routes.slice(0, 12);
      err(`      routes: ${shown.join(', ')}${routes.length > shown.length ? `, +${routes.length - shown.length} more` : ''}`);
      for (const node of verbose ? finding.nodes : finding.nodes.slice(0, 2)) err(`      ${node}`);
    } else {
      info(`  · ${line}${allowed > 0 ? ` (within baseline ${allowed})` : ''}`);
      // Under --verbose, show the baselined ones too: they are the debt, and
      // reading them is how it gets paid down rather than forgotten.
      if (verbose) {
        info(`      routes: ${[...finding.routes].sort().join(', ')}`);
        for (const node of finding.nodes) info(`      ${node}`);
      }
    }
  }

  // Only a FULL sweep may claim a baselined rule is gone. A filtered or
  // truncated run has simply not looked at the routes it lives on, and telling
  // someone to delete a baseline entry on that evidence is worse than silence.
  // Compare against EVERY route, not the filtered list — that one is already
  // narrowed, so measuring against it would call any filtered run complete.
  const complete =
    targets.length === everything.length && themes.length === THEMES.length && modes.length === CONTRAST_MODES.length;
  if (complete) {
    for (const [rule, entry] of Object.entries(baseline)) {
      const finding = findings.get(rule);
      if (!finding) {
        info(`  ✓ ${rule} no longer appears — drop it from the baseline (${entry.note})`);
        continue;
      }
      // A rule that SHRANK is the quieter half of the same problem, and it is
      // the dangerous one: an allowance of 4 against a reality of 2 absorbs two
      // brand-new failing routes in silence, and the run still prints green.
      // Four entries had drifted that way by 2026-10-06. Reported rather than
      // failed, because the note has to be rewritten by hand — a count on its
      // own says nothing about which routes are left or why.
      if (finding.routes.size < entry.routes) {
        info(`  ✓ ${rule} is down to ${finding.routes.size} from ${entry.routes} — tighten the baseline, or the slack hides the next ${entry.routes - finding.routes.size}`);
        info(`      routes: ${[...finding.routes].sort().join(', ')}`);
      }
    }
  }

  // The placeholder pass has to prove it measured something: see
  // PLACEHOLDER_ROUTE_FLOOR for the three ways it can go blind and still print
  // a green line.
  const blind: string[] = [];
  for (const [pass, tally] of placeholders) {
    info(`  · placeholders measured, ${pass}: ${tally.fields} field(s) on ${tally.routes.size} route(s)`);
    if (tally.unreadable > 0) blind.push(`${pass}: ${tally.unreadable} field(s) whose \`::placeholder\` colour read back empty`);
    if (tally.fields > 0 && tally.indistinct === tally.fields) {
      blind.push(`${pass}: every \`::placeholder\` read equals the typed colour — the read is not reaching the pseudo-element`);
    }
    if (complete && tally.routes.size < PLACEHOLDER_ROUTE_FLOOR) {
      blind.push(`${pass}: placeholders measured on ${tally.routes.size} route(s), floor ${PLACEHOLDER_ROUTE_FLOOR}`);
    }
  }
  for (const line of blind) err(`  ✘ placeholder probe — ${line}`);

  if (failures.length > 0 || blind.length > 0) {
    const parts = [
      failures.length > 0 && `${failures.length} contrast/placeholder/target-size rule(s) over baseline`,
      blind.length > 0 && 'a placeholder pass that cannot show it measured anything',
    ].filter(Boolean);
    err(`\n✘ ${parts.join(', and ')}.\n`);
    exit(1);
  }

  // Both axes are named, and a partial run says so. A summary that reports
  // only the routes and the themes reads as a full sweep even when it looked
  // at one contrast mode out of two.
  const partial = complete ? '' : ' — a PARTIAL sweep';
  const scope = `${targets.length} route(s) × ${themes.length} theme(s) × ${modes.length} contrast mode(s)${partial}`;
  info(`\n✓ No new contrast, placeholder or target-size violations (${scope}).`);
}

await main();
