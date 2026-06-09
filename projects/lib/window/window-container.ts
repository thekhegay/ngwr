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
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { WrStorage } from 'ngwr/storage';

import type { WrWindowConfig, WrWindowStorageConfig } from './types';
import { WrWindow } from './window';
import type { WrWindowRef } from './window-ref';

interface PersistedGeometry {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

function storageKey(cfg: WrWindowStorageConfig): string {
  const prefix = cfg.prefix ? `${cfg.prefix}:` : '';
  return `wr:window:${prefix}${cfg.key}`;
}

/** Coalesce live position/size writes — drag/resize fires every move. */
const PERSIST_DEBOUNCE_MS = 200;

/**
 * Internal host attached by `WrWindowManager.open()`. Reads the config,
 * configures a `<wr-window>`, projects the consumer's component into
 * its body, and wires the resulting instance back to the `WrWindowRef`
 * so consumers can drive everything imperatively.
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

  private readonly hostInjector = inject(Injector);
  private readonly storage = inject(WrStorage);
  private readonly destroyRef = inject(DestroyRef);
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('content', { read: ViewContainerRef, static: true })
  private readonly contentVcr!: ViewContainerRef;

  @ViewChild(WrWindow, { static: true })
  private readonly wrWindow!: WrWindow;

  constructor() {
    afterNextRender(() => this.attach());
    this.destroyRef.onDestroy(() => {
      if (this.persistTimer !== null) clearTimeout(this.persistTimer);
    });
  }

  private attach(): void {
    // 1. Create the consumer's component inside the body slot.
    const componentRef = this.contentVcr.createComponent(this.componentType, {
      injector: this.childInjector,
    });
    this.ref.componentRef = componentRef;

    // 2. Bridge imperative actions to the underlying <wr-window>.
    const w = this.wrWindow;
    this.ref._doMinimize = () => w.minimize();
    this.ref._doMaximize = () => w.maximize();
    this.ref._doRestore = () => w.restore();
    this.ref._doFocus = () => w.focus();
    this.ref._doMoveTo = (x, y) => w.moveTo(x, y);
    this.ref._doResizeTo = (width, height) => w.resizeTo(width, height);
    this.ref._doCenter = () => w.center();
    this.ref._doSetTitle = title => this.ref._title.set(title);

    // 3. Sync the live geometry/state into the ref's signals so
    //    consumers can read them reactively without poking at <wr-window>.
    //    Angular 22 always allows signal writes inside effects — the
    //    `allowSignalWrites` option was deprecated in this version.
    runInInjectionContext(this.hostInjector, () => {
      effect(() => this.ref._state.set(w.state()));
      effect(() => this.ref._x.set(w.x()));
      effect(() => this.ref._y.set(w.y()));
      effect(() => this.ref._width.set(w.width()));
      effect(() => this.ref._height.set(w.height()));
      effect(() => this.ref._z.set(w.z()));
    });

    // 4. Seed the title signal from config.
    this.ref._title.set(this.config.title ?? '');

    // 5. Storage — hydrate from disk + auto-save on geometry change.
    if (this.config.storage) {
      this.hydrateFromStorage(w);
      this.installAutosave(w);
    }
  }

  /** Apply persisted geometry on top of config defaults, before the user sees the window. */
  private hydrateFromStorage(w: WrWindow): void {
    const cfg = this.config.storage;
    if (!cfg) return;
    const saved = this.storage.get<PersistedGeometry>(storageKey(cfg));
    if (!saved) return;
    const persist = cfg.persist ?? 'all';
    if (persist !== 'size') {
      if (typeof saved.x === 'number') w.x_.set(saved.x);
      if (typeof saved.y === 'number') w.y_.set(saved.y);
    }
    if (persist !== 'position') {
      if (typeof saved.width === 'number') w.width_.set(saved.width);
      if (typeof saved.height === 'number') w.height_.set(saved.height);
    }
  }

  /** Persist geometry whenever it changes, debounced. */
  private installAutosave(w: WrWindow): void {
    const cfg = this.config.storage;
    if (!cfg) return;
    const persist = cfg.persist ?? 'all';
    const key = storageKey(cfg);

    runInInjectionContext(this.hostInjector, () => {
      effect(() => {
        // Read every signal we want to watch; ignore minimized/maximized
        // overlay values — we only persist the user's chosen geometry.
        const x = w.x_();
        const y = w.y_();
        const width = w.width_();
        const height = w.height_();

        if (this.persistTimer !== null) clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
          this.persistTimer = null;
          const payload: PersistedGeometry = {};
          if (persist !== 'size') {
            (payload as { x?: number; y?: number }).x = x;
            (payload as { x?: number; y?: number }).y = y;
          }
          if (persist !== 'position') {
            (payload as { width?: number; height?: number }).width = width;
            (payload as { width?: number; height?: number }).height = height;
          }
          this.storage.set(key, payload);
        }, PERSIST_DEBOUNCE_MS);
      });
    });
  }
}
