/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type Signal, type WritableSignal, computed, signal } from '@angular/core';

import { Subject } from 'rxjs';

import { clamp } from 'ngwr/utils';

import type {
  WrWindowChromeSize,
  WrWindowConfig,
  WrWindowOs,
  WrWindowSize,
  WrWindowSnap,
  WrWindowSnapTarget,
  WrWindowState,
  WrWindowUpdate,
} from './types';

/** What a minimized window reports as its height. It is `display: none`, so this is only a number. */
const MINIMIZED_HEIGHT = 40;

/** A finite number, or the fallback — a `NaN` from a bad config must not reach the geometry. */
function num(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}

/**
 * A rectangle in viewport pixels — the work area, a snap region, a window's box.
 *
 * @internal
 */
export interface WrWindowRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** @internal A window's free-floating geometry: where it is when it is neither maximized nor snapped. */
export interface WrWindowGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Every option a window reads after it opens, with its default applied. The
 * ones `WrWindowRef.update()` may change are signals of this object, so an
 * update reaches the chrome and the drag code alike.
 *
 * @internal
 */
export interface WrWindowOptions {
  readonly os: WrWindowOs;
  readonly chromeSize: WrWindowChromeSize;
  readonly animations: boolean;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly movable: boolean;
  readonly resizable: boolean;
  readonly keepInViewport: boolean;
  readonly snap: WrWindowSnap;
  readonly restoreOnDrag: boolean;
  readonly dragHandle: string | null;
  readonly showMinimize: boolean | null;
  readonly showMaximize: boolean | null;
  readonly showClose: boolean;
  readonly closeOnEscape: boolean;
  readonly keyboard: boolean;
  readonly keyboardStep: number;
}

/** @internal */
export const SIZE_PRESETS: Readonly<Record<WrWindowSize, { readonly width: number; readonly height: number }>> = {
  sm: { width: 320, height: 200 },
  md: { width: 480, height: 320 },
  lg: { width: 720, height: 480 },
};

/** Keep at least this many px of a window inside the work area, so it can be grabbed again. @internal */
export const MIN_ON_SCREEN = 24;

/** @internal `WrWindowConfig` with every default applied. */
export function resolveOptions(config: WrWindowConfig): WrWindowOptions {
  return {
    os: config.os ?? 'auto',
    chromeSize: config.chromeSize ?? 'md',
    animations: config.animations ?? true,
    minWidth: num(config.minWidth, 220),
    minHeight: num(config.minHeight, 140),
    maxWidth: num(config.maxWidth, Number.POSITIVE_INFINITY),
    maxHeight: num(config.maxHeight, Number.POSITIVE_INFINITY),
    movable: config.movable ?? true,
    resizable: config.resizable ?? true,
    keepInViewport: config.keepInViewport ?? true,
    snap: config.snap ?? 'none',
    restoreOnDrag: config.restoreOnDrag ?? true,
    dragHandle: config.dragHandle ?? null,
    showMinimize: config.showMinimize ?? null,
    showMaximize: config.showMaximize ?? null,
    showClose: config.showClose ?? true,
    closeOnEscape: config.closeOnEscape ?? true,
    keyboard: config.keyboard ?? true,
    keyboardStep: Math.max(1, num(config.keyboardStep, 10)),
  };
}

/** @internal The viewport, or a stand-in on the server. */
export function readViewport(): { readonly width: number; readonly height: number } {
  if (typeof window === 'undefined' || typeof document === 'undefined') return { width: 1024, height: 768 };
  // `clientWidth`, not `innerWidth`: a `position: fixed` box is laid out
  // against the viewport WITHOUT its scrollbar, so with a classic 15px
  // scrollbar a window maximized to `innerWidth` ran under it, and a snap to
  // the right half started 7.5px right of the hint that promised it. jsdom
  // lays nothing out and reports 0, which is what the fallback is for.
  const root = document.documentElement;
  return { width: root.clientWidth || window.innerWidth, height: root.clientHeight || window.innerHeight };
}

/** @internal Start offset `index` windows into a cascade: 30px a step, and every ten a lap 15px along. */
export function cascadeOffset(index: number): { readonly x: number; readonly y: number } {
  // Ten steps then back to the start, so a cascade never walks off the
  // screen — and each lap shifted 15px ALONG ONLY, so window eleven no longer
  // opens exactly on top of window one. Shifting both axes put lap three's
  // windows exactly on lap one's, one step down the diagonal; with `x - y`
  // different for each lap, no two of the first fifty windows coincide.
  const step = 50 + (index % 10) * 30;
  return { x: step + (Math.floor(index / 10) % 5) * 15, y: step };
}

