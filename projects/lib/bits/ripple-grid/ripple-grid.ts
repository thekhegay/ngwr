/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * After the Ripple Grid background on reactbits.dev
 * (https://www.reactbits.dev/backgrounds/ripple-grid). The idea is the same;
 * the code is ngwr's own: the original is a WebGL shader, this is a 2D canvas
 * of grid lines bent by rings that travel out from the pointer, and a frame
 * loop that sleeps whenever no ring is alive.
 *
 * A 2D canvas rather than WebGL, deliberately. The picture is a few dozen
 * hairlines, which a 2D context antialiases on its own; the bend is evaluated
 * only along the stretch of each line a ring can reach, so a still grid is
 * two points per line; it boots with no shader to compile, and it still draws
 * on the machines that blocklist WebGL2.
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
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

/** One ring, in the host's layout box. */
interface Ripple {
  readonly x: number;
  readonly y: number;
  /** Milliseconds since it left its origin. */
  age: number;
  /** Its strength as a share of `strength`: a press is 1, a move or an idle ripple less. */
  readonly share: number;
}

/** A ring asked for since the last frame; the next frame places it. */
interface Pending {
  readonly x: number;
  readonly y: number;
  readonly share: number;
  /** Whether `x` and `y` are viewport coordinates (a pointer) rather than the box's own (the idle ripple). */
  readonly client: boolean;
}

/**
 * One alpha step's lit stretches, as polylines packed end to end into buffers that
 * keep their capacity frame to frame: `points` holds `[x, y, x, y, …]` with `length`
 * entries in use, `starts` the index in `points` where each run begins, `runs` in use.
 */
interface GlowRuns {
  points: Float64Array;
  length: number;
  starts: Uint32Array;
  runs: number;
}

/** What a frame needs to know about a live ring, worked out once per frame rather than once per sample. */
interface Ring {
  x: number;
  y: number;
  /** Distance the crest has travelled, in px. */
  radius: number;
  /** The band the ring reaches, from `inner` to `outer` px from its origin, and both squared. */
  inner: number;
  outer: number;
  inner2: number;
  outer2: number;
  /** Displacement at the crest before the overlap budget, in px; negative pulls inward. */
  raw: number;
  /** Displacement at the crest as drawn, within the overlap budget, in px. */
  push: number;
  /** Glow at the crest, 0..1. */
  glow: number;
}

/**
 * The most bitmap pixels the canvas is backed with, the bound `wr-waves` and
 * `wr-dot-grid` keep. On a 2x screen a box up to 625,000 CSS px² (1000 × 625)
 * keeps the full 2x; past that the canvas drops to 1x outright rather than to a
 * fraction between, because a fractional bitmap is resampled onto the screen and
 * draws neighbouring hairlines at visibly different weights (see `pixelRatio()`).
 */
const MAX_CANVAS_PIXELS = 2_500_000;

/**
 * The smallest cell the grid is laid out at. Under 12px the lines read as a
 * fill rather than a grid, and a full-page host would be hundreds of lines for
 * every ring to bend.
 */
const MIN_CELL = 12;

/** The thinnest line drawn, in px. A canvas ignores a zero or negative `lineWidth` and keeps the last one. */
const MIN_LINE_WIDTH = 0.25;

/** A 60 Hz frame, in ms: what the first frame of a run advances by, with no frame before it to measure from. */
const FRAME_MS = 1000 / 60;

/** The longest step one frame may take, in ms, so a tab that wakes after a pause does not jump the rings. */
const MAX_FRAME_MS = 50;

/** A ring's half-width as a share of the cell, so a fine grid and a coarse one show the same ripple. */
const RING_SHARE = 0.75;

/** Bounds on that half-width, in px. */
const MIN_RING = 16;
const MAX_RING = 60;

/** How far either side of its crest a ring still bends anything, in half-widths: past 3 the bell is under 0.02%. */
const RING_REACH = 3;

/** The shortest distance between the points a bent line is drawn through, in px. */
const MIN_SAMPLE = 6;

/** Distance the pointer travels between two ripples it leaves behind, in cells, and never under 32px. */
const MOVE_SPACING = 2;
const MIN_MOVE_SPACING = 32;

/** Strength of a ripple a moving pointer leaves, and of an idle ripple, as a share of a press. */
const MOVE_SHARE = 0.4;
const IDLE_SHARE = 0.6;

/** The shortest idle interval, in ms: shorter would stack rings at the centre faster than they spread. */
const MIN_IDLE_MS = 500;

/**
 * The most rings alive at once. A new one past it replaces the faintest live
 * ring, the oldest of the faintest on a tie, and is dropped itself when every
 * live ring is still stronger than it starts out — a trail ring among presses.
 */
const MAX_RIPPLES = 16;

/**
 * The longest a ring lives, in ms, fading out over the last `FADE_MS` of it.
 * Only `speed` 0 with `decay` 0 ever reaches it — a ring that neither travels
 * nor fades would otherwise keep the loop running for good.
 */
const MAX_AGE_MS = 6000;
const FADE_MS = 1000;

/**
 * The bend at a ring's crest, as a share of the ring's half-width, that the
 * rings reaching any one point may add up to: what keeps the grid from folding.
 *
 * A line folds back over itself where the field's slope reaches 1. One ring's
 * slope is at most 2.3 × its crest bend ÷ its half-width — measured over every
 * radius, the steepest point being where the ease into the origin meets the
 * crest's flank — and the slopes of overlapping rings add. Held to 0.39 of a
 * half-width, the summed slope stays under 0.9 wherever the rings overlap, so a
 * line keeps its course and its neighbours' order however hard it is pressed:
 * 11.7px at the default cell. Bounding the summed BEND instead, point by point,
 * folds anyway, and kinks the lines where the sum crosses the bound.
 */
const PUSH_PER_WIDTH = 0.39;

/**
 * How long a ring takes to reach its full bend, in ms. Born at full strength it
 * would take its share of the overlap budget in one frame and shrink every ring
 * it overlaps by a step; ramped in, they give way smoothly. At the default speed
 * the crest is still inside its first half-width by then, where the ease keeps
 * the bend small anyway.
 */
const BIRTH_MS = 100;

/** Alpha steps the lit stretches are batched into, one path and one stroke each. */
const GLOW_LEVELS = 16;

/** Below this a ring's glow rounds to no alpha step at all. */
const GLOW_REST = 1 / (2 * GLOW_LEVELS);

/** Below this, in px, a ring's displacement counts as gone. */
const PUSH_REST = 0.1;

/** What the lines fall back to when the colour cannot be read: `--wr-border-base` in light. */
const LINE_FALLBACK = 'rgb(209, 213, 219)';

/** What the lit stretches fall back to: the shipped primary. */
const RIPPLE_FALLBACK = 'rgb(57, 105, 226)';

/** The colours an unset, empty or blank input leaves to the hooks. */
const LINE_TOKEN = 'var(--wr-ripple-grid-line-color)';
const RIPPLE_TOKEN = 'var(--wr-ripple-grid-ripple-color)';

/** An empty run list for one alpha step, with room for a few lit stretches before it first grows. */
const glowRuns = (): GlowRuns => ({ points: new Float64Array(256), length: 0, starts: new Uint32Array(32), runs: 0 });

/** Open a new lit run at `(x0, y0)` – `(x1, y1)`, growing the buffers only when they are full. */
function startRun(level: GlowRuns, x0: number, y0: number, x1: number, y1: number): void {
  if (level.runs === level.starts.length) {
    const starts = new Uint32Array(level.starts.length * 2);
    starts.set(level.starts);
    level.starts = starts;
  }
  level.starts[level.runs++] = level.length;
  addPoint(level, x0, y0);
  addPoint(level, x1, y1);
}

/** Carry the open run on to `(x, y)`. */
function addPoint(level: GlowRuns, x: number, y: number): void {
  if (level.length + 2 > level.points.length) {
    const points = new Float64Array(level.points.length * 2);
    points.set(level.points);
    level.points = points;
  }
  level.points[level.length++] = x;
  level.points[level.length++] = y;
}

/**
 * A line position moved so its stroke's edges fall on bitmap pixel boundaries:
 * `stroke` bitmap pixels wide at `ratio` bitmap pixels per CSS pixel. A 1px line
 * left on a pixel boundary covers two pixels at half alpha — at 1x every line of
 * the grid did — and at a fractional ratio neighbouring lines land on different
 * fractions and draw at visibly different weights. A stroke under one bitmap
 * pixel goes on a pixel's centre: Skia draws it as a one-pixel hairline at
 * reduced alpha, which only lands inside a single pixel from there.
 */
function snap(position: number, ratio: number, stroke: number): number {
  const width = Math.max(1, stroke);
  return (Math.round(position * ratio - width / 2) + width / 2) / ratio;
}

/**
 * Ripple-grid background — thin grid lines on a 2D canvas that the pointer
 * sends ripples through. A press sends out a ring that travels outward, bends
 * the lines it passes away from where it started and lights them in the ripple
 * colour, and fades as it goes; with `rippleOnMove` a moving pointer leaves a
 * trail of softer rings behind it. Fills its nearest positioned ancestor; put
 * it behind hero copy or section content.
 *
 * With nothing pressed or moved the grid is still, and asks for no frames at
 * all. `idleInterval` sends a softer ring out from the centre every so many
 * milliseconds on its own; it is off by default, so a page that wants a grid
 * which moves before anyone touches it asks for one. Each ring lives until it
 * has faded or left the box, and never longer than six seconds.
 *
 * The pointer is followed on the host's PARENT, with passive listeners, so the
 * grid answers a pointer that is over the content in front of it rather than
 * over the canvas — the host itself takes no pointer events and never steals a
 * click. Placed directly in a shadow root, where it has no parent element, it
 * follows the pointer on the shadow host; with neither it listens nowhere, and
 * only an idle ring ever moves it. Content placed after it needs
 * `position: relative` (or any z-index) to paint above it, as with any
 * absolutely positioned layer.
 *
 * The grid is laid out in the host's own box, before transforms, so one that
 * boots inside a scaling-in panel (a dialog opening) is not stretched when the
 * animation ends, and the pointer is mapped back through the transform.
 *
 * Decorative: the canvas is `aria-hidden`, the host has no role and nothing in
 * it takes focus. The frame loop runs only while a ring is alive, and never
 * while the host is off screen; an idle ring comes due only while frames run,
 * so a hidden tab does not queue them up.
 *
 * Under `prefers-reduced-motion` one still grid is drawn, in the line colour,
 * with no ripples, no idle rings and no pointer listeners; it is drawn again
 * when an input, the box or the page's colour scheme changes. The preference
 * is read live, and switching it on drops the rings already travelling.
 *
 * Colours are theme tokens by default — the lines `--wr-border-base`, the lit
 * stretches `--wr-color-primary` — through the `--wr-ripple-grid-line-color`
 * and `--wr-ripple-grid-ripple-color` hooks, and resolved before they reach
 * the canvas, which reads neither a `var()` nor a `light-dark()`.
 *
 * Until the canvas has drawn — the seconds before hydration on a prerendered
 * page — the stylesheet paints the same grid, at the same cell, width and
 * colour, and `.wr-ripple-grid--painted` retires it.
 *
 * @example
 * ```html
 * <section style="position: relative; min-height: 24rem; overflow: hidden">
 *   <wr-ripple-grid />
 *   <h1 style="position: relative">Hero copy above the grid</h1>
 * </section>
 * ```
 *
 * @see https://ngwr.dev/bits/ripple-grid
 */
@Component({
  selector: 'wr-ripple-grid',
  template: '<canvas #canvas class="wr-ripple-grid__canvas" aria-hidden="true"></canvas>',
  styleUrl: './ripple-grid.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-ripple-grid',
    // Feed the CSS stand-in grid (see `styles/_rules.scss`) so it draws at the
    // real cell, width and colour, and switch it off once the canvas has painted.
    '[style.--wr-ripple-grid-cell-size.px]': 'cell()',
    '[style.--wr-ripple-grid-line-width.px]': 'stroke()',
    '[style.--wr-ripple-grid-line-color]': 'standInColor()',
    '[class.wr-ripple-grid--painted]': 'painted()',
  },
})
export class WrRippleGrid {
  /** Distance between grid lines in px, never under 12. @default 40 */
  readonly cellSize = input(40, { transform: numAttr(40) });

