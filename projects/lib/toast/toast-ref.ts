/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastConfig } from './types';

/**
 * Handle returned by `WrToastService.show()`. Call `dismiss()` to remove
 * the toast early. Read `id` to track it.
 */
export class WrToastRef {
  constructor(
    readonly id: number,
    readonly config: WrToastConfig,
    private readonly onDismiss: (id: number) => void
  ) {}

  /** Remove this toast from the stack. */
  dismiss(): void {
    this.onDismiss(this.id);
  }
}
