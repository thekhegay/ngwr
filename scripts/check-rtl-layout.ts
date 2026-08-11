/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Fails when a page overflows sideways under `dir="rtl"` but not under `dir="ltr"`.
 *
 * Why this exists: after the RTL sweep (ROADMAP G1) nothing in CI ever rendered a
 * page right-to-left. `pnpm check:rtl` reads source and catches a physical
 * property with no stated reason; `pnpm check:a11y` runs in JSDOM with no
 * stylesheets at all, so it cannot see layout; `pnpm test` does not render. The
 * one bug this batch actually shipped was of exactly the kind all three miss: the
 * slider's thumb centred itself with `translate(-50%)` against an inset that had
 * become logical, so under RTL the thumb — and the 44px tap area pinned to it —
 * sat a full thumb-width past its own value. It took a browser to see.
 *
 * What it measures, and why that and not more: horizontal document overflow, in
 * both directions, per route. An unmirrored offset, a margin that did not flip, a
 * width computed from the wrong edge — the usual RTL breakages all end the same
 * way, with content pushed outside the viewport and a scrollbar appearing along
 * the bottom of the page. It is one number per page, it needs no baseline of
 * pixel positions to drift, and it says something a reader can act on.
 *
 * DIFFERENTIAL, not absolute. Some pages legitimately overflow in both
 * directions — a wide API table inside its own `overflow-x: auto` scroller, a
 * code block that does not wrap. Failing on those would mean a baseline of
 * expected overflow, which rots. Comparing a route against ITSELF in the other
 * direction has no such problem: a page that scrolls sideways in RTL and not in
 * LTR is a mirroring bug, full stop.
 *
 * Nightly rather than per-PR, for the same reason `check:contrast` is: it needs a
 * browser and a page load per route, which took the PR job from ~5 minutes to
 * nearly 17 when it was tried there. What it catches is drift, not the kind of
 * break a single review needs told about mid-cycle.
 *
 *   pnpm check:rtl-layout                    # every route, both directions
 *   pnpm check:rtl-layout --routes=20        # a sample, for a quick local pass
 *   pnpm check:rtl-layout --filter=slider    # only routes containing a substring
 *   pnpm check:rtl-layout --verbose          # per-route numbers, not just failures
 */

import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { exit } from 'node:process';

import { chromium, type Browser, type Page } from 'playwright';

const ROOT_PATH = resolve(import.meta.dirname, '..');
const DIST = join(ROOT_PATH, 'dist/showcase');
const ROUTES_JSON = join(DIST, 'prerendered-routes.json');

/**
 * How far a box may escape the viewport before it counts.
 *
 * Sub-pixel rounding and a scrollbar gutter put honest layouts a couple of pixels
 * over; 4px is comfortably under the smallest real mirroring bug — which pushes
 * content out by a whole padding, margin or offset — and comfortably over the
 * noise.
 */
const TOLERANCE = 4;

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
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

const info = (message: string): void => console.log(message);
const err = (message: string): void => console.error(message);

/** The prerendered site needs a real origin, or every page is analysed unstyled. */
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

/** Every canonical route, redirect stubs dropped. */
function routes(): string[] {
  if (!existsSync(ROUTES_JSON)) {
    err(`\n✘ rtl-layout: ${ROUTES_JSON} not found. Run build:showcase first.\n`);
    exit(1);
  }

  const all = Object.keys(
    (JSON.parse(readFileSync(ROUTES_JSON, 'utf8')) as { routes?: Record<string, unknown> }).routes ?? {}
  );

  return all
    .filter(route => {
      const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html');
      return existsSync(file) && !readFileSync(file, 'utf8').includes('http-equiv="refresh"');
    })
    .sort();
}

interface Measurement {
  /** How far the worst visible box escapes the viewport, in CSS pixels. */
  readonly escape: number;
  /** That box, for a failure a reader can act on. */
  readonly culprit: string | null;
}

/**
 * The measurement, as SOURCE injected into the page.
 *
 * Not a `page.evaluate` callback, and not by choice: the bundler that runs this
 * script rewrites named functions through its own `__name` helper, which does not
 * exist in the browser — a callback with any nested helper dies on
 * `ReferenceError: __name is not defined` at the first call. Injecting a string
 * is how `check-contrast.ts` gets axe in, and it has the same immunity.
 *
 * Element rects, NOT `scrollWidth`. The obvious measurement is wrong here, and
 * wrong in the one direction that matters: a document's scroll origin is its
 * inline START, so content pushed past that edge is unreachable overflow the
 * browser never adds to `scrollWidth`. Under RTL the inline start is the RIGHT
 * edge — which is exactly where a surviving physical `left` or `margin-left`
 * pushes things. Measured that way a page visibly broken in RTL reports
 * `scrollWidth === clientWidth`, and this check would pass every single time.
 * That is not a hypothetical: it is what the first version of this script did.
 */
