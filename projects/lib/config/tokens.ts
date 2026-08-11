/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrConfig } from './interfaces';

/**
 * App-wide component defaults, or `{}` when the app never called
 * `provideWrConfig()`.
 *
 * A factory default rather than an optional inject at every call site: a
 * component asking for its own default should not have to care whether anyone
 * configured anything, and `{}` reads the same as absent through
 * {@link useConfigValue}.
 */
export const WR_CONFIG = new InjectionToken<WrConfig>('WR_CONFIG', {
  providedIn: 'root',
  factory: (): WrConfig => ({}),
});
