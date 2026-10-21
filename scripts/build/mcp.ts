/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Compiles the MCP server into the published tarball.
 *
 * Layout produced under `dist/lib/mcp/`:
 *
 *   server.js        — the `ngwr-mcp` bin, with a shebang and the execute bit
 *   catalog.js       — reads llms-full.txt + schematics/use/symbol-map.json
 *   api.js           — reads types/*.d.ts
 *   tools.js
 *
 * No `package.json` here, unlike `schematics/`: that folder is CommonJS and has
 * to say so, while this one is ESM and `dist/lib/package.json` already declares
 * `"type": "module"`.
 *
 * Wired into `build:lib`, so local builds and CI ship the same artifact.
 *
 * Usage:
 *   pnpm tsx scripts/build/mcp.ts
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';

import { err } from '../lib/log/err';
import { info } from '../lib/log/info';
import { DIST_LIB_PATH, requireBuiltLib } from '../lib/paths/dist-lib';
import { ROOT_PATH } from '../lib/paths/root';
import { tsc } from '../lib/run/step';

const SRC = resolve(ROOT_PATH, 'projects/lib/mcp');
const TSCONFIG = resolve(SRC, 'tsconfig.json');
const DST = resolve(DIST_LIB_PATH, 'mcp');
const ENTRY = resolve(DST, 'server.js');

requireBuiltLib('build:mcp');

info(`▸ Compiling the MCP server with ${TSCONFIG}`);
tsc('tsc -p projects/lib/mcp', TSCONFIG);

if (!existsSync(ENTRY)) {
  err(`Expected ${ENTRY} after compiling.`);
  exit(1);
}

// A `bin` has to be executable and has to name its interpreter; tsc emits
// neither, so both are added here rather than kept in the source where the
// TypeScript compiler would have to be told to ignore them.
const SHEBANG = '#!/usr/bin/env node\n';
const compiled = readFileSync(ENTRY, 'utf8');
if (!compiled.startsWith('#!')) writeFileSync(ENTRY, SHEBANG + compiled);
chmodSync(ENTRY, 0o755);

info(`✓ MCP server ready at ${ENTRY} (bin: ngwr-mcp)`);
