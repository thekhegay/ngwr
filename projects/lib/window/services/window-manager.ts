/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  Injector,
  PLATFORM_ID,
  Service,
  type Signal,
  afterNextRender,
  computed,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { WR_OVERLAY, wrFollowDirection } from 'ngwr/overlay';
import { WrStorage } from 'ngwr/storage';
import { clamp, randomId, toClassList } from 'ngwr/utils';

import { storageKey } from '../storage-key';
import { WR_WINDOW_DATA, WR_WINDOW_DEFAULTS, WR_WINDOW_REF } from '../tokens';
import type {
  WrWindowBounds,
  WrWindowConfig,
  WrWindowInsets,
  WrWindowLayoutSnapshot,
  WrWindowStorageConfig,
} from '../types';
import { type PersistedGeometry, WrWindowContainer } from '../window-container';
import {
  type WrWindowRect,
  WrWindowModel,
  cascadeOffset,
  readViewport,
  resolveOptions,
  seedGeometry,
} from '../window-model';
import { type WrWindowRefHost, WrWindowRef } from '../window-ref';

type AnyRef = WrWindowRef<unknown, unknown>;

const NO_RESERVE = { top: 0, bottom: 0 } as const;

function sameRect(a: WrWindowRect, b: WrWindowRect): boolean {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/**
 * What `WrWindowManager` needs from a `<wr-window-taskbar>` on the page: the
 * row a window's tab sits in, so focus can land on it when the window is
 * minimized and be recognised there when the window is closed from it, and
 * the strip it covers, so maximized windows stop short of it.
 *
 * @internal
 */
export interface WrWindowTaskbarTabs {
  /**
   * The `.wr-window-taskbar__tab` row for `ref`, the "+N" button when its tab is
   * folded under one, or `null` when this taskbar does not list it.
   */
  tabFor(ref: AnyRef): HTMLElement | null;
  /**
   * Whether `ref`'s place in the rail is still moving: its tab has not been
   * measured yet, or the render that folds or unfolds it has not happened. Focus
   * waits for it rather than landing on a tab about to hide or a "+N" not drawn.
   */
  settling(ref: AnyRef): boolean;
  /** Whether `node` is inside this taskbar. */
  contains(node: Node): boolean;
  /** The strip of the viewport this taskbar covers while it shows tabs, in px from each edge. */
  readonly reserve: Signal<{ readonly top: number; readonly bottom: number }>;
}

/**
 * Owns the open window stack, hands out z-indexes, tracks the active window,
 * cascades the default spawn position, and opens windows that wrap a consumer
 * component.
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
 * There is no declarative `<wr-window>`: `open()` is the only way in, so every
 * window shares this one stack.
 */
@Service()
export class WrWindowManager implements WrWindowRefHost {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly storage = inject(WrStorage);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly dir = inject(Directionality, { optional: true });
  private readonly defaults = inject(WR_WINDOW_DEFAULTS, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private readonly baseZ = 1000;
  private topZ = this.baseZ;
  private openCount = 0;

  /** All open windows, in the order they opened. */
  private readonly _windows = signal<readonly AnyRef[]>([]);

  /** The window that has the keyboard, or `null`. */
  private readonly _active = signal<AnyRef | null>(null);

  /**
   * Filled by `restoreLayout` right before it invokes the consumer's
   * opener callback. The next `open()` call with a matching `config.id`
   * pops the entry and uses it as the initial geometry and state.
   */
  private readonly pendingRestores = new Map<string, WrWindowLayoutSnapshot>();

  /** The taskbars on the page, registered by each `<wr-window-taskbar>` for its lifetime. */
  private readonly taskbars = signal<readonly WrWindowTaskbarTabs[]>([]);

  /**
   * ONE viewport for every window, kept by one `resize` listener. Each window
   * used to add its own — twenty listeners for twenty windows, each writing its
   * own copy of the same two numbers.
   */
  private readonly viewport = signal(readViewport(), {
    equal: (a, b) => a.width === b.width && a.height === b.height,
  });
  /** Bumped when an element used as `bounds` may have moved: it resized, or something scrolled. */
  private readonly layoutTick = signal(0);
  private listening = false;
  private boundsObserver: ResizeObserver | null = null;
  private readonly boundElements = new Map<HTMLElement, number>();
  private readonly bumpLayout = (): void => this.layoutTick.update(n => n + 1);

  /** The strip the taskbars cover, edge by edge. */
  private readonly reserve = computed(() => {
    let top = 0;
    let bottom = 0;
    for (const taskbar of this.taskbars()) {
      const r = taskbar.reserve();
      top = Math.max(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
    return top === 0 && bottom === 0 ? NO_RESERVE : { top, bottom };
  });

  /** All currently-open windows, in the order they opened. */
  // Spelled out rather than `AnyRef` on every public member: the alias is not
  // exported, so the published typings would name `AnyRef$1` to a consumer.
  readonly windows: Signal<readonly WrWindowRef<unknown, unknown>[]> = this._windows.asReadonly();

  /**
   * The active window — the one that has the keyboard: the last one focused,
   * clicked, opened with focus or switched to (since v15.1). `null` once focus
   * moves to something on the page outside every window, and while the active
   * window is minimized.
   */
  readonly active: Signal<WrWindowRef<unknown, unknown> | null> = this._active.asReadonly();

  /** Windows that are minimized AND opted into the taskbar. */
  readonly minimized: Signal<WrWindowRef<unknown, unknown>[]> = computed(() =>
    this._windows().filter(w => w.taskbarVisible && w.state() === 'minimized')
  );

  /** Reserve the next z-index. Strictly increasing across the app's lifetime. */
  bringToFront(): number {
    this.topZ += 1;
    return this.topZ;
  }

  /**
   * Cascade offset for new windows, so two opens don't perfectly overlap: 30px
   * a step from the work area's start edge, back to the start after ten, and
   * each lap of ten shifted 15px along so window eleven does not land exactly
   * on window one.
   */
  nextStartOffset(): { readonly x: number; readonly y: number } {
    const offset = cascadeOffset(this.openCount);
    this.openCount += 1;
    return offset;
  }

  /**
   * Open a window with `component` rendered as its body. Returns a ref
   * the caller can use to drive the window programmatically and await
   * its result.
   *
   * **Singleton by id** — if `config.id` is set and a window with that
   * id is already open, that window is switched to (back from the taskbar,
   * raised, focused) and its ref returned. No duplicate window is
   * created. Use this to coalesce repeated open() calls (e.g. a
   * "Settings" menu item that should always re-focus the same window).
   */
  open<C, R = unknown, D = unknown>(component: ComponentType<C>, config: WrWindowConfig<D> = {}): WrWindowRef<C, R> {
    // Where focus goes back to when the window closes — read before anything
    // here moves it.
    const opener = this.focusedElement();

    if (config.id) {
      const existing = this.findById(config.id);
      if (existing) {
        // A second open is still an open: focus goes to the window, and back to
        // whatever asked for it this time — unless that was the window itself.
        if (config.autoFocus !== false) {
          if (opener && !existing._overlayRef.overlayElement?.contains(opener)) existing._returnFocus = opener;
          this._activate(existing);
        } else {
          existing._model.unminimize();
          this._raise(existing);
        }
        return existing as WrWindowRef<C, R>;
      }
    }

    // Honour a pending restore — `restoreLayout` populates this Map
    // right before invoking the consumer's opener so the new window
    // seeds at the saved geometry instead of the cascade default.
    const pending = config.id ? this.pendingRestores.get(config.id) : undefined;
    if (pending) this.pendingRestores.delete(config.id!);

    this.listen();

    const options = resolveOptions(config);
    const bounds = this.boundsElement(config.bounds ?? this.defaults?.bounds);
    const workArea = this.workAreaFor(config.bounds ?? this.defaults?.bounds, bounds);
    const releaseBounds = bounds ? this.observeBounds(bounds) : null;

    // Saved geometry is the INITIAL geometry, through the same fit as a
    // cascade: it used to be written over the window after it had sized
    // itself, skipping the fit and the min / max clamps, so a desktop's
    // 1100px window reopened on a phone with 24px of it on the glass.
    const saved = !pending && config.storage ? this.storage.get<PersistedGeometry>(storageKey(config.storage)) : null;
    const persist = config.storage?.persist ?? 'all';
    const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
    const savedPos = saved && persist !== 'size' && isNum(saved.x) && isNum(saved.y) ? saved : null;
    const savedSize = saved && persist !== 'position' && isNum(saved.width) && isNum(saved.height) ? saved : null;

    const geometry = untracked(() =>
      seedGeometry({
        options,
        workArea: workArea(),
        size: config.size,
        x: pending?.x ?? savedPos?.x ?? config.x,
        y: pending?.y ?? savedPos?.y ?? config.y,
        width: pending?.width ?? savedSize?.width ?? config.width,
        height: pending?.height ?? savedSize?.height ?? config.height,
        restored: !!pending || !!savedPos,
        cascade: () => this.nextStartOffset(),
        rtl: this.dir?.value === 'rtl',
      })
    );

    const taskbarOptIn = config.taskbar !== false;
    const model = new WrWindowModel({
      options,
      // A saved title, else the config's — an empty saved title is not one.
      title: [pending?.title, config.title].find(t => !!t) ?? '',
      geometry,
      state: pending?.state,
      snap: pending?.snap ?? null,
      z: this.bringToFront(),
      workArea,
    });

    // Assigned right after the ref exists; the predicate below only ever runs
    // from a keydown, long after.
    let self: AnyRef | null = null;

    // Each window gets its own CDK overlay pane positioned `static` —
    // <wr-window> itself uses `position: fixed`, so the pane is only a
    // mount point. Windows are never modal — reach for `WrDialog` when
    // you need a backdrop + focus trap + scroll block.
    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      panelClass: toClassList('wr-window-overlay', config.panelClass),
      hasBackdrop: false,
      // Which window an Escape belongs to is a question the CDK cannot answer
      // here. Its keyboard dispatcher walks the attached overlays newest-first
      // and hands the key to the first one willing to take it — and attach order
      // is frozen at OPEN order, because raising re-stacks with a z-index and
      // never re-attaches. Declining here is what makes it recoverable: a
      // rejected event walks on down the stack instead of being eaten, so the
      // window that does own it still gets its Escape.
      eventPredicate: () => self === null || this.ownsKeyboard(self),
      // OUT of the top layer, deliberately. The CDK puts overlay hosts there by
      // default (`popover="manual"`), and the top layer orders strictly by
      // ENTRY: whatever opened last paints on top and no z-index can change it.
      // That is right for a menu or a modal and exactly wrong for a window
      // manager, whose whole job is letting the user decide which window is in
      // front. It also fixes the ordering against modals: a dialog stays in the
      // top layer, so it now sits above every window instead of below whichever
      // window happened to open after it.
      usePopover: false,
    });

    // The z-index has to land on the OVERLAY HOST, not only on `.wr-window`.
    // Each window sits in its own CDK global wrapper, and that wrapper is
    // `position: fixed` with a numeric `z-index` — which makes it a stacking
    // context, so a z-index written inside it only orders things against its
    // own siblings, never against another window.
    overlayRef.hostElement.style.zIndex = String(model.z());

    // Windows are long-lived — a session can leave one open across any number
    // of direction changes — and while `x` / `y` are physical by design (as are
    // the resize grips, deliberately), the chrome is not: the macOS title bar
    // parks its button cluster with `row-reverse`, which resolves against `dir`,
    // so a stale attribute leaves the dots and the gutter that counterbalances
    // them on opposite edges. Each `open()` has its own ref, and `_doClose`
    // disposes it, which is what ends this follower.
    wrFollowDirection(overlayRef, this.dir, this.parentInjector);

    const id = config.id ?? randomId('wr-window');
    const ref = new WrWindowRef<C, R>(id, overlayRef, model);
    const any = ref as unknown as AnyRef;
    self = any;
    ref._host = this;
    ref.taskbarVisible = taskbarOptIn;

    // A minimized window is not the one with the keyboard: focus has gone to
    // its taskbar tab, or back to where the window was opened from.
    model.stateChanges.subscribe(state => {
      if (state === 'minimized' && this._active() === any) this.setActive(null);
    });

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
    // A window `restoreLayout()` re-opens stays out of focus's way unless its
    // opener says otherwise: a workspace of five windows coming back must not
    // pull focus through each of them and leave it in whichever came last.
    container.autoFocus = config.autoFocus ?? !pending;
    ref._returnFocus = opener;

    // No role on the pane: `<wr-window>` inside it is the named `role="dialog"`,
    // and a second, unnamed one around it read as "dialog > dialog" and tripped
    // axe's `aria-dialog-name` on every open window.

    // Always subscribed, and the option read when the key arrives, so
    // `update({ closeOnEscape })` reaches an open window. A key claimed below
    // it — Escape cancelling keyboard move — is not a close.
    overlayRef.keydownEvents().subscribe(event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !model.options().closeOnEscape) return;
      event.preventDefault();
      void ref.close();
    });

    // Wire close → disposal + completion of the result subject. The
    // ref's `close()` already runs the beforeClose hook before reaching
    // this bridge.
    ref._doClose = result => {
      // Read before disposal takes the focused element out of the page. Focus
      // goes back only when it was the window's to give: inside it, on its
      // taskbar tab, or already lost. A window closed by code while the reader
      // works elsewhere leaves them there.
      const back = this.holdsFocus(any) ? ref._returnFocus : null;
      ref._returnFocus = null;
      overlayRef.dispose();
      releaseBounds?.();
      ref._closed.next(result);
      ref._closed.complete();
      model.complete();
      this._windows.update(list => list.filter(r => r !== any));
      if (this._active() === any) this.setActive(null);
      if (back?.isConnected) back.focus();
    };

    this._windows.update(list => [...list, any]);

    return ref;
  }

  /**
   * Switch to `ref`: back from the taskbar, raised, active, and — unless told
   * otherwise — focused on the control it had last.
   *
   * @internal
   */
  _activate(ref: AnyRef, options: { readonly focus?: boolean } = {}): void {
    if (!this._windows().includes(ref)) return;
    ref._model.unminimize();
    this._raise(ref);
    this.setActive(ref);
    if (options.focus !== false && !ref._model.hasFocus()) ref._focusWindow?.('last');
  }

  /**
   * Put `ref` on top of the stack. A window already on top keeps its z: every
   * click in a window used to take a new one, so the number climbed with each
   * press and every press re-wrote the host's style.
   *
   * @internal
   */
  _raise(ref: AnyRef): void {
    if (ref.z() >= this.topZ) return;
    const z = this.bringToFront();
    ref._model.z.set(z);
    const host = ref._overlayRef.hostElement;
    if (host) host.style.zIndex = String(z);
  }

  private setActive(ref: AnyRef | null): void {
    const previous = this._active();
    if (previous === ref) return;
    previous?._model.isActive.set(false);
    ref?._model.isActive.set(true);
    this._active.set(ref);
  }

  /**
   * Focus decides the active window wherever it comes from: Tab into a window,
   * a click on a field in it, a script calling `focus()`. A window that gains
   * focus is raised too — a focused window hidden behind another is a window
   * the user is typing into blind. Focus on a taskbar, or in another overlay,
   * leaves the active window as it was; focus anywhere else on the page means
   * none is.
   */
  private readonly onFocusIn = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const ref = this._windows().find(w => w._overlayRef.overlayElement?.contains(target));
    if (ref) {
      this._raise(ref);
      this.setActive(ref);
      return;
    }
    if (this.taskbars().some(t => t.contains(target))) return;
    // Focus that went into another overlay — a menu or a listbox opened from
    // inside a window, a dialog over it — is not focus that left for the page:
    // the window it came from keeps the keyboard, the way a desktop keeps a
    // window active while its menu is open.
    if (target instanceof Element && target.closest('.wr-overlay-container, .cdk-overlay-container')) return;
    this.setActive(null);
  };

  /** Install the shared listeners, once, on the first open in a browser. */
  private listen(): void {
    if (this.listening || !this.isBrowser) return;
    this.listening = true;
    const measure = (): void => this.viewport.set(readViewport());
    measure();
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('focusin', this.onFocusIn, true);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', this.onFocusIn, true);
      document.removeEventListener('scroll', this.bumpLayout, true);
      this.boundsObserver?.disconnect();
    });
  }

  private boundsElement(bounds: WrWindowBounds | undefined): HTMLElement | null {
    if (!bounds || bounds === 'viewport') return null;
    if (bounds instanceof ElementRef) return bounds.nativeElement;
    return typeof (bounds as HTMLElement).getBoundingClientRect === 'function' ? (bounds as HTMLElement) : null;
  }

  /**
   * The work area for one window: its bounds, cut to the viewport, minus the
   * strip a taskbar covers.
   */
  private workAreaFor(bounds: WrWindowBounds | undefined, element: HTMLElement | null): Signal<WrWindowRect> {
    const insets = !element && bounds && bounds !== 'viewport' ? (bounds as WrWindowInsets) : null;
    return computed(
      () => {
        const vp = this.viewport();
        const reserve = this.reserve();
        let left = 0;
        let top = 0;
        let right = vp.width;
        let bottom = vp.height;
        if (element && this.isBrowser) {
          this.layoutTick();
          const r = element.getBoundingClientRect();
          left = Math.max(0, r.left);
          top = Math.max(0, r.top);
          right = Math.min(vp.width, r.right);
          bottom = Math.min(vp.height, r.bottom);
        } else if (insets) {
          left = insets.left ?? 0;
          top = insets.top ?? 0;
          right = vp.width - (insets.right ?? 0);
          bottom = vp.height - (insets.bottom ?? 0);
        }
        top = Math.max(top, reserve.top);
        bottom = Math.min(bottom, vp.height - reserve.bottom);
        return {
          left: Math.round(left),
          top: Math.round(top),
          width: Math.max(0, Math.round(right - left)),
          height: Math.max(0, Math.round(bottom - top)),
        };
      },
      { equal: sameRect }
    );
  }

  /** Keep an element used as `bounds` measured while a window uses it. Returns the release. */
  private observeBounds(element: HTMLElement): () => void {
    if (!this.isBrowser) return () => undefined;
    const count = this.boundElements.get(element) ?? 0;
    this.boundElements.set(element, count + 1);
    if (count === 0) {
      if (typeof ResizeObserver !== 'undefined') {
        this.boundsObserver ??= new ResizeObserver(this.bumpLayout);
        this.boundsObserver.observe(element);
      }
      if (this.boundElements.size === 1) {
        document.addEventListener('scroll', this.bumpLayout, { capture: true, passive: true });
      }
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.boundElements.get(element) ?? 1) - 1;
      if (left > 0) {
        this.boundElements.set(element, left);
        return;
      }
      this.boundElements.delete(element);
      this.boundsObserver?.unobserve(element);
      if (this.boundElements.size === 0) document.removeEventListener('scroll', this.bumpLayout, true);
    };
  }

  /**
   * Whether a keyboard event routed to `ref`'s overlay is actually meant for it.
   *
   * The window holding real DOM focus owns the key. When focus is on NOTHING —
   * `<body>`, which is where a click on a window's own text used to leave it —
   * the active window owns it if it is on screen, else the front-most window on
   * screen. When focus is anywhere else on the page, no window owns it: an
   * Escape pressed in the page's own search field closed a window the reader
   * was not in. That is the rule the non-modal drawer has always followed.
   *
   * A MINIMIZED window never owns a key it did not receive through focus, and
   * never counts as being in front: it is `display: none`. Focus on a taskbar
   * tab is on the page, so no window owns that key either.
   */
  private ownsKeyboard(ref: AnyRef): boolean {
    if (!this.isBrowser) return false;
    const open = this._windows();
    const active = document.activeElement;
    const focused = active ? open.find(w => w._overlayRef.overlayElement?.contains(active)) : undefined;
    if (focused) return focused === ref;
    if (active && active !== document.body) return false;
    const current = this._active();
    if (current && current.state() !== 'minimized') return current === ref;
    let front: AnyRef | null = null;
    for (const w of open) {
      if (w.state() !== 'minimized' && (!front || w.z() > front.z())) front = w;
    }
    return front === ref;
  }

  /**
   * Register a taskbar for as long as it is on the page. Returns the
   * unregister call.
   *
   * @internal
   */
  _registerTaskbar(taskbar: WrWindowTaskbarTabs): () => void {
    this.taskbars.update(list => [...list, taskbar]);
    return () => this.taskbars.update(list => list.filter(t => t !== taskbar));
  }

  /**
   * A window was minimized while it held focus, and the render that lists it
   * in the taskbar has happened: put focus on its tab's restore button. With no
   * taskbar listing it (none on the page, or `taskbar: false`), focus goes back
   * to where the window was opened from rather than being left on `<body>`.
   *
   * @internal
   */
  _focusAfterMinimize(ref: AnyRef, attempt = 0): void {
    // A tab the rail has not measured yet can fold on the next pass, and its
    // "+N" is not drawn until the pass after. Wait for those, a few at most,
    // rather than focus what is about to hide or fall back to the opener.
    if (attempt < 3 && this.taskbars().some(taskbar => taskbar.settling(ref))) {
      const active = this.focusedElement();
      if (active && ref._overlayRef.overlayElement?.contains(active)) active.blur();
      afterNextRender(() => this._focusAfterMinimize(ref, attempt + 1), { injector: this.parentInjector });
      return;
    }
    // The restore button is the row's first: the close button sits after it. A
    // folded window's place is the "+N" button, which is a button itself.
    const tab = this.taskbarTab(ref);
    const restore = tab?.matches('button') ? tab : tab?.querySelector<HTMLElement>('button');
    if (restore) restore.focus();
    else if (ref._returnFocus?.isConnected) ref._returnFocus.focus();
    // Nowhere to go: at least never leave focus parked inside a window that is
    // `display: none`, where it would keep claiming every Escape. Browsers
    // that run the focus fixup rule have already done this.
    const active = this.focusedElement();
    if (active && ref._overlayRef.overlayElement?.contains(active)) active.blur();
  }

  private taskbarTab(ref: AnyRef): HTMLElement | null {
    for (const taskbar of this.taskbars()) {
      const tab = taskbar.tabFor(ref);
      if (tab) return tab;
    }
    return null;
  }

  /** The focused element, or `null` when that is `<body>` or nothing. */
  private focusedElement(): HTMLElement | null {
    if (!this.isBrowser) return null;
    const active = document.activeElement;
    return active instanceof HTMLElement && active !== document.body ? active : null;
  }

  /** Whether focus is `ref`'s to hand back: inside it, on its taskbar tab, or nowhere. */
  private holdsFocus(ref: AnyRef): boolean {
    if (!this.isBrowser) return false;
    const active = this.focusedElement();
    if (!active) return true;
    return !!ref._overlayRef.overlayElement?.contains(active) || !!this.taskbarTab(ref)?.contains(active);
  }

  // Arranging

  /** Windows on screen — not minimized. */
  private onScreen(): AnyRef[] {
    return this._windows().filter(w => w.state() !== 'minimized');
  }

  /**
   * Restore every window on screen and stack them down from the start edge of
   * their work area, 30px apart, keeping each one's size and their order front
   * to back (since v15.1).
   */
  cascade(): void {
    const rtl = this.dir?.value === 'rtl';
    const list = this.onScreen().sort((a, b) => a.z() - b.z());
    list.forEach((ref, index) => {
      const m = ref._model;
      m.restore();
      const wa = m.workArea();
      const o = m.options();
      const fit = (size: number, room: number): number => (o.keepInViewport ? Math.min(size, room) : size);
      const width = clamp(fit(m.width(), wa.width), o.minWidth, o.maxWidth);
      const height = clamp(fit(m.height(), wa.height), o.minHeight, o.maxHeight);
      const offset = cascadeOffset(index);
      const x = rtl ? wa.left + wa.width - width - offset.x : wa.left + offset.x;
      const y = wa.top + offset.y;
      m.setRaw({
        x: clamp(x, wa.left, Math.max(wa.left, wa.left + wa.width - width)),
        y: clamp(y, wa.top, Math.max(wa.top, wa.top + wa.height - height)),
        width,
        height,
      });
      this._raise(ref);
    });
  }

  /**
   * Restore every window on screen and share the work area between them, in
   * the order they opened: a grid (the default), side by side in columns, or
   * stacked in rows. A row of a grid with fewer windows spreads them across its
   * whole width. In a right-to-left page the first window takes the right
   * (since v15.1).
   */
  tile(mode: 'grid' | 'columns' | 'rows' = 'grid'): void {
    const list = this.onScreen();
    const n = list.length;
    if (n === 0) return;
    const rtl = this.dir?.value === 'rtl';
    const cols = mode === 'columns' ? n : mode === 'rows' ? 1 : Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    list.forEach((ref, index) => {
      const m = ref._model;
      m.restore();
      const wa = m.workArea();
      const o = m.options();
      const row = Math.floor(index / cols);
      const inRow = Math.min(cols, n - row * cols);
      let col = index % cols;
      if (rtl) col = inRow - 1 - col;
      const x0 = wa.left + Math.floor((wa.width * col) / inRow);
      const x1 = wa.left + Math.floor((wa.width * (col + 1)) / inRow);
      const y0 = wa.top + Math.floor((wa.height * row) / rows);
      const y1 = wa.top + Math.floor((wa.height * (row + 1)) / rows);
      m.setRaw({
        x: x0,
        y: y0,
        width: clamp(x1 - x0, o.minWidth, o.maxWidth),
        height: clamp(y1 - y0, o.minHeight, o.maxHeight),
      });
      m.clamp();
    });
  }

  /** Minimize every window on screen (since v15.1). */
  minimizeAll(): void {
    for (const ref of this.onScreen()) ref._model.minimize();
  }

  /** Bring every minimized window back, each to the state it was minimized from (since v15.1). */
  restoreAll(): void {
    for (const ref of this._windows()) ref._model.unminimize();
  }

  /**
   * Switch to the next window, in the order they opened, wrapping at the end —
   * minimized windows included, which come back. Bind it to a hotkey from
   * `ngwr/hotkey`, such as Ctrl+F6 (since v15.1).
   */
  activateNext(): void {
    this.cycle(1);
  }

  /** Switch to the previous window, the other way round from {@link activateNext} (since v15.1). */
  activatePrevious(): void {
    this.cycle(-1);
  }

  private cycle(step: 1 | -1): void {
    const list = this._windows();
    if (list.length === 0) return;
    const current = this._active();
    const index = current ? list.indexOf(current) : -1;
    const next = index < 0 ? list[step > 0 ? 0 : list.length - 1] : list[(index + step + list.length) % list.length];
    this._activate(next);
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
    // The RAW geometry, not the live one. `ref.x()` / `ref.width()` report what
    // is on screen — a maximized window measures the viewport, a minimized one
    // measures its collapsed header — so saving those threw away the size the
    // user actually chose. Restoring then re-maximized over viewport-sized
    // "restore" geometry, and "Restore down" left the window filling the screen
    // with no way back; a minimized window came back from the taskbar as a stub
    // clamped to `minHeight`. The window knows the real numbers all along.
    const snapshot: WrWindowLayoutSnapshot[] = this._windows().map(ref => ({
      id: ref.id,
      state: ref.state(),
      x: ref._model.x(),
      y: ref._model.y(),
      width: ref._model.width(),
      height: ref._model.height(),
      title: ref.title(),
      snap: ref._model.snap(),
    }));
    this.storage.set(this.layoutKey(name), snapshot);
  }

  /** Read a saved workspace. Returns `null` when no snapshot is found. */
  readLayout(name: string): readonly WrWindowLayoutSnapshot[] | null {
    return this.storage.get(this.layoutKey(name));
  }

  /**
   * Apply a saved workspace.
   *
   * Each saved entry is matched to a currently-open window by `id`. For
   * matches, the geometry / state / title is re-applied immediately.
   * For misses, the optional `open` callback is invoked so the consumer
   * can re-open the right component for that id — the freshly-opened
   * window opens straight at the saved geometry and in the saved state, with
   * no cascade flicker — fitted into the work area when this viewport is
   * smaller than the one the layout was saved on.
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

  private applyRestore(ref: AnyRef, snap: WrWindowLayoutSnapshot): void {
    // Back to a known 'normal' baseline first, then the geometry, the snap and
    // the state, each written once — the toggles would un-minimize a window
    // that was already minimized.
    const m = ref._model;
    m.restore();
    if (snap.title) m.title.set(snap.title);
    m.resizeTo(snap.width, snap.height);
    m.moveTo(snap.x, snap.y);
    if (snap.snap && snap.snap !== 'top') m.snap.set(snap.snap);
    if (snap.state !== 'normal') m.setState(snap.state);
  }

  /** Drop a saved workspace. */
  clearLayout(name: string): void {
    this.storage.remove(this.layoutKey(name));
  }
}
