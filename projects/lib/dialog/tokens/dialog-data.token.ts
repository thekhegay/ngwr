/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DIALOG_DATA } from '@angular/cdk/dialog';

/**
 * Token that exposes the `data` payload passed to `WrDialogService.open()`.
 *
 * Re-exports CDK's `DIALOG_DATA` so the wr namespace is consistent and the
 * caller never reaches into `@angular/cdk/dialog` directly.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ConfirmComponent {
 *   readonly data = inject<ConfirmData>(WR_DIALOG_DATA);
 * }
 * ```
 */
export const WR_DIALOG_DATA = DIALOG_DATA;
