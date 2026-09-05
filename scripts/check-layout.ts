/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Layout regression, measured rather than photographed.
 *
 * A5 asked for Playwright screenshot diffs. This is that gate, built on numbers
 * instead of pixels, and the three reasons are worth stating because they are
 * the reasons not to switch back:
 *
 *   - **Size.** The showcase is 214 routes; at two themes that is hundreds of
 *     PNGs and tens of megabytes of binaries in a repository whose entire
 *     source is smaller than that.
 *   - **Platform.** Font rasterisation differs between macOS and the ubuntu
 *     runner, so a baseline captured where the work happens never matches where
 *     it is checked. Every pixel gate solves this with a container; this one
 *     does not have the problem, because box geometry is arithmetic.
 *   - **Legibility.** An image diff shows a red blob. `height 36 → 40` in a JSON
 *     diff says what changed, is reviewable in a pull request, and can be
 *     approved by editing one number.
 *
 * What it catches: a token, a density multiplier or a padding change silently
 * resizing controls — the class of regression no other gate reports, because
 * `check:contrast` measures colour, `check:state-a11y` measures roles and names,
 * and `check:rtl-layout` only compares a page against its own mirror.
 *
 * What it does NOT catch, and nothing here pretends otherwise: colour, shadows,
 * border radii, and anything else that changes how a box is painted rather than
 * how big it is.
 *
 *   pnpm check:layout                 # verify against the baseline
 *   pnpm check:layout --update        # re-record it
 *   pnpm check:layout --filter=button # one target while iterating
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join } from 'node:path';
import { argv, cwd, exit, stdout } from 'node:process';

import { chromium, type Browser } from 'playwright';

import { LAYOUT_TARGETS, type LayoutTarget } from './lib/layout/targets';

