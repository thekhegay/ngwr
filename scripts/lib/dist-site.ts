/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Serving and enumerating the prerendered showcase, for the checks that drive
 * a real browser over it and the generators that read it after the build, and
 * asking a loaded page which colour scheme it painted.
 *
 * Four of them did this themselves — `check:contrast`, `check:state-a11y`,
 * `check:layout` and `check:rtl-layout` — with four copies of the same static
 * server, the same listen-on-an-ephemeral-port dance, and four MIME tables
 * that had drifted apart: `check:layout` served an `.ico` as
 * `application/octet-stream`, and only `check:rtl-layout` knew about `.xml`
 * and `.webmanifest`. The table here is their union.
 *
 * The one thing the four did NOT agree on is deliberate and is the only
 * option: what to answer for a path that resolves to nothing. The contrast and
 * state sweeps fall back to the SPA shell, because an unresolved path there is
 * a client route whose prerendered twin may not exist. The two layout sweeps
 * answer 404, because a target that matches nothing has to fail the run rather
 * than measure the home page — which is the rule `check:layout` is built on.
 */

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { exit } from 'node:process';

import type { Browser, Page } from 'playwright';

import { err } from './log/err';
import { ROOT_PATH } from './paths/root';

/** The prerendered showcase, as `build:showcase` leaves it. */
const DIST = resolve(ROOT_PATH, 'dist/showcase');

/** The route manifest the Angular builder writes beside the pages. */
const ROUTES_JSON = join(DIST, 'prerendered-routes.json');

/** The meta-refresh a redirect stub renders, and the route it points at. */
const REDIRECT_RE = /<meta http-equiv="refresh" content="0; url=([^"]+)"/i;

/** The union of what the four sweeps used to carry separately. */
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
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

/** What to answer for a request that resolves to no file on disk. */
type MissingBehaviour = 'spa' | '404';

interface DistServer {
  readonly server: Server;
  /** `http://127.0.0.1:<port>` — the origin to point a browser at. */
  readonly origin: string;
}

/**
 * Serves `dist/showcase` on an ephemeral loopback port.
 *
 * `missing` picks the behaviour described in the module docblock; there is no
 * default, because getting it wrong is silent in both directions — a 404 where
 * the shell was wanted breaks a client route, and a shell where a 404 was
 * wanted turns "this target does not exist" into "this target measured the
 * home page".
 */
function serveDist(missing: MissingBehaviour): Promise<DistServer> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, path);

    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');

    if (!existsSync(file) || extname(file) === '') {
      if (missing === '404') {
        res.writeHead(404).end('not found');
        return;
      }
      file = join(DIST, 'index.html');
    }

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

/**
 * Stops the run when the showcase has not been built.
 *
 * `label` is the check's own name, so the message says which command to re-run
 * and which one is complaining.
 */
function requireBuiltShowcase(label: string): void {
  if (existsSync(join(DIST, 'index.html'))) return;

  err(`\n✘ ${label}: dist/showcase not found. Run \`pnpm build:showcase\` first.\n`);
  exit(1);
}

/**
 * The file under `dist/showcase` that serves `route`: `html` is its own
 * `index.html`, any other extension the sibling twin (`/a/b` is `a/b.md`, and
 * `/` is `index.md`).
 */
