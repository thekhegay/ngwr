import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, ElementRef, Injector, PLATFORM_ID, afterNextRender, effect, inject } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { clamp, watchColorScheme } from 'ngwr/utils';

/** The device ratio is never followed past this: a third pixel per axis buys nothing a faint backdrop shows. */
const MAX_DPR = 2;

/**
 * The backing store's pixel budget. A section stacked on a phone runs to
 * thousands of CSS pixels tall; past this the ratio drops (never below 1), so
 * the canvas stays a few megabytes instead of tens.
 */
const MAX_PIXELS = 4_000_000;

/** A tab that was throttled comes back with one huge frame; a scene moves at most this far at once. */
const MAX_FRAME_MS = 50;

/**
 * How much short of its `frameMs` a frame may fall and still be drawn: a 60Hz
 * screen's second frame lands at 33.3ms, not at the 33 a scene asks for, and
 * without the slack it would wait for the third and run at 20fps.
 */
const FRAME_FLOOR_SLACK = 2;

class Backdrop implements CanvasBackdrop {
  ctx: CanvasRenderingContext2D | null = null;
  width = 0;
  height = 0;
  running = false;

  private platform: WrPlatform | null = null;
  private view: (Window & typeof globalThis) | null = null;
  private inView = false;
  private rafId: number | null = null;
  private resizeRafId: number | null = null;
  private pendingWidth = 0;
  private pendingHeight = 0;
  private lastFrame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private viewObserver: IntersectionObserver | null = null;

  constructor(
    private readonly canvas: () => HTMLCanvasElement,
    private readonly scene: CanvasBackdropScene
  ) {}

  mount(host: HTMLElement, doc: Document, platform: WrPlatform, injector: Injector): void {
    // Nothing drawn under forced colours: the stylesheet hides the host too.
    if (doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;
    const canvas = this.canvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.platform = platform;
    this.view = doc.defaultView;
    this.scene.colors(canvas);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const rect = entries[entries.length - 1]?.contentRect;
        this.scheduleResize(rect?.width ?? host.clientWidth, rect?.height ?? host.clientHeight);
      });
      this.resizeObserver.observe(host);
    } else {
      this.resize(host.clientWidth, host.clientHeight);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.viewObserver = new IntersectionObserver(entries => {
        this.inView = entries[entries.length - 1]?.isIntersecting ?? false;
        this.sync();
      });
      this.viewObserver.observe(host);
    }

    watchColorScheme(
      () => {
        this.scene.colors(canvas);
        if (!this.running) this.draw();
      },
      { injector }
    );

    this.scene.mounted?.();
  }

  unmount(): void {
    this.running = false;
    this.stopLoop();
    if (this.resizeRafId !== null) cancelAnimationFrame(this.resizeRafId);
    this.resizeRafId = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.viewObserver?.disconnect();
    this.viewObserver = null;
    this.ctx = null;
  }

  /** Folds a burst of resize notifications into one layout, on the next frame. */
  private scheduleResize(width: number, height: number): void {
    this.pendingWidth = width;
    this.pendingHeight = height;
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.resize(this.pendingWidth, this.pendingHeight);
    });
  }

  private resize(width: number, height: number): void {
    if (!this.ctx || width <= 0 || height <= 0) return;
    const canvas = this.canvas();
    const dpr = canvasBackdropRatio(width, height, this.view?.devicePixelRatio ?? 1);
    this.width = width;
    this.height = height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scene.layout(width, height);
    this.draw();
    this.sync();
  }

  sync(): void {
    const platform = this.platform;
    if (!platform) return;
    const reduced = platform.prefersReducedMotion();
    const allowed = this.ctx !== null && this.width > 0 && this.inView && platform.pageVisible() && !reduced;
    const active = this.scene.active();
    if (!allowed && reduced && active) {
      this.scene.rest();
      this.draw();
    }
    const run = allowed && active;
    if (run === this.running) return;
    this.running = run;
    if (run) {
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
      return;
    }
    this.stopLoop();
  }

  draw(): void {
    if (!this.ctx || this.width === 0) return;
    this.scene.draw(this.ctx, this.width, this.height);
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly frame = (now: number): void => {
    this.rafId = null;
    if (!this.running) return;
    // A scene with a frame floor waits for it: the early frame is skipped
    // whole, and the one that is drawn gets the time of both.
    const floor = this.scene.frameMs ?? 0;
    if (floor > 0 && now - this.lastFrame + FRAME_FLOOR_SLACK < floor) {
      this.rafId = requestAnimationFrame(this.frame);
      return;
    }
    const dt = clamp(now - this.lastFrame, 0, MAX_FRAME_MS);
    this.lastFrame = now;
    this.scene.advance(dt);
    this.draw();
    if (!this.scene.active()) {
      this.running = false;
      return;
    }
    this.rafId = requestAnimationFrame(this.frame);
  };
}

