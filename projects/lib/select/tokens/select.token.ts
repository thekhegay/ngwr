/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrSelectContext } from '../types';

/**
 * Token a `<wr-option>` injects to register itself with and notify its
 * parent `<wr-select>`.
 *
 * @internal
 */
export const WR_SELECT = new InjectionToken<WrSelectContext>('WR_SELECT');
