/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import type { WrConfig } from './interfaces';
import { WR_CONFIG } from './tokens';

/**
 * Set app-wide component defaults.
 *
 * Nothing is activated by this and no service is constructed — unlike
 * `provideWrDensity()`, which has to instantiate its service to write an
 * attribute onto `<html>`. A config is read on demand by whichever component
 * wants a default, so providing it costs one token.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideWrConfig({ button: { size: 'sm' }, select: { rounded: true } })],
 * });
 * ```
 *
 * Scoped use works the same way: put it in a route's `providers` and only that
 * branch of the tree sees it, because the components resolve the token through
 * their own injector.
 *
 * @see https://ngwr.dev/start/configuration
 */
export function provideWrConfig(config: WrConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: WR_CONFIG, useValue: config }]);
}
