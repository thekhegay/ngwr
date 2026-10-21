/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Serving and enumerating the prerendered showcase, for the checks that drive
 * a real browser over it — and asking a loaded page which colour scheme it
 * painted, which three of them need before they measure anything.
 *
 * `check:contrast`, `check:state-a11y` and `check:layout` each did this
 * themselves once, with their own copies of the same static server and MIME
 * tables that had drifted apart: `check:layout` served an `.ico` as
 * `application/octet-stream`. The table here is their union.
 *
 * The one thing they do NOT agree on is deliberate and is the only option:
 * what to answer for a path that resolves to nothing. The contrast and state
 * sweeps fall back to the SPA shell, because an unresolved path there is a
 * client route whose prerendered twin may not exist. The layout sweep answers
 * 404, because a target that matches nothing has to fail the run rather than
 * measure the home page — which is the rule `check:layout` is built on.
 */

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { exit } from 'node:process';

import type { Page } from 'playwright';

import { err } from './log/err';

/** The prerendered showcase, as `build:showcase` leaves it. */
const DIST = resolve('dist/showcase');

/** The route manifest the Angular builder writes beside the pages. */
const ROUTES_JSON = join(DIST, 'prerendered-routes.json');

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
 * Every canonical prerendered route, sorted.
 *
 * Redirect stubs are dropped: a meta-refresh page is never painted, so
 * measuring one says nothing and would pad every route count the sweeps print.
 */
function prerenderedRoutes(label: string): string[] {
  if (!existsSync(ROUTES_JSON)) {
    err(`\n✘ ${label}: ${ROUTES_JSON} not found. Run \`pnpm build:showcase\` first.\n`);
    exit(1);
  }

  const manifest = JSON.parse(readFileSync(ROUTES_JSON, 'utf8')) as { routes?: Record<string, unknown> };

  return Object.keys(manifest.routes ?? {})
    .filter(route => {
      const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route.slice(1), 'index.html');
      return existsSync(file) && !readFileSync(file, 'utf8').includes('http-equiv="refresh"');
    })
    .sort();
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

export { DIST as DIST_SHOWCASE, paintedScheme, prerenderedRoutes, requireBuiltShowcase, serveDist };
export type { DistServer, MissingBehaviour, PaintedScheme };
