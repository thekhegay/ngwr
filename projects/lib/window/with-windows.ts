/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type WrFeature, wrFeature } from 'ngwr/utils';

import { WR_WINDOW_DEFAULTS } from './tokens';
import type { WrWindowDefaults } from './types';

/**
 * App-wide window defaults, as a feature of `provideWr()` — today the work area
 * every window keeps inside, so maximized windows stop short of an app header.
 * A window's own `WrWindowConfig.bounds` still wins.
 *
 * Bootstrap only: `WrWindowManager` is root-provided and reads it once, from
 * the root injector, so in a route's `providers` it changes nothing.
 *
 * @example
 * ```ts
 * import { provideWr } from 'ngwr';
 * import { withWindows } from 'ngwr/window';
 *
 * bootstrapApplication(App, {
 *   providers: [provideWr(withWindows({ bounds: { top: 64 } }))],
 * });
 * ```
 */
export function withWindows(defaults: WrWindowDefaults): WrFeature<'windows'> {
  return wrFeature('windows', [{ provide: WR_WINDOW_DEFAULTS, useValue: defaults }]);
}
