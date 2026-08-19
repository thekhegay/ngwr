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
 * is a `color-mix` toward `--wr-color-dark`, which itself flips per theme — so a
 * token that passes in one can fail in the other, and only checking the default
 * would hide half the surface.
 *
 * Usage:
 *   pnpm check:contrast                    # after build:showcase
 *   pnpm check:contrast --theme=dark       # one theme
 *   pnpm check:contrast --routes=20        # a sample, for a quick local pass
 *   pnpm check:contrast --filter=alert     # only routes containing a substring
 *   pnpm check:contrast --verbose          # list every failing node
 */

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { exit } from 'node:process';

import type { AxeResults, ImpactValue } from 'axe-core';
import { chromium, type Browser, type Page } from 'playwright';

import { err } from './lib/log/err';
import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';

const DIST = resolve(ROOT_PATH, 'dist/showcase');
const ROUTES_JSON = join(DIST, 'prerendered-routes.json');
const BASELINE_PATH = resolve(ROOT_PATH, 'scripts/contrast-baseline.json');

/** The rules JSDOM cannot answer. This script exists for exactly these. */
const PAINTED_RULES = ['color-contrast', 'target-size'] as const;

/** Fail on these. `minor` / `moderate` are reported but do not fail. */
const FAILING_IMPACTS: readonly ImpactValue[] = ['serious', 'critical'];

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/**
 * axe is evaluated inside the page rather than imported here — same reason as
 * `check-a11y.ts`: it binds `window` / `document` at module evaluation time.
 */
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core'), 'utf8');

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

/**
 * The pages carry `<base href="/">`, so `file://` cannot resolve a single
 * stylesheet — without a server every page would be analysed unstyled, which is
 * the very thing this script exists to avoid. Hence ~40 lines of static server
 * rather than a dependency.
 */
