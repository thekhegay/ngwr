/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import type { WrWindowChromeSize, WrWindowOs, WrWindowSize, WrWindowState } from './types';
import { WrWindowManager } from './window-manager';

const SIZE_PRESETS: Readonly<Record<WrWindowSize, { width: number; height: number }>> = {
  sm: { width: 320, height: 200 },
  md: { width: 480, height: 320 },
  lg: { width: 720, height: 480 },
};

interface Edges {
  readonly t?: boolean;
  readonly r?: boolean;
  readonly b?: boolean;
  readonly l?: boolean;
}

const MIN_ON_VIEWPORT = 24; // keep at least this many px of the window inside the viewport
let titleUid = 0;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function viewportWidth(): number {
  return typeof window === 'undefined' ? 1024 : window.innerWidth;
}

function viewportHeight(): number {
  return typeof window === 'undefined' ? 768 : window.innerHeight;
}

/**
 * Free-floating OS-style window. Drag the header to move, drag any edge or
 * corner to resize, click the chrome buttons to minimize / maximize / close.
 * Multiple windows stack via {@link WrWindowManager}; clicking a background
 * one brings it to the front.
 *
 * Two-way binds `open` and `state`. Body content goes through `<ng-content>`.
 *
 * @example
 * ```html
 * <wr-window
 *   [(open)]="settingsOpen"
 *   title="Settings"
 *   [x]="80"
 *   [y]="80"
 *   width="28rem"
 *   height="20rem"
 * >
 *   <p>Anything you want inside…</p>
 * </wr-window>
 * ```
 *
 * @see https://ngwr.dev/docs/components/window
 */
@Component({
  selector: 'wr-window',
  templateUrl: './window.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'dialog',
    '[class]': 'classes()',
    '[style.left.px]': 'x()',
    '[style.top.px]': 'y()',
    '[style.width.px]': 'width()',
    '[style.height.px]': 'height()',
    '[style.z-index]': 'z()',
    '[attr.aria-hidden]': '!open()',
    '[attr.aria-labelledby]': 'titleId',
    '(pointerdown)': 'focusWindow()',
  },
})
export class WrWindow {
  /** Two-way bindable visibility. `false` removes the window from the layer. */
  readonly open = model<boolean>(true);

  /** Two-way bindable state. */
  readonly state = model<WrWindowState>('normal');

  /** Header title. */
  readonly title = input<string>('');

  /** Auto-generated id for the title element, referenced by `aria-labelledby`. */
  protected readonly titleId = `wr-window-title-${++titleUid}`;

  /** Initial position. `null` = auto-cascade from the manager. */
  readonly initialX = input<number | null>(null, {
    transform: (v: unknown): number | null => (v == null ? null : coerceNumberProperty(v, 0)),
  });
  readonly initialY = input<number | null>(null, {
    transform: (v: unknown): number | null => (v == null ? null : coerceNumberProperty(v, 0)),
  });

  /**
   * Size preset — seeds initial width / height when `[initialWidth]` /
   * `[initialHeight]` are not provided. `null` keeps the explicit
   * pixel inputs in charge. @default 'md'
   */
  readonly size = input<WrWindowSize | null>('md');

  /** Initial / forced size in pixels. Wins over `[size]` when set. */
  readonly initialWidth = input<number | null>(null, {
    transform: (v: unknown): number | null => (v == null ? null : coerceNumberProperty(v, 480)),
  });
  readonly initialHeight = input<number | null>(null, {
    transform: (v: unknown): number | null => (v == null ? null : coerceNumberProperty(v, 320)),
  });

  /**
   * OS chrome style — picks the side, glyphs, and button look of the
   * minimize / maximize / close cluster. @default 'windows'
   */
  readonly os = input<WrWindowOs>('windows');

  /** Title-bar density. @default 'normal' */
  readonly chromeSize = input<WrWindowChromeSize>('normal');

  /**
   * Enter / leave animations. Set to `false` to disable the open-fade
   * and the minimize / maximize transitions. Honoured automatically
   * when `prefers-reduced-motion: reduce`. @default true
   */
  readonly animations = input(true, { transform: coerceBooleanProperty });

  readonly minWidth = input<number>(220, { transform: (v: unknown): number => coerceNumberProperty(v, 220) });
  readonly minHeight = input<number>(140, { transform: (v: unknown): number => coerceNumberProperty(v, 140) });
  readonly maxWidth = input<number>(Number.POSITIVE_INFINITY, {
    transform: (v: unknown): number => (v == null ? Number.POSITIVE_INFINITY : coerceNumberProperty(v, Infinity)),
  });
  readonly maxHeight = input<number>(Number.POSITIVE_INFINITY, {
    transform: (v: unknown): number => (v == null ? Number.POSITIVE_INFINITY : coerceNumberProperty(v, Infinity)),
  });