  /** Line colour, any CSS colour. When unset, `--wr-ripple-grid-line-color` decides. */
  readonly lineColor = input<string | null>(null);

  /** Colour a line takes where a ripple passes, any CSS colour. When unset, `--wr-ripple-grid-ripple-color` decides. */
  readonly rippleColor = input<string | null>(null);

  /** Line width in px, never under 0.25. @default 1 */
  readonly lineWidth = input(1, { transform: numAttr(1) });

  /**
   * How far a fresh ripple from a press bends the lines at its crest, in px;
   * a ripple the moving pointer leaves bends them 40% as far. `0` keeps the
   * lines straight and only lights them, and a negative value bends them
   * inward. A bend steep enough to fold a line back over itself is never
   * drawn: one ring, or several where they overlap, bends a line at most about
   * 0.3 of a cell for cells from 22 to 80px — 11.7px at the default 40 — and
   * rings that overlap share that bound rather than adding past it. @default 10
   */
  readonly strength = input(10, { transform: numAttr(10) });

  /** How fast a ripple travels outward, in px per second; `0` keeps it where it started. @default 320 */
  readonly speed = input(320, { transform: numAttr(320) });

  /**
   * How fast a ripple fades, per second: its strength is multiplied by
   * `e^-decay` every second, so `1.4` halves it in half a second. `0` keeps it
   * at full strength until it leaves the box. @default 1.4
   */
  readonly decay = input(1.4, { transform: numAttr(1.4) });

