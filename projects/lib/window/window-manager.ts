/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import {
  EnvironmentInjector,
  Injector,
  PLATFORM_ID,
  Service,
  type Signal,
  computed,
  inject,
  signal,
} from '@angular/core';

import { WR_OVERLAY } from 'ngwr/overlay';
import { WrStorage } from 'ngwr/storage';

const MODAL_BACKDROP_CLASS = 'wr-window-backdrop';
const MODAL_PANEL_CLASS = 'wr-window-overlay--modal';

import { WR_WINDOW_DATA, WR_WINDOW_REF } from './tokens';
import type { WrWindowConfig, WrWindowStorageConfig } from './types';
import { WrWindowContainer } from './window-container';
import { WrWindowRef } from './window-ref';

function storageKey(cfg: WrWindowStorageConfig): string {
  const prefix = cfg.prefix ? `${cfg.prefix}:` : '';
  return `wr:window:${prefix}${cfg.key}`;
}

let uid = 0;

/**
 * Owns the open `<wr-window>` stack, hands out z-indexes, cascades the
 * default spawn position, and opens programmatic windows that wrap a
 * consumer component.
 *
 * Inject the singleton and call `open(component, config)` for a
 * dialog-style flow:
 *
 * ```ts
 * const manager = inject(WrWindowManager);
 *
 * const ref = manager.open(EditorComponent, {
 *   title: 'Untitled.md',
 *   size: 'lg',
 *   storage: { key: 'editor', prefix: 'my-app' },
 * });
 *
 * const saved = await ref.afterClosed();
 * ```
 *
 * Declarative `<wr-window [(open)]="...">` instances also register with
 * the manager on focus, so both styles share the same stack ordering.
 */
@Service()
export class WrWindowManager {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly storage = inject(WrStorage);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly baseZ = 1000;
  private topZ = this.baseZ;
  private openCount = 0;

  /** All open windows opened via `open()` — declarative `<wr-window>` is not tracked here. */
  private readonly _windows = signal<readonly WrWindowRef<unknown, unknown>[]>([]);

  /** All currently-open programmatic windows. */
  readonly windows: Signal<readonly WrWindowRef<unknown, unknown>[]> = this._windows.asReadonly();

  /** Programmatic windows that are minimized AND opted into the taskbar. */
  readonly minimized = computed(() =>
    this._windows().filter(w => w.taskbarVisible && w.state() === 'minimized'),
  );

  /** Reserve the next z-index. Strictly increasing across the app's lifetime. */
  bringToFront(): number {
    this.topZ += 1;
    return this.topZ;
  }

  /** Cascade offset for new windows, so two opens don't perfectly overlap. */
  nextStartOffset(): { readonly x: number; readonly y: number } {
    const offset = (this.openCount % 10) * 30;
    this.openCount += 1;
    return { x: 50 + offset, y: 50 + offset };
  }

  /**
   * Open a window with `component` rendered as its body. Returns a ref
   * the caller can use to drive the window programmatically and await
   * its result.
   */
  open<C, R = unknown, D = unknown>(
    component: ComponentType<C>,
    config: WrWindowConfig<D> = {},
  ): WrWindowRef<C, R> {
    // Each window gets its own CDK overlay pane positioned `static` —
    // <wr-window> itself uses `position: fixed`, so the pane is only a
    // mount point. Modal mode adds a backdrop and traps focus.
    const isModal = config.modal === true;
    const panelClasses: string[] = ['wr-window-overlay'];
    if (isModal) panelClasses.push(MODAL_PANEL_CLASS);

    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      panelClass: panelClasses,
      hasBackdrop: isModal,
      backdropClass: MODAL_BACKDROP_CLASS,
    });

    const id = config.id ?? `wr-window-${++uid}`;
    const ref = new WrWindowRef<C, R>(id, overlayRef);
    ref.taskbarVisible = config.taskbar !== false;

    // Remember the prior focus owner so modal windows can restore it.
    if (this.isBrowser) {
      const active = document.activeElement;
      ref.previouslyFocused = active instanceof HTMLElement ? active : null;
    }

    // Provide WR_WINDOW_REF + WR_WINDOW_DATA inside the projected
    // component's subtree so it can `inject(WR_WINDOW_REF)` etc.
    const childInjector = Injector.create({
      parent: this.parentInjector,
      providers: [
        { provide: WR_WINDOW_REF, useValue: ref },
        { provide: WR_WINDOW_DATA, useValue: config.data ?? null },
      ],
    });

    const portal = new ComponentPortal<WrWindowContainer<C>>(WrWindowContainer);
    const containerRef = overlayRef.attach(portal);
    const container = containerRef.instance;
    container.config = config as WrWindowConfig;
    container.ref = ref as WrWindowRef<C, unknown>;
    container.componentType = component;
    container.childInjector = childInjector;

    if (this.isBrowser) {
      const host = overlayRef.overlayElement;
      host.setAttribute('role', 'dialog');
      if (isModal) host.setAttribute('aria-modal', 'true');

      if (isModal) {
        const trap = this.focusTrapFactory.create(host);
        void trap.focusInitialElementWhenReady();
        // Tear the trap down when the overlay disposes.
        overlayRef.detachments().subscribe(() => trap.destroy());
      }
    }

    if (config.modal && config.closeOnBackdrop !== false) {
      overlayRef.backdropClick().subscribe(() => void ref.close());
    }
    if (config.closeOnEscape !== false) {
      overlayRef.keydownEvents().subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          void ref.close();
        }
      });
    }

    // Wire close → disposal + completion of the result subject. The
    // ref's `close()` already runs the beforeClose hook before reaching
    // this bridge.
    ref._doClose = (result) => {
      overlayRef.dispose();
      ref._closed.next(result);
      ref._closed.complete();
      this._windows.update(list => list.filter(r => r !== (ref as unknown as WrWindowRef<unknown, unknown>)));
      const restore = ref.previouslyFocused;
      ref.previouslyFocused = null;
      if (restore && typeof restore.focus === 'function') restore.focus();
    };

    this._windows.update(list => [...list, ref as unknown as WrWindowRef<unknown, unknown>]);
    return ref;
  }

  /** Close every programmatically-opened window. */
  closeAll(): void {
    for (const ref of [...this._windows()]) {
      void ref.close();
    }
  }

  /**
   * Drop the persisted geometry for a window so the next open uses the
   * config defaults again. Matches `WrWindowConfig.storage` exactly.
   */
  clearPersistedPosition(cfg: WrWindowStorageConfig): void {
    this.storage.remove(storageKey(cfg));
  }
}
