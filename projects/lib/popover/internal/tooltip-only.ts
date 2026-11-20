/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * Provided by `[wrTooltip]` so the `WrPopover` it hosts is a tooltip whatever
 * `mode` says: a host directive cannot set another directive's signal input.
 *
 * @internal
 */
export const WR_TOOLTIP_ONLY = new InjectionToken<boolean>('WR_TOOLTIP_ONLY');