/** @internal What `seedGeometry` needs to place a window that is about to open. */
export interface WrWindowSeed {
  readonly options: WrWindowOptions;
  readonly workArea: WrWindowRect;
  readonly size: WrWindowSize | undefined;
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  /**
   * The position came back from storage or a saved layout rather than from the
   * consumer: it is moved wholly into the work area when the window fits, the
   * way a cascade position is. A desktop's geometry restored on a phone
   * otherwise opened 1100px wide with its close button off the glass.
   */
  readonly restored?: boolean;
  /** The next cascade offset, asked for only when a coordinate is missing. */
  readonly cascade: () => { readonly x: number; readonly y: number };
  readonly rtl: boolean;
}

/**
 * Where a window opens. A window OPENS on screen when it can: the size is
 * capped at the work area (the minimum still wins, since it is the consumer's
 * floor), and a cascade or restored position is moved in until the whole box
 * fits. A coordinate the consumer passed is theirs, held only to the reach a
 * drag is held to.
 *
 * @internal
 */
export function seedGeometry(seed: WrWindowSeed): WrWindowGeometry {
  const { options: o, workArea: wa } = seed;
  const preset = SIZE_PRESETS[seed.size ?? 'md'];
  const keep = o.keepInViewport;
  const fit = (size: number, room: number): number => (keep ? Math.min(size, room) : size);
  const width = Math.round(clamp(fit(seed.width ?? preset.width, wa.width), o.minWidth, o.maxWidth));
  const height = Math.round(clamp(fit(seed.height ?? preset.height, wa.height), o.minHeight, o.maxHeight));

  let x = seed.x;
  let y = seed.y;
  let cascaded = false;
  if (x == null || y == null) {
    const offset = seed.cascade();
    cascaded = true;
    // From the START edge of the work area: the right edge in a right-to-left
    // page, where the cascade used to begin at the inline end.
    x ??= seed.rtl ? wa.left + wa.width - width - offset.x : wa.left + offset.x;
    y ??= wa.top + offset.y;
  }
  const into = cascaded || !!seed.restored;
  if (keep && (into || seed.x == null)) x = clamp(x, wa.left, Math.max(wa.left, wa.left + wa.width - width));
  if (keep && (into || seed.y == null)) y = clamp(y, wa.top, Math.max(wa.top, wa.top + wa.height - height));
  return { x: Math.round(x), y: Math.round(y), width, height };
}

/** @internal How a window was set up when it opened. */
export interface WrWindowModelInit {
  readonly options: WrWindowOptions;
  readonly title?: string;
  readonly geometry?: WrWindowGeometry;
  readonly state?: WrWindowState;
  readonly snap?: WrWindowSnapTarget | null;
  readonly z?: number;
  readonly workArea: Signal<WrWindowRect>;
}

/** @internal A half or a quarter: what `snap` can hold. `top` is the maximized state instead. */
export type WrWindowSnapRegion = Exclude<WrWindowSnapTarget, 'top'>;

/** @internal What `startKeyboard` hands back for the announcement. */
export type WrWindowKeyboardMode = 'move' | 'resize';

/**
 * One window's state and geometry, and the rules for changing them.
 *
 * Created by `WrWindowManager.open()` before anything renders, so the ref's
 * signals are right from the first read and a call made before the first render
 * — `ref.maximize()` in the same tick as `open()`, `ref.setTitle()` from the
 * body's constructor — lands instead of being dropped. The component only draws
 * it and turns pointer and key events into calls on it.
 *
 * The raw `x` / `y` / `width` / `height` are the geometry the USER chose. A
 * maximized or snapped window shows something else (`rect`), and goes back to
 * the raw geometry when it leaves that state; nothing has to be saved on the
 * way in, so a `moveTo()` made while maximized is where restore lands.
 *
 * @internal
 */
