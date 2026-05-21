/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { DialogRef } from '@angular/cdk/dialog';

/**
 * Handle returned by `WrDialogService.open()`.
 *
 * Thin re-typing of CDK's `DialogRef`:
 * - `R` is the result type returned via `close(value)` and surfaced
 *   through `closed` / `awaitClose()`
 * - `C` is the dialog component type
 *
 * @example
 * ```ts
 * const ref = dialog.open<ConfirmComponent, boolean>(ConfirmComponent);
 * const result = await ref.awaitClose(); // boolean | undefined
 * ```
 */
export class WrDialogRef<C, R = unknown> {
  constructor(private readonly _ref: DialogRef<R, C>) {}

  /** The instantiated dialog component. */
  get componentInstance(): C {
    return this._ref.componentInstance!;
  }

  /** Close the dialog, optionally returning a result. */
  close(result?: R): void {
    this._ref.close(result);
  }

  /** Resolves with the close result when the dialog is dismissed. */
  awaitClose(): Promise<R | undefined> {
    return new Promise(resolve => {
      this._ref.closed.subscribe(value => resolve(value));
    });
  }

  /** Underlying CDK ref — escape hatch for advanced cases. */
  get cdkRef(): DialogRef<R, C> {
    return this._ref;
  }
}