  /** Whether a moving pointer leaves ripples behind it, and not only a press. @default true */
  readonly rippleOnMove = input(true, { transform: coerceBooleanProperty });

  /**
   * Milliseconds between the softer ripples sent out from the centre on their
   * own, never under 500; `0` sends none, and the grid then stays still until
   * the pointer moves it. @default 0
   */
  readonly idleInterval = input(0, { transform: numAttr(0) });

  /** The cell the grid is laid out at: `cellSize`, floored. */
  protected readonly cell = computed(() => Math.max(MIN_CELL, this.cellSize()));

  /** The line width drawn: `lineWidth`, floored. */
  protected readonly stroke = computed(() => Math.max(MIN_LINE_WIDTH, this.lineWidth()));

  /**
   * A line colour the author chose, written onto the host's own hook so the
   * stand-in draws in it too; `null` while the input is unset, which leaves the
   * stylesheet's value in charge. Also `null` for an expression built ON the
   * hook — `color-mix(in srgb, var(--wr-ripple-grid-line-color) 50%,
   * transparent)` — which, written onto the hook itself, would be a cycle and
   * invalidate it: the canvas resolves such an expression against the theme's
   * value, and the stand-in keeps that value.
   */
  protected readonly standInColor = computed(() => {
    const color = this.lineColor()?.trim() ?? '';
    return color === '' || color.includes('--wr-ripple-grid-line-color') ? null : color;
  });