export class WrWindowModel {
  readonly options: WritableSignal<WrWindowOptions>;
  readonly title: WritableSignal<string>;
  readonly state: WritableSignal<WrWindowState>;
  /** The half or quarter the window occupies while `normal`. `top` is never stored: it is `maximized`. */
  readonly snap: WritableSignal<WrWindowSnapRegion | null>;
  readonly x: WritableSignal<number>;
  readonly y: WritableSignal<number>;
  readonly width: WritableSignal<number>;
  readonly height: WritableSignal<number>;
  readonly z: WritableSignal<number>;
  /** Written by the manager: whether this is the window that has the keyboard. */
  readonly isActive = signal(false);
  readonly keyboardMode = signal<WrWindowKeyboardMode | null>(null);
  /** The snap region a drag in progress would land in, for the hint. */
  readonly dragTarget = signal<WrWindowSnapTarget | null>(null);
  readonly workArea: Signal<WrWindowRect>;

  readonly moved = new Subject<{ readonly x: number; readonly y: number }>();
  readonly resized = new Subject<{ readonly width: number; readonly height: number }>();
  readonly stateChanges = new Subject<WrWindowState>();

  /** Set by the component: the `<wr-window>` element, for the focus checks. */
  element: HTMLElement | null = null;
  /** Set by the container: the window was minimized while it held focus. */
  onMinimizedWithFocus: (() => void) | null = null;

  /** What leaving `minimized` goes back to — a window minimized while maximized comes back maximized. */
  private restoreTo: 'normal' | 'maximized' = 'normal';
  /** The geometry keyboard mode started from, after it restored the window: what a commit compares against. */
  private keyboardStart: WrWindowGeometry | null = null;
  /** Everything keyboard mode changed on entry, so Escape can put back a maximized or snapped window too. */
  private keyboardOrigin: {
    readonly geometry: WrWindowGeometry;
    readonly state: WrWindowState;
    readonly snap: WrWindowSnapRegion | null;
  } | null = null;

  /** The box on screen: the raw geometry, or what the state imposes on it. */
  readonly rect: Signal<WrWindowRect> = computed(() => {
    const state = this.state();
    if (state === 'maximized') return this.maximizedRect();
    const raw = { left: this.x(), top: this.y(), width: this.width(), height: this.height() };
    if (state === 'minimized') return { ...raw, height: MINIMIZED_HEIGHT };
    const snap = this.snap();
    return snap ? this.snapRect(snap) : raw;
  });

  /** Where the drag in progress would land, for the snap hint. */
  readonly previewRect: Signal<WrWindowRect | null> = computed(() => {
    const target = this.dragTarget();
    return target ? this.targetRect(target) : null;
  });

  constructor(init: WrWindowModelInit) {
    this.options = signal(init.options);
    this.title = signal(init.title ?? '');
    this.state = signal(init.state ?? 'normal');
    this.snap = signal<WrWindowSnapRegion | null>(init.snap && init.snap !== 'top' ? init.snap : null);
    const g = init.geometry ?? { x: 0, y: 0, width: SIZE_PRESETS.md.width, height: SIZE_PRESETS.md.height };
    this.x = signal(g.x);
    this.y = signal(g.y);
    this.width = signal(g.width);
    this.height = signal(g.height);
    this.z = signal(init.z ?? 0);
    this.workArea = init.workArea;
    this.clamp();
  }

  // State

  /** The one place a state is written, so `stateChanges` hears every change and only real ones. */
  setState(next: WrWindowState): void {
    const current = this.state();
    if (current === next) return;
    if (next === 'minimized') this.restoreTo = current === 'maximized' ? 'maximized' : 'normal';
    this.state.set(next);
    this.stateChanges.next(next);
  }

  /** Toggle: minimize, or come back to the state it was minimized from. */
  minimize(): void {
    if (this.state() === 'minimized') {
      this.unminimize();
      return;
    }
    // Read before the state flips: once the class lands, nothing inside has a
    // box and the browser has already dropped focus on `<body>`.
    const hadFocus = this.hasFocus();
    this.setState('minimized');
    if (hadFocus) this.onMinimizedWithFocus?.();
  }

  /** Leave `minimized` for the state the window was minimized from. A no-op otherwise. */
  unminimize(): void {
    if (this.state() === 'minimized') this.setState(this.restoreTo);
  }

  /** Toggle: maximize, or restore down to where it was — a snapped half included. */
  maximize(): void {
    this.setState(this.state() === 'maximized' ? 'normal' : 'maximized');
  }

