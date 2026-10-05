/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrCollapseGroupContext } from '../types';

/**
 * Token a `<wr-collapse>` injects to register itself with — and notify of
 * open events — its parent `<wr-collapse-group>`. Drives the accordion
 * behaviour when the group has `accordion` enabled.
 *
 * @internal
 */
export const WR_COLLAPSE_GROUP = new InjectionToken<WrCollapseGroupContext>('WR_COLLAPSE_GROUP');