  /** The colours the canvas resolves: an input that is unset, empty or blank leaves the hook in charge. */
  private readonly lineExpression = computed(() => (this.lineColor() ?? '').trim() || LINE_TOKEN);
  private readonly rippleExpression = computed(() => (this.rippleColor() ?? '').trim() || RIPPLE_TOKEN);

  /** The idle interval in force, in ms; 0 when there is none. */
  private readonly idle = computed(() => {
    const interval = this.idleInterval();
    return interval > 0 ? Math.max(MIN_IDLE_MS, interval) : 0;
  });

  /** A ring's half-width, in px: a share of the cell, within bounds. */
  private readonly ringWidth = computed(() => clamp(this.cell() * RING_SHARE, MIN_RING, MAX_RING));

  /**
   * Flips once the canvas has drawn, which retires the CSS stand-in grid.
   *
   * A canvas cannot be prerendered, so on an SSR'd page it is blank until the
   * bundle has loaded and hydrated. The stylesheet paints the same lines at the
   * same cell from the prerendered HTML in the meantime, and this hands over.
   */
  protected readonly painted = signal(false);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx: CanvasRenderingContext2D | null = null;
  /** The host's layout box, in CSS pixels before any transform: what the grid is laid out in. */
  private box = { width: 0, height: 0 };
  /** Bitmap pixels per CSS pixel the canvas is backed at; 0 until the first fit. */
  private ratio = 0;
  private readonly ripples: Ripple[] = [];
  private readonly pending: Pending[] = [];
  /** The live rings as this frame draws them, reused frame to frame. */
  private readonly rings: Ring[] = [];
  private ringCount = 0;
  /** The rings that reach the line being traced, reused line to line. */
  private readonly near: Ring[] = [];
  /** Lit stretches by alpha step, reused frame to frame. */
  private readonly lit: GlowRuns[] = Array.from({ length: GLOW_LEVELS }, glowRuns);
  private anyLit = false;
  /** Where the last trail ripple was left, in viewport coordinates, while the pointer is over the parent. */
  private readonly anchor = { x: 0, y: 0, set: false };
  /** The ring half-width and sample step this frame draws with, read once rather than per sample. */
  private frameRing = MIN_RING;
  private frameStep = MIN_SAMPLE;
  /** One sample, displaced: written by `displace()`, read straight after. */
  private sx = 0;
  private sy = 0;
  private sg = 0;
  private rafId = 0;
  private lastTime = -1;
  /** The frame callback, made once rather than a closure per frame. */
  private readonly frame = (time: number): void => this.tick(time);
  /** Whether the idle timer has fired and the next frame owes the centre a ring. */
  private idleDue = false;
  /** Schedules a frame while motion is allowed; `null` under reduced motion. */
  private wake: (() => void) | null = null;
  /** Arms the next idle ring while motion is allowed; `null` under reduced motion. */
  private armIdle: (() => void) | null = null;

  /** Flips once `boot()` has a context and a box — everything after waits for it. */
  private readonly booted = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // Everything that changes the picture only changes what the next frame
    // draws. A sleeping loop or a still grid has no next frame, so ask for one.
    // `speed` and `decay` are left out: with no ring alive they change nothing
    // on screen, and with one alive the loop is already running.
    effect(() => {
      this.cell();
      this.stroke();
      this.lineColor();
      this.rippleColor();
      this.strength();
      untracked(() => this.requestDraw());
    });

    // A drawn grid keeps the colours it was drawn in, and the loop sleeps when
    // nothing moves, so a scheme switch asks for a frame to re-resolve them.
    watchColorScheme(() => this.requestDraw());

