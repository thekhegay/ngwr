/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * After the Threads background idea on reactbits.dev
 * (https://www.reactbits.dev/backgrounds/threads), written for ngwr from
 * scratch: the original is a WebGL shader, this is a 2D canvas, and the motion,
 * the inputs and the names are this library's own.
 *
 * A 2D canvas rather than WebGL, deliberately. The picture is a few dozen thin
 * strokes, which a 2D context antialiases on its own; it boots with no shader to
 * compile, and it still draws on the machines that blocklist WebGL2.
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { clamp, numAttr, resolveCssColor, watchColorScheme } from 'ngwr/utils';

/** The theme's hook. A `color` input left at this, or emptied, follows the theme. */
const THEME_COLOR = 'var(--wr-threads-color)';

/** What a stroke falls back to when no colour resolves: the hook's light value, flattened. */
const FALLBACK_COLOR = 'rgba(57, 105, 226, 0.6)';

/** The most threads drawn. Past this the band is a fill, not strands, and the frame cost keeps climbing. */
const MAX_LINES = 100;

/** The thinnest stroke drawn, in CSS px. A canvas ignores a zero or negative `lineWidth` and keeps the last one. */
const MIN_LINE_WIDTH = 0.25;

/** Horizontal distance between the points a thread is curved through, in CSS px. */
const SAMPLE_STEP = 12;

/**
 * The most bitmap pixels the canvas is backed with — the same budget `wr-waves`
 * keeps, for the same reason: the field is redrawn every frame, so the backing
 * store is a per-frame cost, and a wide retina window steps down toward 1x
 * instead of growing a 3456-pixel bitmap.
 */
const MAX_CANVAS_PIXELS = 2_500_000;

/**
 * The longest step the current takes in one frame, in ms. A frame that arrives
 * late — a tab coming back, a long task — advances the threads by this much and
 * no more, so they never jump to a shape the reader did not see them reach.
 */
const MAX_FRAME_MS = 50;

/** How much fainter the outermost threads are than the middle one, 0..1. */
const EDGE_FADE = 0.6;

/** Share of the distance to the pointer a thread right under it bends. */
const POINTER_PULL = 0.55;

/** Per-frame easing of the pointer's position and of its pull. */
const POINTER_FOLLOW = 0.12;
const POINTER_FADE = 0.06;

const TAU = Math.PI * 2;

/** The golden angle, in radians: spaces each thread's ripple phase so no two neighbours move in step. */
const GOLDEN_ANGLE = 2.399963;

/**
 * Threads background — thin lines flowing across the box like strands in a
 * current. The bundle meanders as one, breathes wider and narrower along its
 * length, and every strand ripples on its own phase, so neighbours cross and
 * part. With `followPointer` the strands near the pointer bend gently toward
 * it. Fills its nearest positioned ancestor: put it first in a
 * `position: relative` box and give the content after it a position of its own.
 *
 * Decorative only: the canvas is `aria-hidden`, the host has no role and
 * nothing in it takes focus or a click.
 *
 * Under `prefers-reduced-motion` one still frame is drawn and nothing follows —
 * no current, no pointer listeners, no frame loop. The frame is drawn again when
 * an input changes, the box resizes or the colour scheme switches, and the
 * preference is read live, so switching it while the page is open takes effect
 * at once.
 *
 * At `speed` 0 with `followPointer` off nothing can move either, so the same
 * still frame is drawn — held where the current was — and no loop runs. At
 * `speed` 0 with the pointer followed, the loop runs and draws only while the
 * pointer is bending something.
 *
 * Off screen the loop stops asking for frames and resumes where it left off.
 *
 * The colour is theme-aware by default — `--wr-threads-color`, a soft wash of
 * the primary intent — and `[color]` takes any CSS colour instead, a `var()`
 * token or a `light-dark()` pair included. A canvas reads neither, so either is
 * resolved through the cascade before it reaches a stroke.
 *
 * Until the canvas has drawn — the seconds before hydration on a prerendered
 * page — the stylesheet paints the threads at rest as straight lines, at the
 * same count, colour, width and spread, and `.wr-threads--painted` retires them.
 *
 * @example
 * ```html
 * <section style="position: relative; min-height: 20rem">
 *   <wr-threads />
 *   <h1 style="position: relative">Hero copy above the threads</h1>
 * </section>
 * ```
 *
 * @see https://ngwr.dev/bits/threads
 */
@Component({
  selector: 'wr-threads',
  template: '<canvas #canvas class="wr-threads__canvas" aria-hidden="true"></canvas>',
  styleUrl: './threads.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-threads',
    '[class.wr-threads--painted]': 'painted()',
    // Feed the CSS stand-in (see styles/_rules.scss) so the straight lines it
    // draws before hydration sit where the canvas will put the threads.
    '[style.--wr-threads-color]': 'customColor()',
    '[style.--wr-threads-count]': 'count()',
    '[style.--wr-threads-spread]': 'bandShare()',
    '[style.--wr-threads-line-width.px]': 'strokeWidth()',
  },
})
export class WrThreads {
  /** How many threads, rounded and kept between 1 and 100. @default 18 */
  readonly lineCount = input(18, { transform: numAttr(18) });

