/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConfigurableFocusTrap } from '@angular/cdk/a11y';
import type { OverlayRef } from '@angular/cdk/overlay';
import type { ComponentRef } from '@angular/core';

import { Subject } from 'rxjs';

/**
 * Handle returned by `WrDialog.open()`.
 *
 * Wraps the underlying `OverlayRef` and tracks the close result.
 *
 * @example
 * ```ts
 * const ref = dialog.open<ConfirmComponent, boolean>(ConfirmComponent);
 * const result = await ref.awaitClose(); // boolean | undefined
 * ```
 */
export class WrDialogRef<C, R = unknown> {
  /** Emits the close result once and completes. */
  readonly closed = new Subject<R | undefined>();

  /** @internal */
  componentRef: ComponentRef<C> | null = null;

  /** @internal */
  focusTrap: ConfigurableFocusTrap | null = null;

  /** @internal */
  previouslyFocused: HTMLElement | null = null;

  constructor(private readonly _overlayRef: OverlayRef) {}

  /** The instantiated dialog component. */
  get componentInstance(): C {
    if (!this.componentRef) {
      throw new Error('WrDialogRef: component not yet attached');
    }
    return this.componentRef.instance;
  }

  /** Close the dialog, optionally returning a result. */
  close(result?: R): void {
    this.closed.next(result);
    this.closed.complete();
    this.focusTrap?.destroy();
    this.focusTrap = null;
    const restore = this.previouslyFocused;
    this.previouslyFocused = null;
    this._overlayRef.dispose();
    // Restore focus after disposal so the trigger is reachable again.
    if (restore && typeof restore.focus === 'function') {
      restore.focus();
    }
  }

  /** Resolves with the close result when the dialog is dismissed. */
  awaitClose(): Promise<R | undefined> {
    return new Promise(resolve => {
      this.closed.subscribe({
        next: value => resolve(value),
        complete: () => resolve(undefined),
      });
    });
  }

  /** Underlying overlay ref — escape hatch for advanced cases. */
  get overlayRef(): OverlayRef {
    return this._overlayRef;
  }
}