const DIST = join(cwd(), 'dist/showcase');
const BASELINE = join(cwd(), 'scripts/layout-baseline.json');
const VIEWPORT = { width: 1280, height: 900 };

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** The prerendered site needs a real origin, or every page renders unstyled. */
function serve(): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const candidates = [join(DIST, path), join(DIST, path, 'index.html')];
    const file = candidates.find(candidate => existsSync(candidate) && extname(candidate) !== '');
    if (!file) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });

  return new Promise(done => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      done({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

/**
 * How far a box may move before it is a regression.
 *
 * Not zero, and the reason is text: a label's width depends on font
 * rasterisation, which differs between the machine this is written on and the
 * runner that checks it. One pixel absorbs that. Anything a token change causes
 * is larger — the smallest step in the density scale is two.
 */
const TOLERANCE = 1;

type Box = readonly [width: number, height: number];
type Baseline = Record<string, readonly Box[]>;

const log = (s = ''): void => void stdout.write(`${s}\n`);

function parseArgs(): { readonly update: boolean; readonly filter: string } {
  const args = argv.slice(2);
  const unknown = args.filter(a => a !== '--update' && !a.startsWith('--filter='));
  if (unknown.length > 0) {
    log(`Unknown option(s): ${unknown.join(' ')}`);
    log('Usage: check:layout [--update] [--filter=<substring>]');
    exit(1);
  }
  return { update: args.includes('--update'), filter: args.find(a => a.startsWith('--filter='))?.split('=')[1] ?? '' };
}

async function measure(
  browser: Browser,
  origin: string,
  theme: 'light' | 'dark',
  targets: readonly LayoutTarget[],
  missing: string[]
): Promise<Baseline> {
  // Pinned exactly as `check:state-a11y` pins its context, and for the same
  // reason: a page that renders differently tomorrow, or on another machine,
  // cannot have a baseline. The clock matters here too — the calendar and
  // event-calendar demos size themselves from today's date.
  const context = await browser.newContext({
    colorScheme: theme,
    reducedMotion: 'reduce',
    viewport: VIEWPORT,
    userAgent:
      `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ` +
      `(KHTML, like Gecko) HeadlessChrome/${browser.version()} Safari/537.36`,
  });
  await context.clock.setFixedTime(new Date('2026-08-12T10:00:00Z'));
  await context.addInitScript(t => localStorage.setItem('wr-theme', t), theme);

  const out: Baseline = {};
  const page = await context.newPage();

  for (const target of targets) {
    await page.goto(`${origin}${target.route}`, { waitUntil: 'networkidle' });
    const locator = page.locator(target.selector);
    const count = await locator.count();

    // A target that matches nothing is a broken entry, not a pass. Recording it
    // as an empty array would compare equal to itself forever — the gate would
    // go on reporting success about a component it stopped looking at. Same
    // rule `check:state-a11y` follows for a state that never painted.
    if (count === 0) {
      missing.push(`  ✘ ${target.id} (${theme}) — no "${target.selector}" on ${target.route}`);
      continue;
    }

    // An entry that measures nothing is indistinguishable from one that passes,
    // so a zero-sized box is reported rather than recorded.
    const boxes: Box[] = [];
    for (let i = 0; i < (target.all ? count : 1); i++) {
      const box = await locator.nth(i).boundingBox();
      if (!box || box.width === 0 || box.height === 0) {
        missing.push(`  ✘ ${target.id}[${i}] (${theme}) — matched but has no box`);
        continue;
      }
      boxes.push([Math.round(box.width), Math.round(box.height)]);
    }
    if (boxes.length > 0) out[`${target.id} (${theme})`] = boxes;
  }

  await context.close();
  return out;
}

async function main(): Promise<void> {
  const { update, filter } = parseArgs();

  if (!existsSync(join(DIST, 'index.html'))) {
    log('dist/showcase is missing — run `pnpm build:showcase` first.');
    exit(1);
  }

  const targets = LAYOUT_TARGETS.filter(t => t.id.includes(filter));
  if (targets.length === 0) {
    log(`No layout target matches --filter=${filter}`);
    exit(1);
  }

  const { server, origin } = await serve();
  const browser = await chromium.launch();
  const missing: string[] = [];
  let measured: Baseline = {};
  try {
    for (const theme of ['light', 'dark'] as const) {
      log(`  ${theme}: ${targets.length} target(s)`);
      measured = { ...measured, ...(await measure(browser, origin, theme, targets, missing)) };
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (missing.length > 0) {
    log();
    missing.forEach(m => log(m));
    log(`\n✘ ${missing.length} target(s) measured nothing. Fix the selector — an entry that finds no element is not a pass.`);
    exit(1);
  }

  if (update) {
    const merged: Baseline = existsSync(BASELINE)
      ? { ...(JSON.parse(readFileSync(BASELINE, 'utf8')) as Baseline), ...measured }
      : measured;
    const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
    log(`\n✓ Recorded ${Object.keys(measured).length} entr(ies) into scripts/layout-baseline.json`);
    return;
  }

  if (!existsSync(BASELINE)) {
    log('\nNo baseline yet. Run `pnpm check:layout --update` and commit the result.');
    exit(1);
  }

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Baseline;
  const problems: string[] = [];

  for (const [key, boxes] of Object.entries(measured)) {
    const before = baseline[key];
    if (!before) {
      problems.push(`  + ${key} — not in the baseline. Re-record with --update.`);
      continue;
    }
    if (before.length !== boxes.length) {
      problems.push(`  ~ ${key} — ${before.length} box(es) recorded, ${boxes.length} measured.`);
      continue;
    }
    boxes.forEach(([w, h], i) => {
      const [bw, bh] = before[i]!;
      if (Math.abs(w - bw) > TOLERANCE || Math.abs(h - bh) > TOLERANCE) {
        problems.push(`  ✘ ${key}[${i}] — ${bw}×${bh} recorded, ${w}×${h} measured.`);
      }
    });
  }

  log();
  if (problems.length > 0) {
    problems.forEach(p => log(p));
    log(`\n✘ ${problems.length} layout change(s). Intended? \`pnpm check:layout --update\` and commit the diff.`);
    exit(1);
  }
  log(`✓ No layout drift (${Object.keys(measured).length} entries × ${TOLERANCE}px tolerance).`);
}

await main();
