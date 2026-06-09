/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrWindowRef } from './window-ref';

/** Resolves to the active `WrWindowRef` inside a programmatically-opened window's content tree. */
export const WR_WINDOW_REF = new InjectionToken<WrWindowRef<unknown, unknown>>('WR_WINDOW_REF');

/** Resolves to the `data` passed in `WrWindowConfig.data`. */
export const WR_WINDOW_DATA = new InjectionToken<unknown>('WR_WINDOW_DATA');
