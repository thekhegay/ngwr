/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Absolute path to the repository `CHANGELOG.md`. */

import { resolve } from 'node:path';

import { ROOT_PATH } from './root';

export const CHANGELOG_PATH = resolve(ROOT_PATH, 'CHANGELOG.md');
