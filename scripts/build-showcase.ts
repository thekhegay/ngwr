/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Builds the documentation site, generators and all.
 *
 * This was seven `tsx` invocations joined by `&&` in `package.json`. It is here
 * because the order is not incidental — it splits in two around the build, and
 * the chain had no way to say so:
 *
 * **Before.** Four generators write TypeScript the app IMPORTS. `gen-selectors`
 * and `gen-css-vars` feed the sandbox and the CSS-variables tables,
 * `gen-quality` feeds every number on `/start/quality`, and `gen-ai-assets`
 * writes `llms-full.txt` and the agent skill. Run one of them after the build
 * and the site ships the previous run's data — a failure with no error, which is
 * the shape this repository keeps finding.
 *
 * **After.** Two generators read what the build PRODUCED. The sitemap and the
 * per-page markdown twins are both derived from the prerendered route list, so
 * they cannot run before it exists — the sitemap's own history is the argument:
 * an earlier version read `app/` instead, and a folder rename emptied it in
 * silence.
 *
 * `build-showcase-app.ts` is the middle step and stays its own file: it is the
 * guarded `ng build showcase` — the one that fails the build on a prerender
 * error the Angular builder reports and then exits 0 about — and
 * `archive-docs.yml` calls it directly with its own `--base-href`, wanting the
 * build without the generators.
 *
 * Extra CLI args are forwarded to that middle step, so
 * `pnpm build:showcase --base-href=/x/` still works.
 */

import { argv } from 'node:process';

import { tsx } from './lib/run/step';

const forwarded = argv.slice(2);

// Inputs the app imports. Generated first, or the site is built from the last run's data.
tsx('gen:selectors', 'scripts/gen-selectors.ts');
tsx('gen:css-vars', 'scripts/gen-css-vars.ts');
tsx('gen:quality', 'scripts/gen-quality.ts');
tsx('gen:ai-assets', 'scripts/gen-ai-assets.ts');

tsx('build:showcase (ng build + prerender gate)', 'scripts/build-showcase-app.ts', forwarded);

// Derived from the prerendered route list, so: only once it exists.
tsx('gen:sitemap', 'scripts/gen-sitemap.ts');
tsx('gen:md-docs', 'scripts/gen-md-docs.ts');