  readonly movable = input(true, { transform: coerceBooleanProperty });
  readonly resizable = input(true, { transform: coerceBooleanProperty });
  readonly keepInViewport = input(true, { transform: coerceBooleanProperty });

  readonly showMinimize = input(true, { transform: coerceBooleanProperty });
  readonly showMaximize = input(true, { transform: coerceBooleanProperty });
  readonly showClose = input(true, { transform: coerceBooleanProperty });

  readonly closed = output<void>();
  readonly moved = output<{ readonly x: number; readonly y: number }>();
  readonly resized = output<{ readonly width: number; readonly height: number }>();

  private readonly manager = inject(WrWindowManager);

  // Position / size signals are the source of truth at runtime.
  // Inputs (x/y/initialWidth/initialHeight) seed them in afterNextRender.
  /** Live X (top-left). @internal */ readonly x_ = signal(0);
  /** Live Y (top-left). @internal */ readonly y_ = signal(0);
  /** Live width. @internal */ readonly width_ = signal(0);
  /** Live height. @internal */ readonly height_ = signal(0);

  // Saved geometry to restore from `maximized`.
  private restoreGeometry: { x: number; y: number; width: number; height: number } | null = null;

  /** Stack z-index — pulled from the manager on focus. @internal */
  readonly z = signal(this.manager.bringToFront());

  protected readonly classes = computed(() => {
    const parts = [
      'wr-window',
      `wr-window--${this.state()}`,
      `wr-window--os-${this.os()}`,
      `wr-window--chrome-${this.chromeSize()}`,
    ];
    if (!this.open()) parts.push('wr-window--closed');
    if (this.resizable() && this.state() === 'normal') parts.push('wr-window--resizable');
    if (!this.animations()) parts.push('wr-window--no-anim');
    return parts.join(' ');
  });

  // Effective geometry exposed to the host bindings AND to programmatic
  // consumers (`WrWindowRef`). When maximized we ignore the live
  // x_/y_/width_/height_ and fill the viewport instead.
  readonly x = computed(() => (this.state() === 'maximized' ? 0 : this.x_()));
  readonly y = computed(() => (this.state() === 'maximized' ? 0 : this.y_()));
  readonly width = computed(() => (this.state() === 'maximized' ? viewportWidth() : this.width_()));
  readonly height = computed(() =>
    this.state() === 'maximized'
      ? viewportHeight()
      : this.state() === 'minimized'
        ? this.minimizedHeight()
        : this.height_()
  );

  protected readonly minimizedHeight = signal(40); // header-only height

  constructor() {
    afterNextRender(() => this.seedInitialGeometry());

    // Re-clamp into viewport when window or viewport changes.
    effect(() => {
      if (this.state() !== 'normal') return;
      this.clampToViewport();
    });
  }

  // ──────── Public API ────────

  close(): void {
    this.open.set(false);
    this.closed.emit();
  }

  minimize(): void {
    this.state.set(this.state() === 'minimized' ? 'normal' : 'minimized');
  }

  maximize(): void {
    if (this.state() === 'maximized') {
      this.restore();
    } else {
      this.restoreGeometry = { x: this.x_(), y: this.y_(), width: this.width_(), height: this.height_() };
      this.state.set('maximized');
    }
  }

  /** Force back to `normal` from minimized / maximized. */
  restore(): void {
    if (this.state() === 'maximized' && this.restoreGeometry) {
      this.x_.set(this.restoreGeometry.x);
      this.y_.set(this.restoreGeometry.y);
      this.width_.set(this.restoreGeometry.width);
      this.height_.set(this.restoreGeometry.height);
      this.restoreGeometry = null;
    }
    this.state.set('normal');
  }

  /** Programmatic move — clamped to the viewport when `keepInViewport`. */
  moveTo(x: number, y: number): void {
    this.x_.set(x);
    this.y_.set(y);
    this.clampToViewport();
  }

  /** Programmatic resize — clamped to min/max bounds. */
  resizeTo(width: number, height: number): void {
    this.width_.set(clamp(width, this.minWidth(), this.maxWidth()));
    this.height_.set(clamp(height, this.minHeight(), this.maxHeight()));
    this.clampToViewport();
  }

