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
 * **Prefer `inject(WrDialogRef)`** — the ref is provided under the class token
 * too, and the class path is the documented one. It already covers both cases
 * you might reach for a token for: `inject(WrDialogRef, { optional: true })`
 * works for content that also renders outside a dialog, and
 * `inject<WrDialogRef<ConfirmComponent, boolean>>(WrDialogRef)` types the
 * generics without a cast.
 *
 * This token is the same object under a second key. It exists for the library's
 * own directives (`[wrDialogClose]`) and for swapping the provider out — a test
 * stub, say — without touching the class.
 *
 * @example
 * ```ts
 * @Component({...})
 * export class ConfirmComponent {
 *   private readonly ref = inject<WrDialogRef<ConfirmComponent, boolean>>(WrDialogRef);
 *
 *   confirm(): void {
 *     this.ref.close(true);
 *   }
 * }
 * ```
 */
export const WR_DIALOG_REF = new InjectionToken<WrDialogRef<unknown, unknown>>('WR_DIALOG_REF');
