/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken } from '@angular/core';

import type { WrDialogRef } from '../dialog-ref';

/**
 * Token exposing the open dialog's `WrDialogRef` to components and
 * directives rendered inside it (e.g. `[wrDialogClose]`).
 *
 * `WrDialogRef` is provided as its own token too, so `inject(WrDialogRef)`
 * is the shorter path. Reach for this token when you want the ref typed
 * without a cast, or when the component also renders outside a dialog and
 * needs `{ optional: true }`.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ConfirmComponent {
 *   private readonly ref = inject<WrDialogRef<ConfirmComponent, boolean>>(WR_DIALOG_REF);
 *
 *   confirm(): void {
 *     this.ref.close(true);
 *   }
 * }
 * ```
 */
export const WR_DIALOG_REF = new InjectionToken<WrDialogRef<unknown, unknown>>('WR_DIALOG_REF');
