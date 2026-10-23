/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes `dist/showcase/sitemap.xml` from the routes the build actually
 * prerendered.
 *
 * Runs AFTER `build:showcase`, reading `dist/showcase/prerendered-routes.json`
 * — the authoritative list Angular emits under `outputMode: 'static'`. Redirect
 * stubs (meta-refresh pages: section indices like `/reference` -> its first
 * child, and legacy slugs) are dropped so the sitemap advertises only canonical
 * content URLs, never a redirect.
 *
 * Why not scan `app/` dirs or parse the route config: both drift silently on a
 * rename. The previous sitemap did exactly that — it globbed
 * `app/components` + `app/getting-started`, the docs IA move renamed both, and
 * the sitemap collapsed to a single URL with no error. The prerender output
 * cannot drift from what actually shipped, and the floor check below turns a
 * future break into a failed build instead of a stunted sitemap.
 *
 * Wired into `build:showcase` (after the build), so `ci.yml` and `deploy.yml`
 * regenerate it without an extra step.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exit } from 'node:process';

import { DIST_SHOWCASE, prerenderedPages } from '../lib/dist-site';
import { err } from '../lib/log/err';
import { info } from '../lib/log/info';

const SITE = 'https://ngwr.dev';
const OUT = join(DIST_SHOWCASE, 'sitemap.xml');

/**
 * Sanity floor. The showcase has ~186 canonical pages; a result far below that
 * means the route source broke, and shipping a near-empty sitemap is exactly
 * the failure this rewrite exists to prevent — so fail loudly instead.
 */
const MIN_EXPECTED = 100;

const pages = prerenderedPages('sitemap', { followsBuild: true });

// A redirect stub renders as a meta-refresh page; its target is already a
// canonical route in the list, so drop the stub rather than advertise a hop.
const canonical = pages
  .filter(page => page.redirectTo === null)
  .map(page => page.route)
  .sort();

if (canonical.length < MIN_EXPECTED) {
  err(
    `\n✘ sitemap: only ${canonical.length} canonical routes (expected >= ${MIN_EXPECTED}).\n` +
      `  prerendered-routes.json or the prerender output looks broken — not shipping a stunted sitemap.\n`
  );
  exit(1);
}

const body = canonical.map(route => `  <url><loc>${SITE}${route}</loc></url>`).join('\n');

writeFileSync(
  OUT,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
);

info(`✓ sitemap.xml — ${canonical.length} URLs (${pages.length - canonical.length} redirect stubs excluded)`);