function serve(): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = join(DIST, decodeURIComponent(url.pathname));

    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    // The showcase is a SPA behind a static host; anything unresolved is a
    // client route, and its prerendered twin is the directory index.
    if (!existsSync(file)) file = join(DIST, 'index.html');

    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  return new Promise(done => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      done({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

interface Finding {
  readonly rule: string;
  readonly impact: ImpactValue | null | undefined;
  readonly help: string;
  readonly helpUrl: string;
  readonly routes: Set<string>;
  readonly nodes: string[];
}

/**
 * axe already measured the colours and the ratio it objected to — printing its
 * own numbers beats re-deriving them, and re-deriving is where a `color-mix`
 * result in `color(srgb …)` form quietly turns into nonsense.
 */
function describe(node: { any?: readonly { data?: unknown }[] }): string {
  const data = node.any?.find(c => c.data && typeof c.data === 'object')?.data as
    | { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string; fontSize?: string; fontWeight?: string }
    | undefined;
  if (!data?.contrastRatio) return '';
  return ` [${data.contrastRatio}:1, wants ${data.expectedContrastRatio ?? '?'}, ${data.fgColor ?? '?'} on ${data.bgColor ?? '?'}, ${data.fontSize ?? ''} ${data.fontWeight ?? ''}]`;
}

type Baseline = Record<string, { readonly routes: number; readonly note: string }>;

const readBaseline = (): Baseline => {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  } catch {
    return {};
  }
};

/** Every canonical route, redirect stubs dropped. */
function routes(): string[] {
  if (!existsSync(ROUTES_JSON)) {
    err(`\n✘ contrast: ${ROUTES_JSON} not found. Run build:showcase first.\n`);
    exit(1);
  }

  const all = Object.keys(
    (JSON.parse(readFileSync(ROUTES_JSON, 'utf8')) as { routes?: Record<string, unknown> }).routes ?? {}
  );

  return all
    .filter(route => {
      const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html');
      // A redirect stub is a meta-refresh page the user never sees painted.
      return existsSync(file) && !readFileSync(file, 'utf8').includes('http-equiv="refresh"');
    })
    .sort();
}

async function audit(page: Page, origin: string, route: string, theme: Theme, into: Map<string, Finding>): Promise<void> {
  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });

  // The app's own theme service decides `data-theme` from storage, so seeding
  // it is what makes the pass deterministic — `emulateMedia` alone only steers
  // the `auto` mode, and a persisted choice would override it.
  await page.evaluate(t => localStorage.setItem('wr-theme', t), theme);
  await page.reload({ waitUntil: 'networkidle' });

  const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (applied !== theme) {
    err(`\n✘ contrast: ${route} came up as "${applied ?? 'unset'}" with "${theme}" requested — refusing to report a theme that was never painted.\n`);
    exit(1);
  }

  await page.addScriptTag({ content: AXE_SOURCE });
  const results = (await page.evaluate(async (enabled: readonly string[]) => {
    const runner = (window as unknown as { axe: { run: (o: unknown) => Promise<AxeResults> } }).axe;
    return runner.run({
      resultTypes: ['violations'],
      // Only these two. Everything structural is `check:a11y`'s job, and
      // reporting it twice would make one fix look like two regressions.
      runOnly: { type: 'rule', values: [...enabled] },
    });
  }, PAINTED_RULES)) as AxeResults;

  for (const violation of results.violations) {
    const key = `${violation.id} (${theme})`;
    const found = into.get(key) ?? {
      rule: key,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      routes: new Set<string>(),
      nodes: [],
    };
    found.routes.add(route);
    for (const node of violation.nodes.slice(0, 2)) {
      if (found.nodes.length < 8) found.nodes.push(`${route} — ${node.html.slice(0, 100)}${describe(node)}`);
    }
    into.set(key, found);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const only = args.find(a => a.startsWith('--theme='))?.split('=')[1] as Theme | undefined;
  const limit = Number(args.find(a => a.startsWith('--routes='))?.split('=')[1] ?? 0);
  const filter = args.find(a => a.startsWith('--filter='))?.split('=')[1] ?? '';

  const themes = only ? THEMES.filter(t => t === only) : THEMES;
  if (only && themes.length === 0) {
    err(`\n✘ contrast: unknown theme "${only}". Use light or dark.\n`);
    exit(1);
  }

  const everything = routes();
  const all = everything.filter(route => route.includes(filter));
  if (all.length === 0) {
    err(`\n✘ contrast: no route matches "${filter}".\n`);
    exit(1);
  }
  const targets = limit > 0 ? all.slice(0, limit) : all;

  const { server, origin } = await serve();
  let browser: Browser | null = null;
  const findings = new Map<string, Finding>();

  try {
    browser = await chromium.launch();
    // One context per theme, and `colorScheme` set on it: a page that renders
    // before the seeded storage is read still starts from the right side, so a
    // first-paint flash cannot be captured as a violation.
    for (const theme of themes) {
      // `reducedMotion` is what makes the pass deterministic. Every animation
      // component short-circuits to its final state under it, so nothing is
      // ever measured mid-flight — a `wr-blur-text` piece caught at
      // `opacity: 0; filter: blur(10px)` reports a contrast failure that
      // describes a frame, not a design.
      const context = await browser.newContext({
        colorScheme: theme,
        reducedMotion: 'reduce',
        viewport: { width: 1280, height: 900 },
      });

      // Pin the clock, for the reason `check:state-a11y` pins it: the
      // event-calendar demo builds its events relative to `new Date()`, so how
      // many chips a month cell holds — and therefore whether they trip
      // `target-size` at all — changes from one day to the next. This gate
      // counts ROUTES, so that surfaced as the count sliding between 1 and 2 on
      // its own, which is worse than a failure: it means the allowance can only
      // ever be set to the loosest day, and on every other day it hides a real
      // regression behind the slack. The date-picker and calendar demos drift
      // the same way. Same instant as the state sweep, so the two gates describe
      // the same page.
      await context.clock.setFixedTime(new Date('2026-08-12T10:00:00Z'));

      const page = await context.newPage();

      info(`  ${theme}: ${targets.length} routes`);
      for (const route of targets) await audit(page, origin, route, theme, findings);

      await context.close();
    }
  } finally {
    await browser?.close();
    server.close();
  }

  const baseline = readBaseline();
  const failures: string[] = [];

  for (const finding of [...findings.values()].sort((a, b) => b.routes.size - a.routes.size)) {
    const allowed = baseline[finding.rule]?.routes ?? 0;
    const count = finding.routes.size;
    const failing = FAILING_IMPACTS.includes(finding.impact ?? 'minor');
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
  // Compare against EVERY route, not the filtered list — `all` is already
  // narrowed, so measuring against it would call any filtered run complete.
  const complete = targets.length === everything.length && themes.length === THEMES.length;
  if (complete) {
    for (const [rule, entry] of Object.entries(baseline)) {
      if (!findings.has(rule)) info(`  ✓ ${rule} no longer appears — drop it from the baseline (${entry.note})`);
    }
  }

  if (failures.length > 0) {
    err(`\n✘ ${failures.length} contrast/target-size rule(s) over baseline.\n`);
    exit(1);
  }

  info(`\n✓ No new contrast or target-size violations (${targets.length} routes × ${themes.length} theme(s)).`);
}

await main();