const MEASURE_SOURCE = `
window.__wrMeasureEscape = function (direction) {
  document.documentElement.dir = direction;
  // A reflow the measurement can trust: \`dir\` restyles the whole document, and
  // reading a rect in the same task as the write returns the old boxes.
  void document.documentElement.offsetWidth;

  var viewport = document.documentElement.clientWidth;

  function clipped(el) {
    for (var node = el.parentElement; node; node = node.parentElement) {
      var style = getComputedStyle(node);
      // A clipped or scrolled ancestor means nothing escapes the PAGE: a wide
      // table inside its own scroller, a carousel track, a closed drawer parked
      // outside its own frame. None of those is a mirroring bug.
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') return true;
      if (style.clipPath !== 'none' || style.contain.indexOf('paint') !== -1) return true;
    }
    return false;
  }

  function invisible(el) {
    var style = getComputedStyle(el);
    return (
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      Number(style.opacity) === 0 ||
      el.closest('[aria-hidden="true"], [inert]') !== null
    );
  }

  var worst = null;
  var all = document.body.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Past the right edge, or past the left one — both are escapes, and which is
    // which swaps with the direction.
    var reach = Math.max(rect.right - viewport, -rect.left);
    if (reach <= 0) continue;
    if (worst && reach <= worst.reach) continue;
    if (invisible(el) || clipped(el)) continue;

    worst = { reach: Math.round(reach), html: el.outerHTML.slice(0, 120) };
  }

  return {
    escape: worst ? worst.reach : 0,
    culprit: worst ? worst.reach + 'px past the edge — ' + worst.html : null,
  };
};
`;

async function measure(page: Page, origin: string, route: string, dir: 'ltr' | 'rtl'): Promise<Measurement> {
  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: MEASURE_SOURCE });

  return page.evaluate(
    direction =>
      (window as unknown as { __wrMeasureEscape: (d: string) => Measurement }).__wrMeasureEscape(direction),
    dir
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const limit = Number(args.find(a => a.startsWith('--routes='))?.split('=')[1] ?? 0);
  const filter = args.find(a => a.startsWith('--filter='))?.split('=')[1] ?? '';

  const all = routes().filter(route => route.includes(filter));
  if (all.length === 0) {
    err(`\n✘ rtl-layout: no route matches "${filter}".\n`);
    exit(1);
  }
  const targets = limit > 0 ? all.slice(0, limit) : all;

  const { server, origin } = await serve();
  let browser: Browser | null = null;
  const failures: { route: string; ltr: number; rtl: number; culprit: string | null }[] = [];

  try {
    browser = await chromium.launch();
    // `reducedMotion` for the same reason `check:contrast` sets it: an animation
    // caught mid-flight can be translated well outside the viewport, and a
    // measurement of one frame is not a measurement of the layout.
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    info(`\nRTL layout — ${targets.length} routes, both directions\n`);

    for (const route of targets) {
      const ltr = await measure(page, origin, route, 'ltr');
      const rtl = await measure(page, origin, route, 'rtl');

      // Only a direction-dependent overflow is a finding. A page that scrolls
      // sideways both ways is doing something unrelated to mirroring.
      const regressed = rtl.escape > ltr.escape + TOLERANCE;
      if (regressed) failures.push({ route, ltr: ltr.escape, rtl: rtl.escape, culprit: rtl.culprit });

      if (verbose || regressed) {
        info(`  ${regressed ? '✘' : ' '} ${route} — ltr ${ltr.escape}px, rtl ${rtl.escape}px`);
      }
    }

    await context.close();
  } finally {
    await browser?.close();
    server.close();
  }

  if (failures.length > 0) {
    err(`\n✘ ${failures.length} route${failures.length === 1 ? '' : 's'} have content escaping the viewport under dir="rtl":\n`);
    for (const { route, ltr, rtl, culprit } of failures) {
      err(`  ${route}`);
      err(`    ltr ${ltr}px → rtl ${rtl}px`);
      if (culprit) err(`    ${culprit}`);
    }
    err(`
  Something is anchored to a physical edge. The usual causes, in order of how
  often they turn out to be it: a \`left\` / \`right\` offset that should be
  \`inset-inline-*\`, a \`translateX\` paired with an inset that has become
  logical (the pair has to mirror together), and a width measured from
  \`getBoundingClientRect().left\` in TypeScript while the CSS mirrors around it.
  \`pnpm check:rtl-layout --filter=<route> --verbose\` narrows it down.
`);
    exit(1);
  }

  info(`\n✓ RTL layout — nothing escapes the viewport in rtl that does not already in ltr.\n`);
}

await main();
