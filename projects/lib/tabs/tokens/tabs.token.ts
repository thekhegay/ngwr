/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrTabsContext } from '../types';

/**
 * Token a `<wr-tab>` injects to register itself with — and read the active
 * key from — its parent `<wr-tabs>` host.
 *
 * @internal
 */
export const WR_TABS = new InjectionToken<WrTabsContext>('WR_TABS');