/** The ratio to draw a `width` by `height` box at: the device's, capped at {@link MAX_DPR} and by {@link MAX_PIXELS}, never under one. */
export function canvasBackdropRatio(width: number, height: number, devicePixelRatio: number): number {
  const budget = Math.sqrt(MAX_PIXELS / (width * height));
  return Math.max(1, Math.min(MAX_DPR, devicePixelRatio, budget));
}

/**
 * What a canvas backdrop draws and moves. The plumbing around it (sizing,
 * colours, gates, the frame loop) is {@link createCanvasBackdrop}'s.
 */
export interface CanvasBackdropScene {
  /** Reads the scene's colours against `canvas`, at mount and whenever the colour scheme changes. */
  colors(canvas: HTMLCanvasElement): void;
  /** Lays the scene out for a new CSS size; the backing store and its transform are already set. */
  layout(width: number, height: number): void;
  /** Whether anything is left to move: the loop runs while this holds and the gates allow. */
  active(): boolean;
  /** Moves the scene `dt` ms on, before a frame's draw. */
  advance(dt: number): void;
  /** Paints the scene on `ctx`, in CSS px. */
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  /** Snaps the scene to its still state, when motion was reduced mid-flight; a draw follows. */
  rest(): void;
  /** Runs once the canvas has a context and is watched, after the first `colors`; for the scene's own listeners. */
  mounted?(): void;
  /**
   * The shortest frame the scene wants, in ms: a frame that comes sooner is
   * skipped and its time rolls into the next. For a scene that never rests,
   * where slow motion needs no more than 30fps; unset, every frame is drawn.
   */
  readonly frameMs?: number;
}

/** The plumbing side of a canvas backdrop, as the component sees it. */
export interface CanvasBackdrop {
  /** The drawing context while mounted, `null` on the server, under forced colours and after destroy. */
  readonly ctx: CanvasRenderingContext2D | null;
  /** The canvas's CSS size, zero until the first layout. */
  readonly width: number;
  readonly height: number;
  /** Whether the frame loop is on. */
  readonly running: boolean;
  /** Starts or stops the loop after the scene changed: the gates, then `scene.active()`. */
  sync(): void;
  /** Paints the scene once, outside the loop. */
  draw(): void;
}

/**
 * The plumbing every canvas backdrop needs: one canvas at the device ratio
 * capped at two and by a pixel budget, a `ResizeObserver` folded into one
 * frame, colours re-read when the scheme changes, and a frame loop that runs
 * only while the scene is `active()`, the host is on screen and the document is
 * visible, and that stops on its own at rest; a scene that sets `frameMs` is
 * drawn no more often than that. Under `prefers-reduced-motion:
 * reduce` the loop never runs and a scene caught moving is put to `rest()`;
 * under `forced-colors: active` nothing mounts; on the server nothing happens.
 *
 * Call it in a component's constructor: it injects the host, the platform and
 * the destroy hook, mounts after the first render and cleans up on destroy.
 * `canvas` is read at mount, so a `viewChild` works. The scene's own pointer
 * listeners go in `mounted`, their removal in the component's `DestroyRef`.
 */
export function createCanvasBackdrop(canvas: () => HTMLCanvasElement, scene: CanvasBackdropScene): CanvasBackdrop {
  const backdrop = new Backdrop(canvas, scene);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return backdrop;

  const platform = inject(WrPlatform);
  const doc = inject(DOCUMENT);
  const injector = inject(Injector);
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  effect(() => {
    platform.pageVisible();
    platform.prefersReducedMotion();
    backdrop.sync();
  });

  afterNextRender(() => backdrop.mount(host, doc, platform, injector));
  inject(DestroyRef).onDestroy(() => backdrop.unmount());

  return backdrop;
}

export { FRAME_FLOOR_SLACK, MAX_DPR, MAX_FRAME_MS, MAX_PIXELS };
