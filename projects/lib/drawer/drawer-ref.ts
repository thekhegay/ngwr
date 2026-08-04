/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConfigurableFocusTrap } from '@angular/cdk/a11y';
import type { OverlayRef } from '@angular/cdk/overlay';
import type { ComponentRef } from '@angular/core';

import { ReplaySubject } from 'rxjs';

/**
 * Handle returned by `WrDrawerManager.open()`.
 *
 * Wraps the underlying `OverlayRef` and tracks the close result. It is also
 * provided inside the drawer's own injector, so the projected content can
 * inject it and close itself — the counterpart to `[wrDrawerClose]` when the
 * close is programmatic (after a save succeeds, say) rather than a click.
 *
 * @example
 * ```ts
 * // Caller side.
 * const ref = drawers.open<ChatComponent, boolean>(ChatComponent, { position: 'right' });
 * const result = await ref.awaitClose(); // boolean | undefined
 * ```
 *
 * @example
 * ```ts
 * // Content side — the drawer closes itself.
 * @Component({...})
 * export class ChatComponent {
 *   private readonly ref = inject(WrDrawerRef);
 *
 *   send(): void {
 *     this.store.send(this.draft());
 *     this.ref.close(true);
 *   }
 * }
 * ```
 */
export class WrDrawerRef<C, R = unknown> {
  /**
   * Emits the close result once and completes.
   *
   * A `ReplaySubject`, not a plain `Subject`, so the result survives a late
   * subscriber: content can close itself before `open()` has even returned, and
   * `awaitClose()` may be called long after the dismissal — both would otherwise
   * see only `complete` and resolve `undefined`.
   */
  readonly closed = new ReplaySubject<R | undefined>(1);

  /** @internal */
  componentRef: ComponentRef<C> | null = null;

  /** @internal */
  focusTrap: ConfigurableFocusTrap | null = null;

  /** @internal */
  previouslyFocused: HTMLElement | null = null;

  constructor(private readonly _overlayRef: OverlayRef) {}

  /** The instantiated drawer component. */
  get componentInstance(): C {
    if (!this.componentRef) {
      throw new Error('WrDrawerRef: component not yet attached');
    }
    return this.componentRef.instance;
  }

  private isClosed = false;

  /** Close the drawer, optionally returning a result. */
  close(result?: R): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.closed.next(result);
    this.closed.complete();
    // Content that closes itself while constructing gets here with
    // `OverlayRef.attach()` still on the stack — `componentRef` is assigned
    // only once attach returns. Disposing mid-attach leaves the CDK writing to
    // a detached host, so let the current task finish first.
    if (!this.componentRef) {
      queueMicrotask(() => this.teardown());
      return;
    }
    this.teardown();
  }

  private teardown(): void {
    this.focusTrap?.destroy();
    this.focusTrap = null;
    const restore = this.previouslyFocused;
    this.previouslyFocused = null;
    this._overlayRef.dispose();
    // Drop the destroyed component so a retained ref doesn't pin its instance,
    // host element and view in memory.
    this.componentRef = null;
    // Restore focus after disposal so the trigger is reachable again.
    if (restore && typeof restore.focus === 'function') {
      restore.focus();
    }
  }

  /** Resolves with the close result when the drawer is dismissed. */
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
