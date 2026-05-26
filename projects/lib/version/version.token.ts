/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { NGWR_VERSION } from './version';

/**
 * Injection token holding the ngwr library version string.
 *
 * Default factory returns {@link NGWR_VERSION}. Override it in tests or in
 * apps that want to surface a custom build identifier.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class FooterComponent {
 *   readonly version = inject(NGWR_VERSION_TOKEN);
 * }
 * ```
 */
export const NGWR_VERSION_TOKEN = new InjectionToken<string>('NGWR_VERSION_TOKEN', {
  providedIn: 'root',
  factory: () => NGWR_VERSION,
});
