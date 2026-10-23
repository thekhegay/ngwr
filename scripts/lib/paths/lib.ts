/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Absolute path to the published library's source, `projects/lib`. */

import { resolve } from 'node:path';

import { ROOT_PATH } from './root';

export const LIB_PATH = resolve(ROOT_PATH, 'projects/lib');
