/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ComponentType } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  ViewContainerRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  runInInjectionContext,
  untracked,
  viewChild,
} from '@angular/core';

import { WrStorage } from 'ngwr/storage';

import { WrWindowManager } from './services/window-manager';
import { storageKey } from './storage-key';
import type { WrWindowConfig } from './types';
import { WrWindow } from './window';
import type { WrWindowRef } from './window-ref';

/** Coalesce live position/size writes — drag/resize fires every move. */
const PERSIST_DEBOUNCE_MS = 200;

/** What `storage` keeps — the geometry the user chose, never what a state imposes. @internal */
export interface PersistedGeometry {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

/**
 * Internal host attached by `WrWindowManager.open()`. Draws a `<wr-window>` for
 * the ref's model, creates the consumer's component inside its body, and wires
 * the DOM-only parts of the ref — focus and keyboard mode — once it is on the
 * page. State and geometry need no wiring: the ref reads the model directly.
 *
 * @internal
 */
@Component({
  selector: 'wr-window-container',
  templateUrl: './window-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrWindow],
})
export class WrWindowContainer<C> {
  /** Set by the manager before view init. */
  config!: WrWindowConfig;
  /** Set by the manager before view init. */
  ref!: WrWindowRef<C, unknown>;
  /** Set by the manager before view init. */
  componentType!: ComponentType<C>;
  /** Custom injector with `WR_WINDOW_REF` / `WR_WINDOW_DATA` populated. */
  childInjector!: Injector;
  /** Set by the manager: move focus into the window once it has rendered. */
  autoFocus = true;

  private readonly hostInjector = inject(Injector);
  private readonly manager = inject(WrWindowManager);
  private readonly storage = inject(WrStorage);
  private readonly destroyRef = inject(DestroyRef);
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly contentVcr = viewChild.required('content', { read: ViewContainerRef });
  private readonly wrWindow = viewChild.required(WrWindow);

  constructor() {
    afterNextRender(() => this.attach());

    // Re-clamp when the WORK AREA changes — a resized viewport, a taskbar
    // appearing — and only then. It used to re-run on every geometry write,
    // repeating the clamp the drag handler had just done on each pointer move.
    effect(() => {
      const model = this.ref._model;
      model.workArea();
      untracked(() => model.clamp());
    });

    this.destroyRef.onDestroy(() => {
      if (this.persistTimer !== null) clearTimeout(this.persistTimer);
    });
  }

  private attach(): void {
    // 1. Create the consumer's component inside the body slot.
    const componentRef = this.contentVcr().createComponent(this.componentType, {
      injector: this.childInjector,
    });
    this.ref.componentRef = componentRef;

    // 2. The DOM-only bridges. After a render, not now: the consumer's
    //    component was created a line above and has not drawn its template yet,
    //    and a window coming back from the taskbar is still `display: none`
    //    until its class updates.
    const w = this.wrWindow();
    const model = this.ref._model;
    this.ref._focusWindow = mode =>
      afterNextRender(
        () => {
          if (mode === 'initial') {
            w.focusInitial();
            return;
          }
          // Only for the window that is STILL the one switched to: two
          // activations in one tick each queue a focus, and the earlier one,
          // landing last, took the keyboard back from the window the user
          // actually ended on.
          if (this.manager.active() === (this.ref as WrWindowRef<unknown, unknown>)) w.focusLast();
        },
        { injector: this.hostInjector }
      );
    this.ref._startKeyboard = mode => {
      if (model.state() !== 'minimized') {
        w.startKeyboard(mode);
        return;
      }
      model.unminimize();
      afterNextRender(() => w.startKeyboard(mode), { injector: this.hostInjector });
    };
    model.onMinimizedWithFocus = () => this.onMinimizedWithFocus();
    // A ref outlives its window; a render hook must not be registered on an
    // injector that is gone.
    this.destroyRef.onDestroy(() => {
      this.ref._focusWindow = null;
      this.ref._startKeyboard = null;
      model.onMinimizedWithFocus = null;
    });

    // 3. Storage — hydration happened at open, as the initial geometry; from
    //    here on, save as the geometry changes.
    if (this.config.storage) this.installAutosave();

    // 4. Focus — never into a window that opened straight into the taskbar.
    if (this.autoFocus && model.state() !== 'minimized') this.ref._focusWindow('initial');

    // 5. A keyboard mode asked for before the window was on the page.
    const pending = this.ref._pendingKeyboard;
    if (pending) {
      this.ref._pendingKeyboard = null;
      this.ref._startKeyboard(pending);
    }
  }

  /** The window was minimized while it held focus: hand focus to its taskbar tab. */
  private onMinimizedWithFocus(): void {
    // After the render that lists the window in the taskbar.
    afterNextRender(() => this.manager._focusAfterMinimize(this.ref as WrWindowRef<unknown, unknown>), {
      injector: this.hostInjector,
    });
  }

  /** Persist geometry whenever it changes, debounced. */
  private installAutosave(): void {
    const cfg = this.config.storage;
    if (!cfg) return;
    const persist = cfg.persist ?? 'all';
    const key = storageKey(cfg);
    const model = this.ref._model;

    runInInjectionContext(this.hostInjector, () => {
      effect(() => {
        // The raw geometry: what a maximized or snapped window goes back to,
        // and so what the user chose.
        const x = model.x();
        const y = model.y();
        const width = model.width();
        const height = model.height();

        if (this.persistTimer !== null) clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
          this.persistTimer = null;
          const payload: PersistedGeometry = {
            ...(persist !== 'size' ? { x, y } : {}),
            ...(persist !== 'position' ? { width, height } : {}),
          };
          this.storage.set(key, payload);
        }, PERSIST_DEBOUNCE_MS);
      });
    });
  }
}