  /**
   * Thread colour, any CSS colour — a `var()` token or a `light-dark()` pair
   * included. Emptied, it follows the theme. @default 'var(--wr-threads-color)'
   */
  readonly color = input(THEME_COLOR);

  /** How far the bundle meanders up and down, in px. @default 40 */
  readonly amplitude = input(40, { transform: numAttr(40) });

  /** Speed of the current; 0 holds it, a negative value reverses it. @default 1 */
  readonly speed = input(1, { transform: numAttr(1) });

  /** Stroke width of each thread, in px. @default 1 */
  readonly lineWidth = input(1, { transform: numAttr(1) });

  /** Share of the box height the threads fan across at their widest, 0..1. @default 0.4 */
  readonly spread = input(0.4, { transform: numAttr(0.4) });

  /** Whether the threads near the pointer bend toward it. @default true */
  readonly followPointer = input(true, { transform: coerceBooleanProperty });

  /** The thread count actually drawn. */
  protected readonly count = computed(() => clamp(Math.round(this.lineCount()), 1, MAX_LINES));

  /** The stroke width actually drawn. */
  protected readonly strokeWidth = computed(() => Math.max(MIN_LINE_WIDTH, this.lineWidth()));

  /** The band's share of the height. One thread has no band: it runs through the middle. */
  protected readonly bandShare = computed(() => (this.count() > 1 ? clamp(this.spread(), 0, 1) : 0));

  /**
   * A colour the author chose, written onto the host's own hook so the stand-in
   * draws in it too; `null` while the input is the theme's, which removes the
   * declaration and leaves the stylesheet's value in charge. Also `null` for an
   * expression built ON the hook — `color-mix(in srgb, var(--wr-threads-color)
   * 50%, transparent)` — which, written onto the hook itself, would be a cycle
   * and invalidate it: the canvas resolves such an expression against the theme's
   * value, and the stand-in keeps that value.
   */
  protected readonly customColor = computed(() => {
    const color = this.color().trim();
    return color === '' || color.includes('--wr-threads-color') ? null : color;
  });

  /**
   * Whether anything can change between two frames: never under
   * `prefers-reduced-motion`, read live, and not at `speed` 0 with no pointer to
   * follow. While it is `false` there is no loop, only a still frame.
   */
  private readonly moving = computed(
    () => !this.platform.prefersReducedMotion() && (this.speed() !== 0 || this.followPointer())
  );

  /**
   * Flips once the canvas has drawn, which retires the CSS stand-in. Set inside
   * the draw rather than at the end of the boot, so it can never switch the
   * stand-in off over a canvas with nothing on it.
   */
  protected readonly painted = signal(false);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx: CanvasRenderingContext2D | null = null;
  private bounds = { width: 0, height: 0 };
  private rafId = 0;

  /** Seconds of current so far, already scaled by `speed`. Kept across a parked loop, so it resumes in place. */
  private phase = 0;

