/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { DEFAULT_TOAST_CONFIG } from '../default-toast-config';
import type { WrToastConfig } from '../types';

/**
 * Holds the global {@link WrToastConfig} used by {@link WrToast}.
 * The default factory returns {@link DEFAULT_TOAST_CONFIG} so the service
 * works out of the box; override via {@link provideWrToastConfig}.
 */
export const WR_TOAST_CONFIG = new InjectionToken<WrToastConfig>('WR_TOAST_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_TOAST_CONFIG,
});
