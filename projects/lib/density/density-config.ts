/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrDensityConfig } from './interfaces';

export const DEFAULT_WR_DENSITY_CONFIG: WrDensityConfig = {
  defaultDensity: 'default',
  storageKey: 'wr-density',
  attribute: 'data-wr-density',
};

export const WR_DENSITY_CONFIG = new InjectionToken<WrDensityConfig>('WR_DENSITY_CONFIG', {
  factory: (): WrDensityConfig => DEFAULT_WR_DENSITY_CONFIG,
});

export type { WrDensityValue, WrDensityConfig } from './interfaces';