  /** Eased pointer position in host px (`x`, `y`), where it is heading (`tx`, `ty`), and how hard it pulls, 0..1. */
  private readonly pointer = { x: 0, y: 0, tx: 0, ty: 0, inside: false, pull: 0 };

  /**
   * Per-sample buffers, reused frame to frame rather than allocated per thread:
   * one thread's heights, and the three terms every thread shares at a sample —
   * the bundle's meander, how wide the band is breathing, and the pointer's bell
   * along `x` — computed once per frame instead of once per thread.
   */
  private ys = new Float64Array(0);
  private meanders = new Float64Array(0);
  private breaths = new Float64Array(0);
  private alongs = new Float64Array(0);

  /**
   * Whether the picture changed since the loop last drew it — an input, the
   * colour scheme, a restart. The loop skips the frames that would only repeat
   * the last one (a held current, no pull), and this is what makes it draw again.
   */
  private dirty = true;

  /** Flips once `boot()` has a context — everything that draws waits for it. */
  private readonly booted = signal(false);

  /** Whether the host is in the viewport; stays `true` without an observer. */
  private readonly onScreen = signal(true);

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // A still frame stays as it was drawn, so with nothing moving every input
    // that changes the picture paints it again — and so does the moment motion
    // stops. A running loop is only told the picture changed: it skips the
    // frames that would repeat the last one, and draws the next one again.
    effect(() => {
      if (!this.booted()) return;
      const moving = this.moving();
      this.count();
      this.bandShare();
      this.amplitude();
      this.strokeWidth();
      this.color();
      untracked(() => this.repaint(moving));
    });

    // The same for the colour scheme: a stroke keeps the colour it was resolved
    // in, and nothing else redraws a still frame or a held loop.
    watchColorScheme(() => {
      if (this.booted()) this.repaint(this.moving());
    });

