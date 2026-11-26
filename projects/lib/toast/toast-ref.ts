/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrToastOptions, WrToastUpdate } from './types';

/**
 * Handle returned by `WrToast.show()`. Call `update()` to change the toast in
 * place and `dismiss()` to remove it early. `options` is what the toast shows
 * now.
 */
export class WrToastRef {
  private current: WrToastOptions;

  constructor(
    public readonly id: number,
    options: WrToastOptions,
    private readonly onDismiss: (id: number) => void,
    private readonly onUpdate: (id: number, patch: WrToastUpdate) => boolean = () => false
  ) {
    this.current = options;
  }

  /** The options of the toast, with every `update()` applied. */
  get options(): WrToastOptions {
    return this.current;
  }

  /**
   * Change the toast in place: it keeps its place in the stack and its
   * countdown starts again. Does nothing once the toast is gone.
   */
  update(patch: WrToastUpdate): void {
    if (this.onUpdate(this.id, patch)) this.current = { ...this.current, ...patch };
  }

  /** Remove this toast from the stack. */
  dismiss(): void {
    this.onDismiss(this.id);
  }
}
