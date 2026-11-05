/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { ConfigurableFocusTrap } from '@angular/cdk/a11y';
import type { OverlayRef } from '@angular/cdk/overlay';
import { type ComponentRef, type EffectRef, type Injector, type Signal, effect, untracked } from '@angular/core';

import { ReplaySubject } from 'rxjs';

/**
 * Handle returned by `WrDialog.open()`.
 *
 * Wraps the underlying `OverlayRef` and tracks the close result. It is also
 * provided inside the dialog's own injector, so the projected content can
 * inject it and close itself — the counterpart to `[wrDialogClose]` when the
 * close is programmatic (after a save succeeds, say) rather than a click.
 *
 * @example
 * ```ts
 * // Caller side.
 * const ref = dialog.open<ConfirmComponent, boolean>(ConfirmComponent);
 * const result = await ref.awaitClose(); // boolean | undefined
 * ```
 *
 * @example
 * ```ts
 * // Content side — the dialog closes itself.
 * @Component({...})
 * export class ConfirmComponent {
 *   private readonly ref = inject(WrDialogRef);
 *
 *   save(): void {
 *     this.store.save();
 *     this.ref.close(true);
 *   }
 * }
 * ```
 */
export class WrDialogRef<C, R = unknown> {
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

  private readonly watchers: EffectRef[] = [];

  /**
   * @param _overlayRef the overlay the dialog is mounted in.
   * @param injector what `closeWhen()` runs its watcher in. `WrDialog.open()`
   *   passes the root injector; a ref built without one cannot watch.
   */
  constructor(
    private readonly _overlayRef: OverlayRef,
    private readonly injector?: Injector
  ) {}

  /** The instantiated dialog component. */
  get componentInstance(): C {
    if (!this.componentRef) {
      throw new Error('WrDialogRef: component not yet attached');
    }
    return this.componentRef.instance;
  }

  private isClosed = false;

  /** Close the dialog, optionally returning a result. */
  close(result?: R): void {
    if (this.isClosed) return;
    this.isClosed = true;
    for (const watcher of this.watchers.splice(0)) watcher.destroy();
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

  /**
   * Close the dialog once `source` reads `true`, with `result` - `undefined`
   * when omitted, which is what every dismissal closes with. A source that is
   * already `true` closes it on the next change detection, after the attach
   * has finished.
   *
   * The watcher belongs to the dialog: it runs in the root injector, so the
   * caller needs no injection context, and it is destroyed when the dialog
   * closes by any path, so a source that turns `true` later does nothing. Each
   * call adds a watcher; the first to fire closes. A closed dialog ignores the
   * call.
   *
   * @example
   * ```ts
   * const saved = computed(() => this.save.status() === 'resolved');
   * this.dialog.open(SavingComponent).closeWhen(saved, 'saved');
   * ```
   */
  closeWhen(source: Signal<boolean>, result?: R): void {
    if (this.isClosed) return;
    if (!this.injector) {
      throw new Error('WrDialogRef: closeWhen() needs a ref opened by WrDialog, which carries the injector');
    }
    this.watchers.push(
      effect(
        () => {
          if (source()) untracked(() => this.close(result));
        },
        { injector: this.injector }
      )
    );
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