  /** Back to the free-floating geometry: not minimized, not maximized, not snapped. */
  restore(): void {
    this.snap.set(null);
    this.setState('normal');
  }

  /** Snap to a region of the work area; `top` maximizes, `null` un-snaps. */
  snapTo(target: WrWindowSnapTarget | null): void {
    if (target === 'top') {
      this.setState('maximized');
      return;
    }
    this.snap.set(target);
    this.setState('normal');
  }

  // Geometry

  /** Write the raw geometry, in whole pixels — a touch drag hands out fractions. */
  setRaw(g: Partial<WrWindowGeometry>): void {
    if (g.x !== undefined) this.x.set(Math.round(g.x));
    if (g.y !== undefined) this.y.set(Math.round(g.y));
    if (g.width !== undefined) this.width.set(Math.round(g.width));
    if (g.height !== undefined) this.height.set(Math.round(g.height));
  }

  /**
   * A snapped window that is moved or resized by hand leaves the snap and
   * keeps the box it had, the way a desktop does — otherwise the write would
   * land in the raw geometry and nothing would visibly move.
   */
  unsnapInPlace(): void {
    if (!this.snap()) return;
    if (this.state() === 'normal') {
      const r = this.rect();
      this.setRaw({ x: r.left, y: r.top, width: r.width, height: r.height });
    }
    this.snap.set(null);
  }

  moveTo(x: number, y: number): void {
    this.unsnapInPlace();
    this.setRaw({ x, y });
    this.clamp();
  }

  resizeTo(width: number, height: number): void {
    this.unsnapInPlace();
    const o = this.options();
    this.setRaw({ width: clamp(width, o.minWidth, o.maxWidth), height: clamp(height, o.minHeight, o.maxHeight) });
    this.clamp();
  }

  center(): void {
    this.unsnapInPlace();
    const wa = this.workArea();
    this.setRaw({
      x: wa.left + Math.max(0, (wa.width - this.width()) / 2),
      y: wa.top + Math.max(0, (wa.height - this.height()) / 2),
    });
  }

  /**
   * Keep enough of the window inside the work area to grab it again. Reads the
   * work area, so a resized viewport pulls a window back into reach.
   */
  clamp(): void {
    if (!this.options().keepInViewport) return;
    const wa = this.workArea();
    const w = this.width();
    this.x.set(Math.round(clamp(this.x(), wa.left + MIN_ON_SCREEN - w, wa.left + wa.width - MIN_ON_SCREEN)));
    this.y.set(Math.round(clamp(this.y(), wa.top, wa.top + wa.height - MIN_ON_SCREEN)));
  }

