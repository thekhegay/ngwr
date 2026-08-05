/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';

import { WrDensity } from './density';
import { DEFAULT_WR_DENSITY_CONFIG, WR_DENSITY_CONFIG, type WrDensityConfig } from './density-config';

/**
 * Configure and activate {@link WrDensity}. All fields optional — merged with
 * defaults.
 *
 * The initializer instantiates {@link WrDensity} so its constructor effect can
 * write `[data-wr-density]` onto `<html>`. Without it the tree-shakable service
 * was never created and `defaultDensity` had no effect at all.
 */
export function provideWrDensity(config: Partial<WrDensityConfig> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: WR_DENSITY_CONFIG, useValue: { ...DEFAULT_WR_DENSITY_CONFIG, ...config } },
    provideEnvironmentInitializer(() => void inject(WrDensity)),
  ]);
}
