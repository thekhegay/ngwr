/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { OverlayRef } from '@angular/cdk/overlay';
import { type ComponentRef, type Signal, type WritableSignal, signal } from '@angular/core';

import { Subject } from 'rxjs';

import type { WrWindowState } from './interfaces';

/** Hook signature for `WrWindowRef.beforeClose()`. Return falsy to veto. */
export type WrWindowBeforeCloseHook<R> = (result: R | undefined) => boolean | Promise<boolean>;

/**
 * Handle returned by `WrWindowManager.open()`.
 *
 * Wraps the underlying overlay, exposes signals for the live geometry,
 * and gives the consumer programmatic control over the window
 * (focus, move, resize, minimize, maximize, close).
 *
 * @example
 * ```ts
 * const ref = manager.open(EditorComponent, {
 *   title: 'Untitled.md',
 *   storage: { key: 'editor', prefix: 'app' },
 * });
 *
 * ref.beforeClose(async () => {
 *   if (!isDirty) return true;
 *   return await confirmDiscard();
 * });
 *
 * const saved = await ref.afterClosed(); // resolves with whatever the
 *                                        // component passed to ref.close(value)
 * ```
 */
export class WrWindowRef<C, R = unknown> {
  /** Stable id — used by the taskbar, workspace save, and DI. */
  readonly id: string;

  /** @internal — emits the close result once and completes. */
  readonly _closed = new Subject<R | undefined>();

  /** @internal — emits whenever the visual state changes. */
  readonly _stateChanged = new Subject<WrWindowState>();

  /** @internal — set by the container right after attach. */
  componentRef: ComponentRef<C> | null = null;

  /** @internal — whether this window opts into the taskbar list. */
  taskbarVisible = true;

  /**
   * @internal — non-`normal` state to apply right after the container
   * wires its bridges (so `restoreLayout` can land a window straight
   * into `minimized` / `maximized` even though it just opened).
   */
  pendingStateOnMount: WrWindowState | null = null;

  // Live geometry signals (writable internally, exposed read-only)
  /** @internal */ readonly _state: WritableSignal<WrWindowState> = signal('normal');
  /** @internal */ readonly _x = signal(0);
  /** @internal */ readonly _y = signal(0);
  /** @internal */ readonly _width = signal(0);
  /** @internal */ readonly _height = signal(0);
  /** @internal */ readonly _z = signal(0);
  /** @internal */ readonly _title: WritableSignal<string> = signal('');

  /** Window state. */
  readonly state: Signal<WrWindowState> = this._state.asReadonly();
  /** Live X. */
  readonly x: Signal<number> = this._x.asReadonly();
  /** Live Y. */
  readonly y: Signal<number> = this._y.asReadonly();
  /** Live width. */
  readonly width: Signal<number> = this._width.asReadonly();
  /** Live height. */
  readonly height: Signal<number> = this._height.asReadonly();
  /** Stack z-index. */
  readonly z: Signal<number> = this._z.asReadonly();
  /** Live title. */
  readonly title: Signal<string> = this._title.asReadonly();

  // Hooks
  private _beforeCloseHook: WrWindowBeforeCloseHook<R> | null = null;

  // Imperative bridges — wired by the manager / container after attach
  /** @internal */ _doClose: ((result: R | undefined) => void) | null = null;
  /** @internal */ _doMinimize: (() => void) | null = null;
  /** @internal */ _doMaximize: (() => void) | null = null;
  /** @internal */ _doRestore: (() => void) | null = null;
  /** @internal */ _doFocus: (() => void) | null = null;
  /** @internal */ _doMoveTo: ((x: number, y: number) => void) | null = null;
  /** @internal */ _doResizeTo: ((w: number, h: number) => void) | null = null;
  /** @internal */ _doCenter: (() => void) | null = null;
  /** @internal */ _doSetTitle: ((title: string) => void) | null = null;

  constructor(
    id: string,
    public readonly _overlayRef: OverlayRef
  ) {
    this.id = id;
  }

  /** Resolved instance of the projected component. */
  get componentInstance(): C {
    if (!this.componentRef) {
      throw new Error('WrWindowRef: component not yet attached');
    }
    return this.componentRef.instance;
  }

  // Lifecycle

  /**
   * Close the window, optionally returning a result. If a `beforeClose`
   * hook is registered it is consulted first — a falsy resolution
   * cancels the close.
   */
  async close(result?: R): Promise<void> {
    if (this._beforeCloseHook) {
      const ok = await this._beforeCloseHook(result);
      if (!ok) return;
    }
    this._doClose?.(result);
  }

  /** Toggle the minimized state. */
  minimize(): void {
    this._doMinimize?.();
  }

  /** Toggle the maximized state. */
  maximize(): void {
    this._doMaximize?.();
  }

  /** Force-restore from minimized / maximized to `normal`. */
  restore(): void {
    this._doRestore?.();
  }

  /** Bring this window to the top of the stack. */
  focus(): void {
    this._doFocus?.();
  }

  // Programmatic geometry

  moveTo(x: number, y: number): void {
    this._doMoveTo?.(x, y);
  }

  resizeTo(width: number, height: number): void {
    this._doResizeTo?.(width, height);
  }

  /** Re-position the window so it sits centered in the current viewport. */
  center(): void {
    this._doCenter?.();
  }

  setTitle(title: string): void {
    this._doSetTitle?.(title);
  }

  // Hooks

  /**
   * Register a guard that runs before `close()`. Return `false` (or a
   * Promise resolving to false) to veto. Only one hook per ref —
   * subsequent calls replace the previous.
   */
  beforeClose(hook: WrWindowBeforeCloseHook<R>): void {
    this._beforeCloseHook = hook;
  }

  /** Resolves with the result passed to `close()` (or `undefined`). */
  afterClosed(): Promise<R | undefined> {
    return new Promise(resolve => {
      this._closed.subscribe({
        next: value => resolve(value),
        complete: () => resolve(undefined),
      });
    });
  }

  /** Escape hatch — the underlying CDK overlay ref. */
  get overlayRef(): OverlayRef {
    return this._overlayRef;
  }
}