  /** Change options on an open window. New bounds re-clamp the size the window has now. */
  update(patch: WrWindowUpdate): void {
    const { title, ...rest } = patch;
    if (title !== undefined) this.title.set(title);
    const defined: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) if (value !== undefined) defined[key] = value;
    if (Object.keys(defined).length === 0) return;
    this.options.update(o => ({ ...o, ...defined }));
    if (['minWidth', 'minHeight', 'maxWidth', 'maxHeight'].some(key => key in defined)) {
      const o = this.options();
      this.setRaw({
        width: clamp(this.width(), o.minWidth, o.maxWidth),
        height: clamp(this.height(), o.minHeight, o.maxHeight),
      });
      this.clamp();
    }
  }

  /** The box a maximized window takes: the work area, capped at the maximum size and centred in it. */
  maximizedRect(): WrWindowRect {
    const wa = this.workArea();
    const o = this.options();
    const width = Math.min(wa.width, o.maxWidth);
    const height = Math.min(wa.height, o.maxHeight);
    return {
      left: wa.left + Math.round((wa.width - width) / 2),
      top: wa.top + Math.round((wa.height - height) / 2),
      width,
      height,
    };
  }

  /**
   * The box a half or a quarter takes, held to the window's own bounds: a
   * window that cannot be that narrow keeps its minimum and stays against the
   * edge it was snapped to, and the box is kept inside the work area.
   */
  snapRect(target: WrWindowSnapRegion): WrWindowRect {
    const wa = this.workArea();
    const o = this.options();
    const halfW = Math.floor(wa.width / 2);
    const halfH = Math.floor(wa.height / 2);
    const right = target === 'right' || target === 'top-right' || target === 'bottom-right';
    const bottom = target === 'bottom-left' || target === 'bottom-right';
    const quarter = target !== 'left' && target !== 'right';
    // The far half carries the odd pixel, so the two halves meet with no gap.
    const regionW = right ? wa.width - halfW : halfW;
    const regionH = quarter ? (bottom ? wa.height - halfH : halfH) : wa.height;
    const regionL = wa.left + (right ? halfW : 0);
    const regionT = wa.top + (bottom ? halfH : 0);
    const width = clamp(regionW, o.minWidth, o.maxWidth);
    const height = clamp(regionH, o.minHeight, o.maxHeight);
    const left = right ? regionL + regionW - width : regionL;
    const top = bottom ? regionT + regionH - height : regionT;
    return {
      left: clamp(left, wa.left, Math.max(wa.left, wa.left + wa.width - width)),
      top: clamp(top, wa.top, Math.max(wa.top, wa.top + wa.height - height)),
      width,
      height,
    };
  }

  /** Where a snap target puts the window. */
  targetRect(target: WrWindowSnapTarget): WrWindowRect {
    return target === 'top' ? this.maximizedRect() : this.snapRect(target);
  }

  // Keyboard move and resize

  /**
   * Enter keyboard move or resize. A maximized window is restored down first
   * and a snapped one keeps its box, so the arrows move what the user sees.
   * Returns `false` when the option forbids it.
   */
  startKeyboard(mode: WrWindowKeyboardMode): boolean {
    const o = this.options();
    if (!o.keyboard || this.state() === 'minimized') return false;
    if (mode === 'move' ? !o.movable : !o.resizable) return false;
    this.keyboardOrigin = {
      geometry: { x: this.x(), y: this.y(), width: this.width(), height: this.height() },
      state: this.state(),
      snap: this.snap(),
    };
    if (this.state() === 'maximized') this.setState('normal');
    this.unsnapInPlace();
    this.keyboardStart = { x: this.x(), y: this.y(), width: this.width(), height: this.height() };
    this.keyboardMode.set(mode);
    return true;
  }

  /** One arrow key in keyboard move. */
  nudge(dx: number, dy: number): void {
    this.setRaw({ x: this.x() + dx, y: this.y() + dy });
    this.clamp();
  }

  /**
   * One arrow key in keyboard resize. The edge that moves is the inline END —
   * the left one in a right-to-left page — so growing never moves the edge the
   * window reads from.
   */
  grow(dw: number, dh: number, rtl: boolean): void {
    const o = this.options();
    const width = clamp(this.width() + dw, o.minWidth, o.maxWidth);
    const height = clamp(this.height() + dh, o.minHeight, o.maxHeight);
    const x = rtl ? this.x() - (width - this.width()) : this.x();
    this.setRaw({ x, width, height });
    this.clamp();
  }

  /** Keep what keyboard mode did. Returns the mode it ended, for the announcement and the stream. */
  commitKeyboard(): WrWindowKeyboardMode | null {
    const mode = this.keyboardMode();
    if (!mode) return null;
    this.keyboardMode.set(null);
    const start = this.keyboardStart;
    this.keyboardStart = null;
    this.keyboardOrigin = null;
    if (mode === 'move' && (start?.x !== this.x() || start?.y !== this.y())) {
      this.moved.next({ x: this.x(), y: this.y() });
    }
    if (mode === 'resize' && (start?.width !== this.width() || start?.height !== this.height())) {
      this.resized.next({ width: this.width(), height: this.height() });
    }
    return mode;
  }

  /**
   * Put the window back the way keyboard mode found it: the geometry, and the
   * maximized state or the snapped half it restored on entry. Without the last
   * two, Escape on a maximized window left it restored down.
   */
  cancelKeyboard(): WrWindowKeyboardMode | null {
    const mode = this.keyboardMode();
    if (!mode) return null;
    const origin = this.keyboardOrigin;
    this.keyboardStart = null;
    this.keyboardOrigin = null;
    this.keyboardMode.set(null);
    if (origin) {
      this.setRaw(origin.geometry);
      this.snap.set(origin.snap);
      this.setState(origin.state);
    }
    return mode;
  }

  /** Whether focus is inside the window. */
  hasFocus(): boolean {
    const el = this.element;
    return !!el && el.contains(el.ownerDocument.activeElement);
  }

  /** The window closed: no stream may outlive it. */
  complete(): void {
    this.moved.complete();
    this.resized.complete();
    this.stateChanges.complete();
  }
}