    // The current runs only while there is something to see: never while
    // nothing can move (see `moving`), and not while the host is off screen.
    // Toggling `followPointer` restarts it with or without the pointer listeners.
    effect(onCleanup => {
      if (!this.booted() || !this.onScreen() || !this.moving()) return;
      const follow = this.followPointer();
      onCleanup(untracked(() => this.zone.runOutsideAngular(() => this.animate(follow))));
    });
  }

  // Setup

  private boot(): void {
    const host = this.host.nativeElement;
    this.ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!this.ctx) return;

    this.setSize();

    // Resizing the bitmap clears it, so the frame is drawn again right away
    // rather than left blank until the next one: a ResizeObserver callback runs
    // after that frame's animation callbacks and before its paint.
    const onResize = (): void => {
      this.setSize();
      if (this.moving()) this.draw(this.phase);
      else this.drawStill();
    };
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    ro?.observe(host);

    // Off screen the loop stops asking for frames: a background redrawn out of
    // sight still costs the browser a frame every frame. Without an observer
    // (jsdom) the host simply counts as visible.
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => this.onScreen.set(entries[entries.length - 1].isIntersecting));
    io?.observe(host);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      io?.disconnect();
    });
    this.booted.set(true);
  }

  /** Start the current, and the pointer listeners when asked; returns what stops both. */
  private animate(follow: boolean): () => void {
    const stopPointer = follow ? this.listenToPointer() : null;
    let last = -1;
    // A frame already handed to the browser can still arrive after the stop —
    // a held or polyfilled scheduler does not always honour the cancel — and a
    // late one must not draw, nor schedule a loop nobody will stop again.
    let stopped = false;
    // The canvas holds whatever was drawn before the loop stopped, which may not
    // be the picture now: the first frame always draws.
    this.dirty = true;
    const tick = (now: number): void => {
      if (stopped) return;
      const phase = this.phase;
      if (last >= 0) this.phase += (clamp(now - last, 0, MAX_FRAME_MS) / 1000) * this.speed();
      last = now;
      const pulled = this.pointer.pull > 0;
      this.easePointer();
      // A frame with the current where it was and no pull, now or on the last
      // frame, would draw exactly what is already on the canvas — the case of
      // `speed` 0 with the pointer outside the box.
      if (this.dirty || this.phase !== phase || pulled || this.pointer.pull > 0) this.draw(this.phase);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      stopPointer?.();
    };
  }

  /**
   * Track the pointer against the host's box. On `window`, not the host: the
   * content laid over the threads takes the events, and the host takes none.
   * `pointerleave` on the root element covers the rest — the pointer leaving the
   * page, and a finger lifting or a touch turning into a scroll, after which a
   * touch pointer no longer exists.
   */
  private listenToPointer(): () => void {
    const root = this.doc.documentElement;
    const onMove = (event: PointerEvent): void => {
      // Re-read the box on each move: cheaper than tracking scroll, and a
      // background rarely reflows mid-gesture. The rect is the box as DRAWN,
      // after any ancestor's transform, while the threads are drawn in the
      // layout box (see `setSize`), so the position is scaled from one to the
      // other — under a `scale()` the two differ, and the bend would land beside
      // the pointer.
      const rect = this.host.nativeElement.getBoundingClientRect();
      const { width, height } = this.bounds;
      const pointer = this.pointer;
      pointer.tx = (event.clientX - rect.left) * (rect.width > 0 ? width / rect.width : 1);
      pointer.ty = (event.clientY - rect.top) * (rect.height > 0 ? height / rect.height : 1);
      pointer.inside = pointer.tx >= 0 && pointer.ty >= 0 && pointer.tx <= width && pointer.ty <= height;
      // Arriving with no pull left, the bend starts where the pointer IS rather
      // than sweeping over from wherever it last let go.
      if (pointer.pull < 0.01) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
    };
    const onLeave = (): void => {
      this.pointer.inside = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      this.releasePointer();
    };
  }

  private easePointer(): void {
    const pointer = this.pointer;
    pointer.x += (pointer.tx - pointer.x) * POINTER_FOLLOW;
    pointer.y += (pointer.ty - pointer.y) * POINTER_FOLLOW;
    pointer.pull += ((pointer.inside ? 1 : 0) - pointer.pull) * POINTER_FADE;
    if (!pointer.inside && pointer.pull < 0.001) pointer.pull = 0;
  }

  private releasePointer(): void {
    this.pointer.inside = false;
    this.pointer.pull = 0;
  }

  /**
   * Size the bitmap and the drawing space from the LAYOUT box, never from
   * `getBoundingClientRect()`, which is the box after every ancestor's
   * transform. A `ResizeObserver` does not fire when only a transform changes,
   * so a boot inside an opening `wr-dialog` — which enters from `scale(0.96)` —
   * would otherwise keep a bitmap 4% too small, stretched soft, until the
   * window next resized.
   */
  private setSize(): void {
    const host = this.host.nativeElement;
    const width = host.clientWidth;
    const height = host.clientHeight;
    this.bounds = { width, height };
    const canvas = this.canvasRef().nativeElement;
    // Backed at the screen's pixel ratio, capped at 2 and by the pixel budget,
    // never below 1 — a bitmap the size of the CSS box smears a 1px thread
    // across two device pixels on a 2x screen.
    const area = width * height;
    const budget = area > 0 ? Math.sqrt(MAX_CANVAS_PIXELS / area) : 2;
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, budget));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // Resizing the bitmap resets the context, transform included, so the scale
    // goes on afterwards. Every coordinate below stays in CSS pixels.
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // Drawing

  /**
   * The frame shown while nothing moves, with no pointer: under reduced motion
   * the current at its start, and at `speed` 0 with nothing to follow, the
   * current where it was held.
   */
  private drawStill(): void {
    this.releasePointer();
    this.draw(this.platform.prefersReducedMotion() ? 0 : this.phase);
  }

  /** Bring the canvas up to date after the picture changed: a still frame now, or the loop's next one. */
  private repaint(moving: boolean): void {
    if (moving) this.dirty = true;
    else this.drawStill();
  }

  /**
   * One frame of the field at `time` seconds of current.
   *
   * Each thread's height at `x` is the sum of three things: a meander the whole
   * bundle shares, the thread's place in the band — scaled by how wide the band
   * is breathing at that `x` — and a ripple of the thread's own, whose phase is
   * spaced by the golden angle and whose wavelength grows toward the edges, so
   * neighbours drift in and out of step. Wavelengths are in px rather than in
   * shares of the width, so a phone and a wide monitor show the same current.
   * The pointer then pulls each height toward its own, weighted by a bell in
   * both directions.
   */
  private draw(time: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.painted()) this.painted.set(true);
    this.dirty = false;

    const { width, height } = this.bounds;
    ctx.clearRect(0, 0, width, height);

    const count = this.count();
    const amplitude = this.amplitude();
    const band = height * this.bandShare();
    const middle = height / 2;
    const samples = Math.max(2, Math.ceil(width / SAMPLE_STEP) + 1);
    const last = samples - 1;
    if (this.ys.length < samples) {
      this.ys = new Float64Array(samples);
      this.meanders = new Float64Array(samples);
      this.breaths = new Float64Array(samples);
      this.alongs = new Float64Array(samples);
    }
    const { ys, meanders, breaths, alongs } = this;

    const pointer = this.pointer;
    const pull = pointer.pull;
    const reachX = Math.max(100, width * 0.15);
    const reachY = Math.max(60, band * 0.75 + Math.abs(amplitude));
    const spreadX = 1 / (2 * reachX * reachX);
    const spreadY = 1 / (2 * reachY * reachY);

    // What depends only on `x` and the time, shared by every thread.
    for (let s = 0; s < samples; s++) {
      const x = s === last ? width : s * SAMPLE_STEP;
      meanders[s] =
        0.55 * Math.sin(x * (TAU / 1100) - time * 0.7) + 0.25 * Math.sin(x * (TAU / 520) + time * 0.45 + 1.7);
      breaths[s] = 0.65 + 0.35 * Math.sin(x * (TAU / 760) + time * 0.5 + 0.6);
      if (pull > 0) {
        const dx = x - pointer.x;
        alongs[s] = Math.exp(-dx * dx * spreadX);
      }
    }

    ctx.strokeStyle = this.resolveColor();
    ctx.lineWidth = this.strokeWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let line = 0; line < count; line++) {
      const place = count === 1 ? 0 : line / (count - 1) - 0.5;
      const outward = Math.abs(place) * 2;
      const seed = line * GOLDEN_ANGLE;
      const rippleK = TAU / (260 + outward * 200);

      for (let s = 0; s < samples; s++) {
        const x = s === last ? width : s * SAMPLE_STEP;
        const ripple = 0.22 * Math.sin(x * rippleK - time * 1.4 + seed);
        let y = middle + amplitude * (meanders[s] + ripple) + place * band * breaths[s];
        if (pull > 0) {
          const along = alongs[s];
          if (along > 0.002) {
            const dy = pointer.y - y;
            y += dy * POINTER_PULL * pull * along * Math.exp(-dy * dy * spreadY);
          }
        }
        ys[s] = y;
      }

      // The outer threads fade, which reads as depth: the middle of the bundle
      // in front, its edges behind.
      ctx.globalAlpha = 1 - EDGE_FADE * outward;
      ctx.beginPath();
      ctx.moveTo(0, ys[0]);
      // A curve through the MIDPOINTS, with each sample as its control, the way
      // `wr-waves` bends its lines: consecutive curves share a tangent where they
      // meet, so the thread has no corner anywhere.
      for (let s = 1; s < last; s++) {
        const x = s * SAMPLE_STEP;
        const next = s + 1 === last ? width : x + SAMPLE_STEP;
        ctx.quadraticCurveTo(x, ys[s], (x + next) / 2, (ys[s] + ys[s + 1]) / 2);
      }
      ctx.lineTo(width, ys[last]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * The input, or the theme's hook when it is emptied, resolved through the
   * cascade: `strokeStyle` reads neither a custom property nor a `light-dark()`.
   * Called on every draw, so a scheme switch lands on the next frame.
   */
  private resolveColor(): string {
    const expression = this.color().trim() || THEME_COLOR;
    return resolveCssColor(this.canvasRef().nativeElement, expression, FALLBACK_COLOR);
  }
}
