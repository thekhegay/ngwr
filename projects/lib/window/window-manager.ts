/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

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
import { randomId } from 'ngwr/utils';

import type { WrWindowConfig, WrWindowState, WrWindowStorageConfig } from './interfaces';
import { storageKey } from './storage-key';
import { WR_WINDOW_DATA, WR_WINDOW_REF } from './tokens';
import { WrWindowContainer } from './window-container';
import { WrWindowRef } from './window-ref';

interface RestoreSnapshot {
  readonly id: string;
  readonly state: WrWindowState;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: string;
}

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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly baseZ = 1000;
  private topZ = this.baseZ;
  private openCount = 0;

  /** All open windows opened via `open()` — declarative `<wr-window>` is not tracked here. */
  private readonly _windows = signal<readonly WrWindowRef<unknown, unknown>[]>([]);

  /**
   * Filled by `restoreLayout` right before it invokes the consumer's
   * opener callback. The next `open()` call with a matching `config.id`
   * pops the entry and uses it as the initial geometry (so the seed
   * lands at the saved coords instead of the cascade default) and
   * applies any non-`normal` state after the bridges are wired.
   */
  private readonly pendingRestores = new Map<string, RestoreSnapshot>();

  /** All currently-open programmatic windows. */
  readonly windows: Signal<readonly WrWindowRef<unknown, unknown>[]> = this._windows.asReadonly();

  /** Programmatic windows that are minimized AND opted into the taskbar. */
  readonly minimized = computed(() => this._windows().filter(w => w.taskbarVisible && w.state() === 'minimized'));

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
   *
   * **Singleton by id** — if `config.id` is set and a window with that
   * id is already open, the existing ref is restored (if minimized),
   * brought to the front, and returned. No duplicate window is
   * created. Use this to coalesce repeated open() calls (e.g. a
   * "Settings" menu item that should always re-focus the same window).
   */
  open<C, R = unknown, D = unknown>(component: ComponentType<C>, config: WrWindowConfig<D> = {}): WrWindowRef<C, R> {
    if (config.id) {
      const existing = this.findById(config.id);
      if (existing) {
        existing.restore();
        existing.focus();
        return existing as WrWindowRef<C, R>;
      }
    }

    // Honour a pending restore — `restoreLayout` populates this Map
    // right before invoking the consumer's opener so the new window
    // seeds at the saved geometry instead of the cascade default.
    const pending = config.id ? this.pendingRestores.get(config.id) : undefined;
    if (pending) {
      this.pendingRestores.delete(config.id!);
      config = {
        ...config,
        x: pending.x,
        y: pending.y,
        width: pending.width,
        height: pending.height,
        title: pending.title || config.title,
      };
    }

    // Each window gets its own CDK overlay pane positioned `static` —
    // <wr-window> itself uses `position: fixed`, so the pane is only a
    // mount point. Windows are never modal — reach for `WrDialog` when
    // you need a backdrop + focus trap + scroll block.
    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      panelClass: 'wr-window-overlay',
      hasBackdrop: false,
    });

    const id = config.id ?? randomId('wr-window');
    const ref = new WrWindowRef<C, R>(id, overlayRef);
    ref.taskbarVisible = config.taskbar !== false;

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
    container.config = config;
    container.ref = ref as WrWindowRef<C, unknown>;
    container.componentType = component;
    container.childInjector = childInjector;

    if (this.isBrowser) {
      overlayRef.overlayElement.setAttribute('role', 'dialog');
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
    ref._doClose = result => {
      overlayRef.dispose();
      ref._closed.next(result);
      ref._closed.complete();
      this._windows.update(list => list.filter(r => r !== (ref as unknown as WrWindowRef<unknown, unknown>)));
    };

    this._windows.update(list => [...list, ref as unknown as WrWindowRef<unknown, unknown>]);

    // If the pending restore had a non-`normal` state, hand it to the
    // container so it can apply it right after wiring the bridges.
    // queueMicrotask would fire before afterNextRender — the bridges
    // wouldn't be set yet and ref.minimize() / maximize() would no-op.
    if (pending && pending.state !== 'normal') {
      ref.pendingStateOnMount = pending.state;
    }

    return ref;
  }

  /** Close every programmatically-opened window. */
  closeAll(): void {
    for (const ref of [...this._windows()]) {
      void ref.close();
    }
  }

  /** Look up an open window by its `config.id`. Returns `null` when no match. */
  findById(id: string): WrWindowRef<unknown, unknown> | null {
    return this._windows().find(r => r.id === id) ?? null;
  }

  /**
   * Drop the persisted geometry for a window so the next open uses the
   * config defaults again. Matches `WrWindowConfig.storage` exactly.
   */
  clearPersistedPosition(cfg: WrWindowStorageConfig): void {
    this.storage.remove(storageKey(cfg));
  }

  // Workspace save/restore
  //
  // A workspace is a snapshot of every open window's id + state +
  // geometry. Reopening is the consumer's job (component identities
  // aren't serialisable), so `restoreLayout` returns the captured
  // snapshots and a helper that re-applies geometry once the windows
  // have been opened again.

  /** Snapshot of one window — what `saveLayout` writes / `restoreLayout` returns. */
  private layoutKey(name: string): string {
    return `wr:window-layout:${name}`;
  }

  /**
   * Persist the geometry + state of every open programmatic window
   * under `name`. Pair with `restoreLayout(name)` after re-opening the
   * matching components.
   */
  saveLayout(name: string): void {
    const snapshot = this._windows().map(ref => ({
      id: ref.id,
      state: ref.state(),
      x: ref.x(),
      y: ref.y(),
      width: ref.width(),
      height: ref.height(),
      title: ref.title(),
    }));
    this.storage.set(this.layoutKey(name), snapshot);
  }

  /** Read a saved workspace. Returns `null` when no snapshot is found. */
  readLayout(name: string): readonly RestoreSnapshot[] | null {
    return this.storage.get(this.layoutKey(name));
  }

  /**
   * Apply a saved workspace.
   *
   * Each saved entry is matched to a currently-open window by `id`. For
   * matches, the geometry / state / title is re-applied immediately.
   * For misses, the optional `open` callback is invoked so the consumer
   * can re-open the right component for that id — the freshly-opened
   * window then seeds straight to the saved geometry (no cascade flicker)
   * and the saved state lands once the bridges are wired.
   *
   * ```ts
   * manager.restoreLayout('default', (id, snap) => {
   *   if (id.startsWith('editor:')) {
   *     manager.open(EditorComponent, { id, title: snap.title, data: ... });
   *   }
   * });
   * ```
   */
  restoreLayout(name: string, open?: (id: string, snapshot: { readonly title: string }) => void): void {
    const snapshot = this.readLayout(name);
    if (!snapshot) return;

    for (const snap of snapshot) {
      const existing = this.findById(snap.id);
      if (existing) {
        this.applyRestore(existing, snap);
        continue;
      }
      if (!open) continue;
      // Stash the geometry so the next `open()` call with this id
      // consumes it as the seed instead of cascading.
      this.pendingRestores.set(snap.id, snap);
      open(snap.id, { title: snap.title });
      // Belt + braces: if the opener didn't actually open a window (or
      // opened with a different id), drop the stale pending entry so it
      // doesn't ambush a future open.
      if (!this.findById(snap.id)) this.pendingRestores.delete(snap.id);
    }
  }

  private applyRestore(ref: WrWindowRef<unknown, unknown>, snap: RestoreSnapshot): void {
    // Force back to a known 'normal' baseline before applying state —
    // ref.minimize() / maximize() are toggles, so this prevents a
    // saved 'minimized' from un-minimizing an already-minimized window.
    ref.restore();
    if (snap.title) ref.setTitle(snap.title);
    ref.moveTo(snap.x, snap.y);
    ref.resizeTo(snap.width, snap.height);
    if (snap.state === 'minimized') ref.minimize();
    else if (snap.state === 'maximized') ref.maximize();
  }

  /** Drop a saved workspace. */
  clearLayout(name: string): void {
    this.storage.remove(this.layoutKey(name));
  }
}
