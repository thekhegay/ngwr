/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Shared filesystem paths used by the release scripts.
 *
 * Centralised here so the prepare and body scripts agree on where the lib's
 * `package.json` and the repository `CHANGELOG.md` live.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Repository root — one directory above `scripts/lib/`. */
export const ROOT = resolve(here, '..', '..');

/** Path to the published library's `package.json`. */
export const LIB_PKG = resolve(ROOT, 'projects/lib/package.json');

/** Path to the repository `CHANGELOG.md`. */
export const CHANGELOG = resolve(ROOT, 'CHANGELOG.md');
