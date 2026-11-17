/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrButtonSize } from '../types';

/**
 * The size a `<wr-btn>` takes when it sets none of its own. A container
 * provides it for the buttons in its content, as `WrDialog` does for a sized
 * dialog. The value is a function, so a signal fits as it is; `null` or
 * `undefined` leaves the button at `md`.
 *
 * @example
 * ```ts
 * providers: [{ provide: WR_BUTTON_SIZE, useValue: () => 'sm' }]
 * ```
 */
export const WR_BUTTON_SIZE = new InjectionToken<() => WrButtonSize | null | undefined>('WR_BUTTON_SIZE');
