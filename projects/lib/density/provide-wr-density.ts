/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { DEFAULT_WR_DENSITY_CONFIG, WR_DENSITY_CONFIG, type WrDensityConfig } from './density-config';

/** Configure {@link WrDensity}. All fields optional — merged with defaults. */
export function provideWrDensity(config: Partial<WrDensityConfig> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: WR_DENSITY_CONFIG, useValue: { ...DEFAULT_WR_DENSITY_CONFIG, ...config } },
  ]);
}
