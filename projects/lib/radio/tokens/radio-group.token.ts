/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrRadioGroupContext } from '../types';

/**
 * Token a `<wr-radio>` injects to participate in its parent `<wr-radio-group>`
 * — reads the selected value, shares the `name` attribute, and signals
 * selection / blur back up.
 *
 * @internal
 */
export const WR_RADIO_GROUP = new InjectionToken<WrRadioGroupContext>('WR_RADIO_GROUP');
