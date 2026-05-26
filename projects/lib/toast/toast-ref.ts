/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastOptions } from './types';

/**
 * Handle returned by `WrToastService.show()`. Call `dismiss()` to remove
 * the toast early. Inspect `options` to see what the caller requested.
 */
export class WrToastRef {
  constructor(
    public readonly id: number,
    public readonly options: WrToastOptions,
    private readonly onDismiss: (id: number) => void
  ) {}

  /** Remove this toast from the stack. */
  dismiss(): void {
    this.onDismiss(this.id);
  }
}
