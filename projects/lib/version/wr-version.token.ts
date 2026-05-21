/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import { WR_VERSION } from './wr-version';

/**
 * Injection token holding the library version string.
 *
 * Default factory returns {@link WR_VERSION}. Override it in tests or in apps
 * that want to surface a custom build identifier.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class FooterComponent {
 *   readonly version = inject(WR_VERSION_TOKEN);
 * }
 * ```
 */
export const WR_VERSION_TOKEN = new InjectionToken<string>('WR_VERSION_TOKEN', {
  providedIn: 'root',
  factory: () => WR_VERSION,
});