function routeFile(route: string, ext: string): string {
  const rel = route.replace(/^\//, '');
  if (ext === 'html') return join(DIST, rel, 'index.html');
  return rel === '' ? join(DIST, `index.${ext}`) : `${join(DIST, rel)}.${ext}`;
}

/** One route the build prerendered. */
interface PrerenderedPage {
  /** With a leading slash, as the manifest spells it. */
  readonly route: string;
  /** Its `index.html`. */
  readonly file: string;
  /** Where a redirect stub sends the reader, or `null` for a real page. */
  readonly redirectTo: string | null;
}

/**
 * Every route in the build's manifest whose page is on disk, in manifest order.
 * Exits when the manifest is missing; `followsBuild` rewords the hint for a
 * step that runs after the build.
 */
function prerenderedPages(label: string, options: { readonly followsBuild?: boolean } = {}): PrerenderedPage[] {
  if (!existsSync(ROUTES_JSON)) {
    const hint = options.followsBuild
      ? 'Run build:showcase first — this step must follow the build.'
      : 'Run `pnpm build:showcase` first.';
    err(`\n✘ ${label}: ${ROUTES_JSON} not found. ${hint}\n`);
    exit(1);
  }

  const manifest = JSON.parse(readFileSync(ROUTES_JSON, 'utf8')) as { routes?: Record<string, unknown> };
  const pages: PrerenderedPage[] = [];

  for (const route of Object.keys(manifest.routes ?? {})) {
    const file = routeFile(route, 'html');
    if (!existsSync(file)) continue;
    pages.push({ route, file, redirectTo: REDIRECT_RE.exec(readFileSync(file, 'utf8'))?.[1] ?? null });
  }
  return pages;
}

/**
 * Every canonical prerendered route, sorted.
 *
 * Redirect stubs are dropped: a meta-refresh page is never painted, so
 * measuring one says nothing and would pad every route count the sweeps print.
 */
function prerenderedRoutes(label: string): string[] {
  return prerenderedPages(label)
    .filter(page => page.redirectTo === null)
    .map(page => page.route)
    .sort();
}

/** What a sweep gets inside `withDistBrowser`. */
interface DistBrowser {
  readonly browser: Browser;
  /** `http://127.0.0.1:<port>`, serving `dist/showcase`. */
  readonly origin: string;
}

/**
 * Serves `dist/showcase`, launches Chromium, runs `sweep`, and closes both
 * whatever happens. Playwright is imported lazily so the generators that only
 * read the page list never load it.
 */
async function withDistBrowser<T>(missing: MissingBehaviour, sweep: (site: DistBrowser) => Promise<T>): Promise<T> {
  const { server, origin } = await serveDist(missing);
  let browser: Browser | null = null;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch();
    return await sweep({ browser, origin });
  } finally {
    await browser?.close();
    server.close();
  }
}

/** The side of every `light-dark()` a page resolves to. */
type PaintedScheme = 'light' | 'dark';

/**
 * Which colour scheme a loaded page actually paints in, or `null` for neither.
 *
 * The sweeps switch theme through the context's `colorScheme` emulation and
 * nothing else: the theme layer declares `color-scheme: light dark` on `:root`,
 * so with no mode chosen every token's `light-dark()` resolves to the side the
 * emulated preference names, from the first paint. That is a setting on the
 * CONTEXT, though, and the page can overrule it without a word — a persisted
 * `WrTheme` mode or an inline `color-scheme` both beat the preference — so the
 * checks ask the CSS rather than trusting what they passed in. The probe is a
 * `light-dark()` of two colours nothing else paints, read back as the computed
 * `color` of a throwaway element under `<body>`, where the tokens are read.
 * `null` is an engine that resolved neither, which fails the run as surely as
 * the wrong side would: every token in the theme is written in that function.
 *
 * No named inner function, on purpose: esbuild's keep-names transform wraps one
 * in a `__name(…)` call that does not exist inside the page.
 */
function paintedScheme(page: Page): Promise<PaintedScheme | null> {
  return page.evaluate<PaintedScheme | null>(() => {
    const probe = document.createElement('i');
    probe.style.color = 'light-dark(rgb(0, 0, 1), rgb(0, 0, 2))';
    document.body.append(probe);
    const painted = getComputedStyle(probe).color;
    probe.remove();
    return painted === 'rgb(0, 0, 1)' ? 'light' : painted === 'rgb(0, 0, 2)' ? 'dark' : null;
  });
}

/** Who `openInScheme` names when it refuses, and why. */
interface SchemeRefusal {
  readonly label: string;
  /** A clause appended after ` — `, without its own full stop. */
  readonly reason?: string;
}

/** Loads `route` to network idle and exits unless it painted `scheme`. */
async function openInScheme(
  page: Page,
  origin: string,
  route: string,
  scheme: PaintedScheme,
  refusal: SchemeRefusal
): Promise<void> {
  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });

  const applied = await paintedScheme(page);
  if (applied === scheme) return;

  const reason = refusal.reason ? ` — ${refusal.reason}` : '';
  err(`\n✘ ${refusal.label}: ${route} came up as "${applied ?? 'neither'}" with "${scheme}" requested${reason}.\n`);
  exit(1);
}

export {
  DIST as DIST_SHOWCASE,
  openInScheme,
  prerenderedPages,
  prerenderedRoutes,
  requireBuiltShowcase,
  routeFile,
  withDistBrowser,
};
export type { DistBrowser, DistServer, MissingBehaviour, PaintedScheme, PrerenderedPage, SchemeRefusal };
