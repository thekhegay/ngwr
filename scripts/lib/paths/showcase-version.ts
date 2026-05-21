/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Absolute path to the showcase's hard-coded `NGWR_VERSION` constant. */

import { resolve } from 'node:path';

import { ROOT_PATH } from './root';

export const SHOWCASE_VERSION_PATH = resolve(ROOT_PATH, 'projects/showcase/app/_core/version.ts');