  /** Re-position centered against the current viewport. */
  center(): void {
    const w = this.width_();
    const h = this.height_();
    this.x_.set(Math.max(0, (viewportWidth() - w) / 2));
    this.y_.set(Math.max(0, (viewportHeight() - h) / 2));
  }

  /** Bring this window to the top of the stack. */
  focus(): void {
    this.z.set(this.manager.bringToFront());
  }

  // ──────── Host handlers ────────

  /** @internal — alias kept for the host `(pointerdown)` binding. */
  protected focusWindow(): void {
    this.focus();
  }

  protected startMove(event: PointerEvent): void {
    if (!this.movable() || this.state() !== 'normal') return;
    if ((event.target as HTMLElement).closest('.wr-window__chrome-action')) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const startX = this.x_();
    const startY = this.y_();
    const originX = event.clientX;
    const originY = event.clientY;

    const move = (e: PointerEvent): void => {
      this.x_.set(startX + (e.clientX - originX));
      this.y_.set(startY + (e.clientY - originY));
      this.clampToViewport();
    };
    const up = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      this.moved.emit({ x: this.x_(), y: this.y_() });
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  protected startResize(event: PointerEvent, edges: Edges): void {
    if (!this.resizable() || this.state() !== 'normal') return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const startX = this.x_();
    const startY = this.y_();
    const startW = this.width_();
    const startH = this.height_();
    const originX = event.clientX;
    const originY = event.clientY;

    const move = (e: PointerEvent): void => {
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;

      let nextX = startX;
      let nextY = startY;
      let nextW = startW;
      let nextH = startH;

      if (edges.r) nextW = startW + dx;
      if (edges.b) nextH = startH + dy;
      if (edges.l) {
        nextW = startW - dx;
        nextX = startX + dx;
      }
      if (edges.t) {
        nextH = startH - dy;
        nextY = startY + dy;
      }

      // Enforce min/max — when shrinking from left/top we have to fix the position too.
      const clampedW = clamp(nextW, this.minWidth(), this.maxWidth());
      const clampedH = clamp(nextH, this.minHeight(), this.maxHeight());
      if (edges.l) nextX += nextW - clampedW;
      if (edges.t) nextY += nextH - clampedH;

      this.x_.set(nextX);
      this.y_.set(nextY);
      this.width_.set(clampedW);
      this.height_.set(clampedH);
      this.clampToViewport();
    };
    const up = (e: PointerEvent): void => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      this.resized.emit({ width: this.width_(), height: this.height_() });
    };

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  // Bound resize handlers for the template — avoids inline object literals
  // re-creating on every change-detection tick.
  protected resizeTL = (e: PointerEvent): void => this.startResize(e, { t: true, l: true });
  protected resizeT = (e: PointerEvent): void => this.startResize(e, { t: true });
  protected resizeTR = (e: PointerEvent): void => this.startResize(e, { t: true, r: true });
  protected resizeR = (e: PointerEvent): void => this.startResize(e, { r: true });
  protected resizeBR = (e: PointerEvent): void => this.startResize(e, { b: true, r: true });
  protected resizeB = (e: PointerEvent): void => this.startResize(e, { b: true });
  protected resizeBL = (e: PointerEvent): void => this.startResize(e, { b: true, l: true });
  protected resizeL = (e: PointerEvent): void => this.startResize(e, { l: true });

  // ──────── Internals ────────

  private seedInitialGeometry(): void {
    const sizePreset = this.size();
    const preset = sizePreset ? SIZE_PRESETS[sizePreset] : SIZE_PRESETS.md;
    const explicitW = this.initialWidth();
    const explicitH = this.initialHeight();
    const w = clamp(explicitW ?? preset.width, this.minWidth(), this.maxWidth());
    const h = clamp(explicitH ?? preset.height, this.minHeight(), this.maxHeight());
    this.width_.set(w);
    this.height_.set(h);

    const xIn = this.initialX();
    const yIn = this.initialY();
    if (xIn != null && yIn != null) {
      this.x_.set(xIn);
      this.y_.set(yIn);
    } else {
      const cascade = this.manager.nextStartOffset();
      this.x_.set(xIn ?? cascade.x);
      this.y_.set(yIn ?? cascade.y);
    }

    this.clampToViewport();
  }

  private clampToViewport(): void {
    if (!this.keepInViewport()) return;
    const vw = viewportWidth();
    const vh = viewportHeight();
    const w = this.width_();
    this.x_.set(clamp(this.x_(), MIN_ON_VIEWPORT - w, vw - MIN_ON_VIEWPORT));
    this.y_.set(clamp(this.y_(), 0, vh - MIN_ON_VIEWPORT));
  }
}
