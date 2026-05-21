/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

/**
 * Token that exposes the `data` payload passed to `WrDialogService.open()`.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ConfirmComponent {
 *   readonly data = inject<ConfirmData>(WR_DIALOG_DATA);
 * }
 * ```
 */
export const WR_DIALOG_DATA = new InjectionToken<unknown>('WR_DIALOG_DATA');
