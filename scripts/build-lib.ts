/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Builds the published package: the Angular library, then everything else the
 * tarball carries.
 *
 * Also an `&&` chain until now, and the same argument applies — every step after
 * `ng build lib` reads or writes `dist/lib`, so the order is a real constraint
 * that the chain expressed only by being written down correctly.
 *
 * What the four steps add to the bundles ng-packagr emits: the AI assets
 * (`llms-full.txt` and the agent skill, both regenerated from library source so
 * the catalog cannot say two different things in two files), the loose files
 * `copy-dist-assets` places, `dist/lib/i18n/<locale>.json` for consumers on the
 * HTTP loader — who otherwise cannot serve ngwr's own strings at all — and the
 * two things built with their own compilers rather than ng-packagr's: the
 * schematics and the `ngwr-mcp` CLI.
 */

import { step, tsx } from './lib/run/step';

step('ng build lib', 'pnpm', ['exec', 'ng', 'build', 'lib']);

tsx('gen:ai-assets', 'scripts/gen-ai-assets.ts');
tsx('copy-dist-assets', 'scripts/copy-dist-assets.ts');
tsx('gen:i18n-json', 'scripts/gen-i18n-json.ts');
tsx('build:schematics', 'scripts/build-schematics.ts');
tsx('build:mcp', 'scripts/build-mcp.ts');
