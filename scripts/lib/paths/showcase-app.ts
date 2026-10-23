/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** Absolute path to the docs site's `app/`, the root every page directory is relative to. */

import { resolve } from 'node:path';

import { ROOT_PATH } from './root';

export const SHOWCASE_APP_PATH = resolve(ROOT_PATH, 'projects/showcase/app');
