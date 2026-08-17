/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Writes the shipped theme presets under `registry/items/`.
 *
 * They are CHECKED IN rather than gitignored, because a registry item is a URL
 * someone else fetches — `/registry/items/theme-slate.json` has to exist in the
 * repo and in the deployed site, not only after a build. So the files are
 * generated here and verified by `check:registry`, which re-derives them from
 * the same seed table and fails if either side has been edited alone. Same
 * bargain as `gen:api-docs` / `check:api-docs`.
 *
 * Usage:
 *   pnpm gen:theme-presets
 */

import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { info } from './lib/log/info';
import { ROOT_PATH } from './lib/paths/root';
import { PRESETS, buildThemePreset } from './lib/registry/theme-presets';

const ITEMS = resolve(ROOT_PATH, 'registry/items');

for (const preset of PRESETS) {
  const item = buildThemePreset(preset);
  writeFileSync(join(ITEMS, `${preset.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  const vars = item['cssVars'] as { light: object; dark: object };
  info(`✓ ${preset.name} — ${Object.keys(vars.light).length} light / ${Object.keys(vars.dark).length} dark tokens`);
}