    // Motion or a still grid, decided live. Toggling `rippleOnMove` or the idle
    // interval restarts the listeners and the timer; rings already travelling
    // carry on.
    effect(onCleanup => {
      if (!this.booted()) return;
      if (this.platform.prefersReducedMotion()) {
        untracked(() => {
          this.rest();
          this.draw();
        });
        return;
      }
      const trail = this.rippleOnMove();
      const idle = this.idle();
      onCleanup(untracked(() => this.zone.runOutsideAngular(() => this.interact(trail, idle))));
    });
  }

  // Setup

  private boot(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    // `clientWidth` and not `getBoundingClientRect()`: the rect is the box after
    // transforms, so a grid booted inside a dialog's scale-in would be laid out
    // for 96% of its box and stretched by CSS once the animation ended. The
    // observer's first entry follows with the exact, sub-pixel size.
    const hostEl = this.host.nativeElement;
    this.fit(hostEl.clientWidth, hostEl.clientHeight);

    // The box is the observer's to follow, transforms excluded. A window resize
    // is for the pixel ratio, which browser zoom and a move to another screen
    // change with no box change at all.
    const onResize = (): void => this.resize(this.box.width, this.box.height);
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(entries => {
      const rect = entries[entries.length - 1]?.contentRect;
      if (rect) this.resize(rect.width, rect.height);
    });
    ro.observe(hostEl);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    });
    this.booted.set(true);
  }

  /** Follow the pointer, keep the idle timer and draw on demand; returns what stops all three. */
  private interact(trail: boolean, interval: number): () => void {
    const hostEl = this.host.nativeElement;
    // The parent, not the host: content in front of the canvas receives the
    // pointer, and its events bubble to the parent, never to a sibling. Placed
    // directly in a shadow root it has none, and the shadow host is where those
    // composed events land. Never the host itself, which takes no pointer
    // events and so could never hear one.
    const root = hostEl.getRootNode();
    const target =
      hostEl.parentElement ?? (root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null);

    // Off screen the grid asks for no frames, keeps no timer and takes no
    // pointer. Without an observer (jsdom) it counts as visible.
    let visible = typeof IntersectionObserver === 'undefined';
    let idleTimer = 0;
    const wake = (): void => {
      if (visible && this.rafId === 0) this.rafId = requestAnimationFrame(this.frame);
    };
    // Re-armed from the frame that places the ring rather than from the timer
    // itself, so a background tab — no frames, timers still firing — owes the
    // centre one ring at most, not one per interval it was away.
    const armIdle = (): void => {
      if (interval <= 0 || !visible || idleTimer !== 0 || this.idleDue) return;
      idleTimer = window.setTimeout(() => {
        idleTimer = 0;
        this.idleDue = true;
        wake();
      }, interval);
    };
    const halt = (): void => {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.lastTime = -1;
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    };

    const onDown = (event: PointerEvent): void => {
      if (!visible) return;
      this.emit(event.clientX, event.clientY, 1);
      wake();
    };
    // The first move only marks where the pointer came in: a ring on arrival
    // would ripple the grid every time the pointer crossed into the section.
    const onMove = (event: PointerEvent): void => {
      if (!visible) return;
      const anchor = this.anchor;
      const spacing = Math.max(MIN_MOVE_SPACING, this.cell() * MOVE_SPACING);
      if (anchor.set && Math.hypot(event.clientX - anchor.x, event.clientY - anchor.y) < spacing) return;
      if (anchor.set) {
        this.emit(event.clientX, event.clientY, MOVE_SHARE);
        wake();
      } else {
        anchor.x = event.clientX;
        anchor.y = event.clientY;
        anchor.set = true;
      }
    };
    const onLeave = (): void => {
      this.anchor.set = false;
    };
    target?.addEventListener('pointerdown', onDown, { passive: true });
    if (trail) {
      target?.addEventListener('pointermove', onMove, { passive: true });
      target?.addEventListener('pointerleave', onLeave, { passive: true });
      target?.addEventListener('pointercancel', onLeave, { passive: true });
    }

    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => {
            visible = entries[entries.length - 1].isIntersecting;
            if (visible) {
              wake();
              armIdle();
            } else {
              halt();
            }
          });
    io?.observe(hostEl);

    this.wake = wake;
    this.armIdle = armIdle;
    wake();
    armIdle();

    return () => {
      target?.removeEventListener('pointerdown', onDown);
      if (trail) {
        target?.removeEventListener('pointermove', onMove);
        target?.removeEventListener('pointerleave', onLeave);
        target?.removeEventListener('pointercancel', onLeave);
      }
      io?.disconnect();
      halt();
      this.wake = null;
      this.armIdle = null;
      this.idleDue = false;
      this.anchor.set = false;
    };
  }

  /** Queue a ring at a viewport point for the next frame, and mark the point for the trail. */
  private emit(clientX: number, clientY: number, share: number): void {
    this.pending.push({ x: clientX, y: clientY, share, client: true });
    this.anchor.x = clientX;
    this.anchor.y = clientY;
    this.anchor.set = true;
  }

  /** Draw the grid as it should look now: a frame while motion is allowed, at once under reduced motion. */
  private requestDraw(): void {
    if (!this.booted()) return;
    if (this.wake) this.wake();
    else if (this.platform.prefersReducedMotion()) this.draw();
  }

  /** Fit the canvas to a new box or pixel ratio and, when that cleared it, repaint at once. */
  private resize(width: number, height: number): void {
    if (!this.fit(width, height)) return;
    // Observer entries arrive after the frame's own callbacks and before its
    // paint, so a frame asked for here would leave this one blank — with the
    // stand-in already retired, a resize drag would flicker every frame. The
    // rings keep their place in the box; a running loop simply carries on.
    this.draw();
  }

  /**
   * Back the canvas for a `width` × `height` box, in CSS pixels, at the screen's
   * pixel ratio. Returns whether anything changed: writing `canvas.width` clears
   * the bitmap even to the value it already has, so an unchanged box is left alone.
   */
  private fit(width: number, height: number): boolean {
    const ratio = this.pixelRatio(width * height);
    if (width === this.box.width && height === this.box.height && ratio === this.ratio) return false;

    this.box = { width, height };
    this.ratio = ratio;
    const canvas = this.canvasRef().nativeElement;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // Resizing the bitmap resets the transform, so the scale goes on after it.
    // Every coordinate the draw uses is in CSS pixels.
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    return true;
  }

  /**
   * Bitmap pixels per CSS pixel for a box of `area` CSS px². The screen's own
   * ratio when it fits under 2 and the pixel budget, so a bitmap pixel is a
   * device pixel and a snapped line lands on whole device pixels; otherwise the
   * largest whole fraction of it that fits — a half, a third — so each bitmap
   * pixel still covers a whole number of device pixels and every line keeps one
   * weight. A ratio between (1.31 on a 2x screen) is resampled onto the screen
   * by a fraction, which no snapping survives. Never below 1 on a 1x screen or
   * better: a 1.5x screen past the budget takes 1 and accepts the resampling,
   * rather than a bitmap coarser than the CSS box.
   */
  private pixelRatio(area: number): number {
    const device = window.devicePixelRatio || 1;
    const limit = Math.min(2, area > 0 ? Math.sqrt(MAX_CANVAS_PIXELS / area) : 2);
    let ratio = device;
    for (let k = 2; ratio > limit; k++) ratio = device / k;
    return ratio < 1 ? Math.min(1, device) : ratio;
  }

  /** No ring alive, none queued, none owed. */
  private rest(): void {
    this.ripples.length = 0;
    this.pending.length = 0;
    this.idleDue = false;
    this.anchor.set = false;
  }

  // Frame loop

  private tick(time: number): void {
    this.rafId = 0;
    // A ring is a function of its age, so stepping it by the time that really
    // passed is what keeps a 120 Hz screen from running it twice as fast. A
    // timestamp that did not advance counts as one 60 Hz frame, and so does
    // the first frame of a run, which has nothing to measure from.
    const elapsed = time - this.lastTime;
    const step = this.lastTime < 0 || elapsed <= 0 ? FRAME_MS : Math.min(MAX_FRAME_MS, elapsed);
    this.lastTime = time;

    this.advance(step);
    this.draw();

    // No ring left: sleep until the pointer, the idle timer, a resize or a new
    // input asks for another frame. The frame that retired the last ring has
    // just drawn the grid straight.
    if (this.ripples.length > 0 && this.wake) this.rafId = requestAnimationFrame(this.frame);
    else this.lastTime = -1;
  }

  /** Age every ring by `step` ms, place the queued ones, and retire the ones with nothing left to show. */
  private advance(step: number): void {
    for (const ripple of this.ripples) ripple.age += step;

    if (this.idleDue) {
      this.idleDue = false;
      this.pending.push({ x: this.box.width / 2, y: this.box.height / 2, share: IDLE_SHARE, client: false });
      this.armIdle?.();
    }
    if (this.pending.length > 0) {
      // The rect is the box as drawn, after any transform on it or an ancestor,
      // and the grid is laid out in the box before them, so a pointer is scaled
      // back into it. Read once a frame, not once an event.
      let needsRect = false;
      for (let i = 0; i < this.pending.length && !needsRect; i++) needsRect = this.pending[i].client;
      const rect = needsRect ? this.host.nativeElement.getBoundingClientRect() : null;
      const sx = rect && rect.width > 0 ? this.box.width / rect.width : 1;
      const sy = rect && rect.height > 0 ? this.box.height / rect.height : 1;
      for (const entry of this.pending) {
        const x = entry.client && rect ? (entry.x - rect.left) * sx : entry.x;
        const y = entry.client && rect ? (entry.y - rect.top) * sy : entry.y;
        this.place(x, y, entry.share);
      }
      this.pending.length = 0;
    }

    const speed = Math.max(0, this.speed());
    const strength = Math.abs(this.strength());
    const reach = this.ringWidth() * RING_REACH;
    const { width, height } = this.box;
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const energy = this.energy(ripple);
      // Past its farthest corner (plus the margin a bend can reach) the ring
      // has nothing left in the box to bend.
      const far = Math.hypot(Math.max(ripple.x, width - ripple.x), Math.max(ripple.y, height - ripple.y));
      const gone = (speed * ripple.age) / 1000 - reach > far + this.margin();
      // A ring at the end of its life has faded to nothing, so this retires it too.
      if (gone || (energy < GLOW_REST && energy * strength < PUSH_REST)) {
        this.ripples.splice(i, 1);
      }
    }
  }

  /**
   * Start a ring at a box point. Past `MAX_RIPPLES` it replaces the faintest live
   * ring — the oldest of the faintest on a tie — so a press in the middle of a
   * fast drag is not the one that vanishes; when every live ring is still
   * stronger than this one starts out, this one is the faintest, and it is dropped.
   */
  private place(x: number, y: number, share: number): void {
    const ripples = this.ripples;
    if (ripples.length < MAX_RIPPLES) {
      ripples.push({ x, y, age: 0, share });
      return;
    }
    let faintest = 0;
    let least = Infinity;
    for (let i = 0; i < ripples.length; i++) {
      const energy = this.energy(ripples[i]);
      if (energy < least || (energy === least && ripples[i].age > ripples[faintest].age)) {
        faintest = i;
        least = energy;
      }
    }
    if (share < least) return;
    ripples[faintest] = { x, y, age: 0, share };
  }

  /** How strong a ring still is, 0..1: its share, faded by `decay` and by the end of its life. */
  private energy(ripple: Ripple): number {
    const decay = Math.max(0, this.decay());
    const end = clamp((MAX_AGE_MS - ripple.age) / FADE_MS, 0, 1);
    return ripple.share * Math.exp((-decay * ripple.age) / 1000) * end;
  }

  /**
   * How far past each edge the lines run, so a bend never pulls a line's end into
   * view: a cell, plus the most the rings at one point can bend it — the overlap
   * budget, or every ring at full strength when that is less.
   */
  private margin(): number {
    return this.cell() + Math.min(Math.abs(this.strength()) * MAX_RIPPLES, PUSH_PER_WIDTH * this.ringWidth());
  }

  // Drawing

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // Retire the stand-in only once something is really painted. Runs outside
    // Angular, so the `set` schedules the one host-binding update it needs.
    if (!this.painted()) this.painted.set(true);

    const canvas = this.canvasRef().nativeElement;
    const { width, height } = this.box;
    ctx.clearRect(0, 0, width, height);
    this.prepareRings();
    for (let i = 0; i < GLOW_LEVELS; i++) {
      this.lit[i].length = 0;
      this.lit[i].runs = 0;
    }
    this.anyLit = false;

    // The stroke in whole bitmap pixels, and every line moved so its edges fall
    // on them (see `snap()`). Under one bitmap pixel the width is kept, so a
    // thin line stays faint, and lands centred in a single pixel.
    const ratio = this.ratio || 1;
    const scaled = this.stroke() * ratio;
    const stroke = scaled >= 1 ? Math.round(scaled) : scaled;
    const cell = this.cell();
    const margin = this.margin();
    ctx.globalAlpha = 1;
    ctx.lineWidth = stroke / ratio;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = resolveCssColor(canvas, this.lineExpression(), LINE_FALLBACK);
    ctx.beginPath();
    // A cell centred on the box, then every `cell` out, far enough past each
    // edge that a bend never brings an undrawn line into view — where the
    // stand-in's centred tiles put them, give or take the half device pixel
    // the snap moves a line by.
    const cx = width / 2;
    const cy = height / 2;
    const columns = Math.ceil((cx + margin) / cell);
    const rows = Math.ceil((cy + margin) / cell);
    for (let i = -columns; i < columns; i++) {
      this.trace(ctx, snap(cx + (i + 0.5) * cell, ratio, stroke), -margin, height + margin, true);
    }
    for (let i = -rows; i < rows; i++) {
      this.trace(ctx, snap(cy + (i + 0.5) * cell, ratio, stroke), -margin, width + margin, false);
    }
    ctx.stroke();
    if (!this.anyLit) return;

    // Lit stretches go over their own lines in the ripple colour, at their glow
    // as alpha: the blend of the two colours without parsing either, so an
    // `oklch()` or a `display-p3` colour works as well as an `rgb()`.
    ctx.strokeStyle = resolveCssColor(canvas, this.rippleExpression(), RIPPLE_FALLBACK);
    for (let i = 0; i < GLOW_LEVELS; i++) {
      const level = this.lit[i];
      if (level.runs === 0) continue;
      const points = level.points;
      ctx.globalAlpha = (i + 1) / GLOW_LEVELS;
      ctx.beginPath();
      for (let run = 0; run < level.runs; run++) {
        const start = level.starts[run];
        const end = run + 1 < level.runs ? level.starts[run + 1] : level.length;
        ctx.moveTo(points[start], points[start + 1]);
        for (let p = start + 2; p < end; p += 2) ctx.lineTo(points[p], points[p + 1]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Work out where every live ring stands at its current age, for this frame's
   * samples, and hold the rings that overlap to the bend budget together.
   *
   * Each ring's bend is scaled by its share of the budget against every ring
   * whose band meets its own: wherever two rings both reach a point their bands
   * meet, so the rings acting on any point add up to the budget at most (see
   * `PUSH_PER_WIDTH`), while a ring that meets no other keeps its full bend. A
   * pair counts in full once its bands meet and fades out over one half-width of
   * gap before that, so two rings drifting into each other give way smoothly
   * rather than both shrinking in one frame.
   */
  private prepareRings(): void {
    const speed = Math.max(0, this.speed());
    const strength = this.strength();
    const width = this.ringWidth();
    this.frameRing = width;
    this.frameStep = Math.max(MIN_SAMPLE, width / 4);
    const reach = width * RING_REACH;
    const rings = this.rings;
    this.ringCount = 0;
    for (const ripple of this.ripples) {
      const energy = this.energy(ripple);
      const radius = (speed * ripple.age) / 1000;
      const inner = Math.max(0, radius - reach);
      const outer = radius + reach;
      const ring = (rings[this.ringCount] ??= {
        x: 0,
        y: 0,
        radius: 0,
        inner: 0,
        outer: 0,
        inner2: 0,
        outer2: 0,
        raw: 0,
        push: 0,
        glow: 0,
      });
      ring.x = ripple.x;
      ring.y = ripple.y;
      ring.radius = radius;
      ring.inner = inner;
      ring.outer = outer;
      ring.inner2 = inner * inner;
      ring.outer2 = outer * outer;
      ring.raw = strength * energy * Math.min(1, ripple.age / BIRTH_MS);
      ring.glow = energy;
      this.ringCount++;
    }

    const budget = PUSH_PER_WIDTH * width;
    for (let i = 0; i < this.ringCount; i++) {
      const ring = rings[i];
      let shared = 0;
      for (let j = 0; j < this.ringCount; j++) {
        const other = rings[j];
        const between = Math.hypot(ring.x - other.x, ring.y - other.y);
        const gap = Math.max(
          between - ring.outer - other.outer,
          ring.inner - other.outer - between,
          other.inner - ring.outer - between
        );
        if (gap < width) shared += Math.abs(other.raw) * (gap <= 0 ? 1 : 1 - gap / width);
      }
      ring.push = shared > budget ? (ring.raw * budget) / shared : ring.raw;
    }
  }

  /**
   * Add one grid line to the path — vertical at `x = fixed` or horizontal at
   * `y = fixed`, from `from` to `to` along it — and file its lit stretches by
   * alpha step. A line no ring reaches is two points; one a ring reaches is
   * sampled only across the stretch the rings can bend, and straight either
   * side of it. Where that stretch runs to an end of the line, the end is the
   * displaced sample itself: drawing the undisplaced end before it would step
   * the line back along itself.
   */
  private trace(ctx: CanvasRenderingContext2D, fixed: number, from: number, to: number, vertical: boolean): void {
    const near = this.near;
    let count = 0;
    // The stretch of the line any ring's band can reach.
    let start = to;
    let end = from;
    for (let i = 0; i < this.ringCount; i++) {
      const ring = this.rings[i];
      const across = Math.abs(fixed - (vertical ? ring.x : ring.y));
      if (across >= ring.outer) continue;
      const along = vertical ? ring.y : ring.x;
      // Every point of the line already inside the band's inner edge: the ring
      // has passed it.
      if (ring.inner >= Math.hypot(across, Math.max(along - from, to - along))) continue;
      const half = Math.sqrt(ring.outer2 - across * across);
      start = Math.min(start, along - half);
      end = Math.max(end, along + half);
      near[count++] = ring;
    }

    if (count === 0 || start >= end) {
      if (vertical) {
        ctx.moveTo(fixed, from);
        ctx.lineTo(fixed, to);
      } else {
        ctx.moveTo(from, fixed);
        ctx.lineTo(to, fixed);
      }
      return;
    }

    // Samples on a lattice fixed to the line rather than to the band, so a
    // travelling ring does not slide the points it bends through.
    const step = this.frameStep;
    const first = Math.max(from, from + Math.floor((start - from) / step) * step);
    const last = Math.min(to, from + Math.ceil((end - from) / step) * step);
    if (first > from) {
      if (vertical) ctx.moveTo(fixed, from);
      else ctx.moveTo(from, fixed);
    }

    // The alpha step of the lit run being extended, 0 while none is open.
    let runLevel = 0;
    let px = 0;
    let py = 0;
    let pg = 0;
    for (let t = first, s = 0; ; s++, t = Math.min(last, first + s * step)) {
      if (vertical) this.displace(fixed, t, count);
      else this.displace(t, fixed, count);
      const x = this.sx;
      const y = this.sy;
      const g = this.sg;
      if (s === 0 && first <= from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (s > 0) {
        const level = Math.min(GLOW_LEVELS, Math.round(((pg + g) / 2) * GLOW_LEVELS));
        if (level === 0) {
          runLevel = 0;
        } else if (runLevel === level) {
          addPoint(this.lit[level - 1], x, y);
        } else {
          startRun(this.lit[level - 1], px, py, x, y);
          runLevel = level;
          this.anyLit = true;
        }
      }
      px = x;
      py = y;
      pg = g;
      if (t >= last) break;
    }
    if (last < to) {
      if (vertical) ctx.lineTo(fixed, to);
      else ctx.lineTo(to, fixed);
    }
  }

  /**
   * Where the grid point `(x, y)` is drawn and how lit it is, with the first
   * `count` rings in `near` acting on it; written to `sx`, `sy` and `sg`.
   *
   * Each ring pushes the point along the line from its origin. The push is a
   * bell around the crest, shaped by a cosine so the crest bends outward and a
   * shallow trough either side bends back in — what reads as a ripple rather
   * than a bulge — and eased in over the first half-width, so the lines through
   * the origin itself do not tear. The glow is the bell alone. Overlapping rings
   * add up; `prepareRings()` has already held them to a budget that cannot fold
   * the grid, so nothing is clamped here.
   */
  private displace(x: number, y: number, count: number): void {
    const width = this.frameRing;
    let dx = 0;
    let dy = 0;
    let glow = 0;
    for (let i = 0; i < count; i++) {
      const ring = this.near[i];
      const ox = x - ring.x;
      const oy = y - ring.y;
      const d2 = ox * ox + oy * oy;
      if (d2 <= ring.inner2 || d2 >= ring.outer2) continue;
      const d = Math.sqrt(d2);
      const u = (d - ring.radius) / width;
      const bell = Math.exp(-u * u);
      const ease = d < width ? d / width : 1;
      const amount = (ring.push * bell * Math.cos(2 * u) * ease) / d;
      dx += ox * amount;
      dy += oy * amount;
      glow += ring.glow * bell * ease;
    }
    this.sx = x + dx;
    this.sy = y + dy;
    this.sg = Math.min(1, glow);
  }
}
