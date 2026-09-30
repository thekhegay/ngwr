/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrCheckboxGroupContext } from '../types';

/**
 * Token a `<wr-checkbox>` injects to read selection state from — and
 * toggle values in — its parent `<wr-checkbox-group>` (when present).
 *
 * @internal
 */
export const WR_CHECKBOX_GROUP = new InjectionToken<WrCheckboxGroupContext>('WR_CHECKBOX_GROUP');
