/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { inject, provideEnvironmentInitializer } from '@angular/core';

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WrDensity } from './density';
import { DEFAULT_WR_DENSITY_CONFIG, WR_DENSITY_CONFIG, type WrDensityConfig } from './density-config';

/**
 * Configure and activate {@link WrDensity}, as a feature of `provideWr()`. All
 * fields optional — merged with defaults.
 *
 * The initializer instantiates {@link WrDensity} so its constructor effect can
 * write `[data-wr-density]` onto `<html>`. Without it the tree-shakable service
 * was never created and `defaultDensity` had no effect at all.
 *
 * Bootstrap only: {@link WrDensity} is root-provided and reads its config once,
 * from the root injector.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withDensity } from 'ngwr/density';
 *
 * bootstrapApplication(App, {
 *   providers: [provideWr(withDensity({ defaultDensity: 'sm' }))],
 * });
 * ```
 */
export function withDensity(config: Partial<WrDensityConfig> = {}): WrFeature<'density'> {
  return wrFeature('density', [
    { provide: WR_DENSITY_CONFIG, useValue: { ...DEFAULT_WR_DENSITY_CONFIG, ...config } },
    provideEnvironmentInitializer(() => void inject(WrDensity)),
  ]);
}
