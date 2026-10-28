/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { OverlayRef } from '@angular/cdk/overlay';
import { type ComponentRef, type Signal, computed, signal } from '@angular/core';

import { type Observable, ReplaySubject, type Subject } from 'rxjs';

import type { WrWindowBeforeCloseHook, WrWindowSnapTarget, WrWindowState, WrWindowUpdate } from './types';
import { type WrWindowKeyboardMode, WrWindowModel, readViewport, resolveOptions } from './window-model';

/**
 * What a ref needs from the manager that opened it.
 *
 * @internal
 */
export interface WrWindowRefHost {
  /** Raise the window, mark it active and, unless told otherwise, move focus into it. */
  _activate(ref: WrWindowRef<unknown, unknown>, options?: { readonly focus?: boolean }): void;
  /** Raise the window without touching focus. */
  _raise(ref: WrWindowRef<unknown, unknown>): void;
}

/**
 * Handle returned by `WrWindowManager.open()`.
 *
 * Wraps the underlying overlay, exposes signals for the live geometry,
 * and gives the consumer programmatic control over the window
 * (focus, move, resize, minimize, maximize, close).
 *
 * Every signal is right from the moment `open()` returns, and every call works
 * from then on too — including from the body component's constructor.
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

  /**
   * @internal — emits the close result once and completes.
   *
   * A `ReplaySubject`, not a plain `Subject`, so the result survives a late
   * subscriber — the same reasoning `WrDialogRef` already carries. A caller
   * that holds the ref and awaits `afterClosed()` after any intervening
   * `await` subscribes to an already-completed stream, and a plain Subject
   * hands it nothing but `complete`: the promise resolved `undefined` and a
   * saved result was indistinguishable from a dismissal.
   */
  readonly _closed = new ReplaySubject<R | undefined>(1);

  /** @internal — the window's state and geometry; the signals below read through it. */
  readonly _model: WrWindowModel;

  /** @internal — emits whenever the state changes; `stateChanges` is its public face. */
  readonly _stateChanged: Subject<WrWindowState>;

  /** @internal — set by the container right after attach. */
  componentRef: ComponentRef<C> | null = null;

  /** @internal — whether this window opts into the taskbar list. */
  taskbarVisible = true;

  /** @internal — the manager that opened the window. */
  _host: WrWindowRefHost | null = null;

  /** @internal — close the overlay and settle the result; wired by the manager. */
  _doClose: ((result: R | undefined) => void) | null = null;

  /**
   * @internal — move focus into the window after the next render: to the control
   * it had last (`'last'`, falling back to the first one) or to the first one.
   * Wired by the container once the window is on the page.
   */
  _focusWindow: ((mode: 'initial' | 'last') => void) | null = null;

  /** @internal — enter keyboard move / resize; wired by the container. */
  _startKeyboard: ((mode: WrWindowKeyboardMode) => void) | null = null;

  /** @internal — a keyboard mode asked for before the window was on the page. */
  _pendingKeyboard: WrWindowKeyboardMode | null = null;

  /**
   * @internal — what had focus when `open()` was called, and where closing the
   * window sends it back. `null` when focus was on nothing.
   */
  _returnFocus: HTMLElement | null = null;

  /** Window state. A snapped window is `normal`; read {@link snap} for which half. */
  readonly state: Signal<WrWindowState>;
  /** Left edge on screen, in px — the work area's while maximized. */
  readonly x: Signal<number>;
  /** Top edge on screen, in px. */
  readonly y: Signal<number>;
  /** Width on screen, in px. */
  readonly width: Signal<number>;
  /** Height on screen, in px. */
  readonly height: Signal<number>;
  /** Stack z-index. */
  readonly z: Signal<number>;
  /** Live title. */
  readonly title: Signal<string>;
  /** The half or quarter the window is snapped to, or `null` (since v15.1). Maximized reads `null`. */
  readonly snap: Signal<WrWindowSnapTarget | null>;
  /** Whether this is the active window — the one that has the keyboard (since v15.1). */
  readonly isActive: Signal<boolean>;

  /** Emits the close result once, then completes — the stream `WrDialogRef.closed` is (since v15.1). */
  readonly closed: Observable<R | undefined>;
  /**
   * Emits where the user moved the window: once when a title-bar drag or a
   * keyboard move ends, and when a drag snaps it. Calls from code are silent —
   * the caller knows where it put the window (since v15.1).
   */
  readonly moved: Observable<{ readonly x: number; readonly y: number }>;
  /**
   * Emits the size the user gave the window: once when an edge drag or a
   * keyboard resize ends, and when a drag snaps it to a half or a quarter.
   * Calls from code are silent (since v15.1).
   */
  readonly resized: Observable<{ readonly width: number; readonly height: number }>;
  /** Emits every state change, from the user or from code (since v15.1). */
  readonly stateChanges: Observable<WrWindowState>;

  // Hooks
  private _beforeCloseHook: WrWindowBeforeCloseHook<R> | null = null;

  /**
   * A ref built by hand — a test double for `WR_WINDOW_REF`. It answers every
   * call with a window of its own that nothing renders.
   */
  constructor(id: string, _overlayRef: OverlayRef);
  /** @internal The manager's form: the window's model, built before anything renders. */
  constructor(id: string, _overlayRef: OverlayRef, model: WrWindowModel);
  constructor(
    id: string,
    public readonly _overlayRef: OverlayRef,
    model?: WrWindowModel
  ) {
    this.id = id;
    // A ref built by hand — a test double for `WR_WINDOW_REF` — still answers.
    const m =
      model ??
      new WrWindowModel({
        options: resolveOptions({}),
        workArea: signal({ left: 0, top: 0, ...readViewport() }),
      });
    this._model = m;
    this._stateChanged = m.stateChanges;
    this.state = m.state.asReadonly();
    this.x = computed(() => m.rect().left);
    this.y = computed(() => m.rect().top);
    this.width = computed(() => m.rect().width);
    this.height = computed(() => m.rect().height);
    this.z = m.z.asReadonly();
    this.title = m.title.asReadonly();
    this.snap = m.snap.asReadonly();
    this.isActive = m.isActive.asReadonly();
    this.closed = this._closed.asObservable();
    this.moved = m.moved.asObservable();
    this.resized = m.resized.asObservable();
    this.stateChanges = m.stateChanges.asObservable();
  }

  /** Resolved instance of the projected component. */
  get componentInstance(): C {
    if (!this.componentRef) {
      throw new Error('WrWindowRef: component not yet attached');
    }
    return this.componentRef.instance;
  }

  // Lifecycle

  private isClosed = false;

  /**
   * Close the window, optionally returning a result. If a `beforeClose`
   * hook is registered it is consulted first — a falsy resolution
   * cancels the close.
   */
  async close(result?: R): Promise<void> {
    // `WrDialogRef` / `WrDrawerRef` latch the same way on their own `isClosed`,
    // but theirs are synchronous: this is the only one of the three that AWAITS,
    // so it is the
    // only one a second call can enter mid-flight and run the hook again. Two
    // Escapes in a row do it, and so does `manager.closeAll()` while a hook is
    // pending — `_doClose` is what removes the ref from the manager's list, and
    // it has not run yet.
    if (this.isClosed) return;
    this.isClosed = true;

    let proceed = false;
    try {
      proceed = this._beforeCloseHook ? !!(await this._beforeCloseHook(result)) : true;
    } finally {
      // A veto is not a close, and neither is a hook that threw — release the
      // latch in both cases, or a declined close would disable the window for
      // good.
      if (!proceed) this.isClosed = false;
    }

    if (proceed) this._doClose?.(result);
  }

  /** Toggle the minimized state. Leaving it returns to the state it was minimized from. */
  minimize(): void {
    this._model.minimize();
  }

  /** Toggle the maximized state. Restoring down returns to where the window was, a snapped half included. */
  maximize(): void {
    this._model.maximize();
  }

  /** Back to `normal` at the window's own geometry — from minimized, maximized or snapped. */
  restore(): void {
    this._model.restore();
  }

  /**
   * Bring this window to the top of the stack. Only RAISES it: focus stays
   * where it is. Use {@link activate} to switch to the window.
   */
  focus(): void {
    this._host?._raise(this as WrWindowRef<unknown, unknown>);
  }

  /**
   * Switch to the window: bring it back from the taskbar if it is minimized,
   * raise it, make it the active window, and move focus to the control it had
   * last (its first control when it never had one) (since v15.1).
   */
  activate(): void {
    if (this._host) this._host._activate(this as WrWindowRef<unknown, unknown>);
    else this._model.unminimize();
  }

  // Programmatic geometry

  /**
   * Move the window to `(x, y)`, held to the work area while `keepInViewport`.
   * While maximized it moves the geometry restore lands on; a snapped window
   * leaves the snap.
   */
  moveTo(x: number, y: number): void {
    this._model.moveTo(x, y);
  }

  /** Resize the window, held to `minWidth`…`maxWidth` and `minHeight`…`maxHeight`. */
  resizeTo(width: number, height: number): void {
    this._model.resizeTo(width, height);
  }

  /** Re-position the window so it sits centered in its work area. */
  center(): void {
    this._model.center();
  }

  /** Snap to a half or a quarter of the work area; `'top'` maximizes, `null` un-snaps (since v15.1). */
  snapTo(target: WrWindowSnapTarget | null): void {
    this._model.snapTo(target);
  }

  /** Update the title-bar text, and with it the window's accessible name. */
  setTitle(title: string): void {
    this._model.title.set(title);
  }

  /**
   * Change options on an open window — lock it while it saves, take its close
   * button away while a task runs. New bounds re-clamp its current size
   * (since v15.1).
   */
  update(patch: WrWindowUpdate): void {
    this._model.update(patch);
  }

  /**
   * Move the window from the keyboard: the arrow keys step it, Shift by one
   * pixel, Enter keeps the result and Escape puts it back. Moves focus into the
   * window so the keys arrive. Bind it to a menu item or a button to offer
   * moving without a drag (since v15.1).
   */
  startMove(): void {
    this.startKeyboard('move');
  }

  /** Resize the window from the keyboard, the same way as {@link startMove} (since v15.1). */
  startResize(): void {
    this.startKeyboard('resize');
  }

  private startKeyboard(mode: WrWindowKeyboardMode): void {
    if (this._startKeyboard) this._startKeyboard(mode);
    else this._pendingKeyboard = mode;
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

  /** The same promise as {@link afterClosed}, under the name `WrDialogRef` uses (since v15.1). */
  awaitClose(): Promise<R | undefined> {
    return this.afterClosed();
  }

  /** Escape hatch — the underlying CDK overlay ref. */
  get overlayRef(): OverlayRef {
    return this._overlayRef;
  }
}

export type { WrWindowBeforeCloseHook } from './types';
