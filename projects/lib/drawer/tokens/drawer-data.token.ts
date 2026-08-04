/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * Token that exposes the `data` payload passed to `WrDrawerManager.open()`.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ChatComponent {
 *   readonly data = inject<ChatData>(WR_DRAWER_DATA);
 * }
 * ```
 */
export const WR_DRAWER_DATA = new InjectionToken<unknown>('WR_DRAWER_DATA');
