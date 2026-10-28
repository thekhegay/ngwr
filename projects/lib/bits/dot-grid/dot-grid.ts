/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * After the Dot Grid background on reactbits.dev
 * (https://www.reactbits.dev/backgrounds/dot-grid). The effect is the same
 * idea; the code is ngwr's own: a 2D canvas, one spring per dot, and a frame
 * loop that sleeps whenever nothing moves.
 */

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
import { numAttr, resolveCssColor, watchColorScheme } from 'ngwr/utils';

/** One dot: where the grid puts it, how far it has been pushed, and how lit it is. */
interface Dot {
  readonly x: number;
  readonly y: number;
  /** Offset from rest, in CSS pixels. */
  ox: number;
  oy: number;
  /** Velocity of that offset, in CSS pixels per 60 Hz frame. */
  vx: number;
  vy: number;
  /** How far toward the active colour, 0..1. */
  glow: number;
}

/**
 * The most bitmap pixels the canvas is backed with, the bound `wr-waves`
 * uses: a hero keeps the full 2x, and a very wide one steps down toward 1x
 * rather than growing a bitmap every frame has to clear and fill.
 */
const MAX_CANVAS_PIXELS = 2_500_000;

/**
 * The smallest pitch the grid is laid out at. A 1px gap on a full-page host
 * is two million dots, which no frame can draw; 4px is already a fine mesh.
 */
const MIN_GAP = 4;

/** A 60 Hz frame, in ms — the unit the spring constants below are tuned in. */
const FRAME_MS = 1000 / 60;

/** The longest step one frame may take, so a tab that wakes after a pause does not fling the dots. */
const MAX_STEP = 3;

/** Spring pull back toward the target offset, per frame. */
const SPRING = 0.1;

/** Velocity a dot keeps from one frame to the next; under 1 is what lets it settle. */
const DAMPING = 0.8;

/** Share of the gap to its target a dot's glow closes per frame while it brightens. */
const GLOW_RISE = 0.3;

/** The same while it fades — slower, so the pointer leaves a short trail behind it. */
const GLOW_FALL = 0.06;

/** Below this, in pixels or pixels per frame, a dot counts as at rest. */
const REST = 0.01;

/** Below this a glow counts as settled: under one step of an 8-bit alpha. */
const GLOW_REST = 1 / 256;

/** Alpha steps the lit dots are batched into, one path and one fill each. */
const GLOW_LEVELS = 16;

/** What the dots fall back to when the colour cannot be read: `--wr-border-strong` in light. */
const DOT_FALLBACK = 'rgb(156, 163, 175)';

/** What the lit dots fall back to: the shipped primary. */
const ACTIVE_FALLBACK = 'rgb(57, 105, 226)';

const TAU = Math.PI * 2;

/**
 * Dot-grid background — evenly spaced dots on a 2D canvas that light up in the
 * active colour near the pointer and are pushed away from it, both by the same
 * falloff, then spring back. Fills its nearest positioned ancestor; put it
 * behind hero copy or section content.
 *
 * The pointer is followed on the host's PARENT, with passive listeners, so the
 * dots answer a pointer that is over the content in front of them rather than
 * over the canvas — the host itself takes no pointer events and never steals a
 * click. Placed directly in a shadow root, where it has no parent element, it
 * follows the pointer on the shadow host; with neither it listens nowhere and
 * the grid stays unlit. Content placed after it needs `position: relative` (or
 * any z-index) to paint above it, as with any absolutely positioned layer.
 *
 * The grid is laid out in the host's own box, before transforms, so one that
 * boots inside a scaling-in panel (a dialog opening) is not stretched when the
 * animation ends, and the pointer is mapped back through the transform.
 *
 * Decorative: the canvas is `aria-hidden`, the host has no role and nothing in
 * it takes focus. The frame loop runs only while something moves — a still
 * grid asks for no frames at all — and never while the host is off screen.
 *
 * Under `prefers-reduced-motion` one still grid is drawn, in the resting
 * colour, and nothing follows the pointer; it is drawn again when the colours
 * or the page's colour scheme change. The preference is read live.
 *
 * Colours are theme tokens by default — the dots `--wr-border-strong`, the lit
 * ones `--wr-color-primary` — through the `--wr-dot-grid-dot-color` and
 * `--wr-dot-grid-active-color` hooks, and resolved before they reach the
 * canvas, which reads neither a `var()` nor a `light-dark()`.
 *
 * @example
 * ```html
 * <section style="position: relative; min-height: 24rem; overflow: hidden">
 *   <wr-dot-grid />
 *   <h1 style="position: relative">Hero copy above the dots</h1>
 * </section>
 * ```
 *
 * @see https://ngwr.dev/bits/dot-grid
 */
@Component({
  selector: 'wr-dot-grid',
  template: '<canvas #canvas class="wr-dot-grid__canvas" aria-hidden="true"></canvas>',
  styleUrl: './dot-grid.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-dot-grid',
    // Feed the CSS stand-in grid (see `styles/_rules.scss`) so it draws at the
    // real pitch, size and colour, and switch it off once the canvas has painted.
    '[style.--wr-dot-grid-gap.px]': 'pitch()',
    '[style.--wr-dot-grid-dot-size.px]': 'size()',
    '[style.--wr-dot-grid-dot-color]': 'dotColor()',
    '[class.wr-dot-grid--painted]': 'painted()',
  },
})
export class WrDotGrid {
  /** Dot diameter in px. @default 3 */
  readonly dotSize = input(3, { transform: numAttr(3) });

  /** Distance between dot centres in px, never under 4. @default 24 */
  readonly gap = input(24, { transform: numAttr(24) });

  /** Resting dot colour, any CSS colour. When unset, `--wr-dot-grid-dot-color` decides. */
  readonly dotColor = input<string | null>(null);

  /** Colour a dot takes near the pointer, any CSS colour. When unset, `--wr-dot-grid-active-color` decides. */
  readonly activeColor = input<string | null>(null);

  /** How far from the pointer a dot still reacts, in px. @default 120 */
  readonly radius = input(120, { transform: numAttr(120) });

  /**
   * How far a dot right by the pointer is pushed, in px; the push fades out
   * toward `radius`. `0` keeps the dots in place and only lights them, and a
   * negative value pulls them in. @default 12
   */
  readonly strength = input(12, { transform: numAttr(12) });

  /** The pitch the grid is laid out at: `gap`, floored. */
  protected readonly pitch = computed(() => Math.max(MIN_GAP, this.gap()));

  /** The dot diameter drawn: `dotSize`, never negative. */
  protected readonly size = computed(() => Math.max(0, this.dotSize()));

  /**
   * Flips once the canvas has drawn, which retires the CSS stand-in grid.
   *
   * A canvas cannot be prerendered, so on an SSR'd page it is blank until the
   * bundle has loaded and hydrated. The stylesheet paints the same dots at the
   * same pitch from the prerendered HTML in the meantime, and this hands over.
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
  private dots: Dot[] = [];
  /** Lit dots by alpha step, reused frame to frame. */
  private readonly lit: Dot[][] = Array.from({ length: GLOW_LEVELS }, () => []);
  /** The pointer, in viewport coordinates, and whether it is over the parent at all. */
  private readonly pointer = { clientX: 0, clientY: 0, inside: false };
  private rafId = 0;
  private lastTime = -1;
  /** Schedules a frame while motion is allowed; `null` under reduced motion. */
  private wake: (() => void) | null = null;

  /** Flips once `boot()` has a context and a grid — everything after waits for it. */
  private readonly booted = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // A new pitch is a new grid. It leaves the bitmap alone, so the frame it
    // asks for repaints over the old grid rather than over a blank canvas.
    effect(() => {
      this.pitch();
      untracked(() => {
        if (!this.ctx) return;
        this.placeDots();
        this.requestDraw();
      });
    });

    // Everything else only changes what the next frame draws. A sleeping loop
    // or a still grid has no next frame, so ask for one.
    effect(() => {
      this.size();
      this.dotColor();
      this.activeColor();
      this.radius();
      this.strength();
      untracked(() => this.requestDraw());
    });

    // A drawn grid keeps the colours it was drawn in, and the loop sleeps when
    // nothing moves, so a scheme switch asks for a frame to re-resolve them.
    watchColorScheme(() => this.requestDraw());

    // Motion or a still grid, decided live.
    effect(onCleanup => {
      if (!this.booted()) return;
      if (this.platform.prefersReducedMotion()) {
        untracked(() => {
          this.rest();
          this.draw();
        });
        return;
      }
      onCleanup(untracked(() => this.zone.runOutsideAngular(() => this.interact())));
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
    this.placeDots();

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

  /** Follow the pointer and draw on demand; returns what stops both. */
  private interact(): () => void {
    const hostEl = this.host.nativeElement;
    // The parent, not the host: content in front of the canvas receives the
    // pointer, and its events bubble to the parent, never to a sibling. Placed
    // directly in a shadow root it has none, and the shadow host is where those
    // composed events land. Never the host itself, which takes no pointer
    // events and so could never hear one.
    const root = hostEl.getRootNode();
    const target =
      hostEl.parentElement ?? (root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null);

    // Off screen the grid asks for no frames. Without an observer (jsdom) it
    // counts as visible.
    let visible = typeof IntersectionObserver === 'undefined';
    const wake = (): void => {
      if (visible && this.rafId === 0) this.rafId = requestAnimationFrame(time => this.tick(time));
    };
    const halt = (): void => {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.lastTime = -1;
    };

    const onMove = (event: PointerEvent): void => {
      this.pointer.clientX = event.clientX;
      this.pointer.clientY = event.clientY;
      this.pointer.inside = true;
      wake();
    };
    const onLeave = (): void => {
      this.pointer.inside = false;
      wake();
    };
    target?.addEventListener('pointermove', onMove, { passive: true });
    target?.addEventListener('pointerdown', onMove, { passive: true });
    target?.addEventListener('pointerleave', onLeave, { passive: true });
    target?.addEventListener('pointercancel', onLeave, { passive: true });

    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(entries => {
            visible = entries[entries.length - 1].isIntersecting;
            if (visible) wake();
            else halt();
          });
    io?.observe(hostEl);

    this.wake = wake;
    wake();

    return () => {
      target?.removeEventListener('pointermove', onMove);
      target?.removeEventListener('pointerdown', onMove);
      target?.removeEventListener('pointerleave', onLeave);
      target?.removeEventListener('pointercancel', onLeave);
      io?.disconnect();
      halt();
      this.wake = null;
      this.pointer.inside = false;
    };
  }

  /** Draw the grid as it should look now: a frame while motion is allowed, at once under reduced motion. */
  private requestDraw(): void {
    if (!this.booted()) return;
    if (this.wake) this.wake();
    else if (this.platform.prefersReducedMotion()) this.draw();
  }

  /** Fit the canvas to a new box or pixel ratio and, when that cleared it, repaint at once. */
  private resize(width: number, height: number): void {
    const moved = width !== this.box.width || height !== this.box.height;
    if (!this.fit(width, height)) return;
    if (moved) this.placeDots();
    // Observer entries arrive after the frame's own callbacks and before its
    // paint, so a frame asked for here would leave this one blank — with the
    // stand-in already retired, a resize drag would flicker every frame.
    this.draw();
    // Re-placed dots are at rest and unlit, which is right unless the pointer
    // is over them; a running loop simply carries on.
    if (this.pointer.inside) this.wake?.();
  }

  /**
   * Back the canvas for a `width` × `height` box, in CSS pixels, at the screen's
   * pixel ratio. Returns whether anything changed: writing `canvas.width` clears
   * the bitmap even to the value it already has, so an unchanged box is left alone.
   */
  private fit(width: number, height: number): boolean {
    // Capped at 2 and by the pixel budget, never below 1 — a bitmap the size of
    // the CSS box blurs every dot on a 2x screen.
    const area = width * height;
    const budget = area > 0 ? Math.sqrt(MAX_CANVAS_PIXELS / area) : 2;
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, budget));
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

  /** Lay the dots out over the box, every one at rest. */
  private placeDots(): void {
    // One dot sits on the centre of the box and the rest step out from it by
    // the pitch — exactly where the stand-in's centred `background-position`
    // puts them, so the handover does not shift a single dot. One ring past
    // each edge, for the dots a push brings into view.
    const gap = this.pitch();
    const xs = this.axis(this.box.width, gap);
    const ys = this.axis(this.box.height, gap);
    const dots: Dot[] = [];
    for (const y of ys) {
      for (const x of xs) dots.push({ x, y, ox: 0, oy: 0, vx: 0, vy: 0, glow: 0 });
    }
    this.dots = dots;
  }

  /** Positions along one side of `length`: the centre, then every `gap` out to one step past each edge. */
  private axis(length: number, gap: number): number[] {
    const centre = length / 2;
    const steps = Math.ceil(centre / gap) + 1;
    const positions: number[] = [];
    for (let i = -steps; i <= steps; i++) positions.push(centre + i * gap);
    return positions;
  }

  /** Every dot back at rest and unlit, and the pointer gone. */
  private rest(): void {
    this.pointer.inside = false;
    for (const dot of this.dots) {
      dot.ox = dot.oy = dot.vx = dot.vy = dot.glow = 0;
    }
  }

  // Frame loop

  private tick(time: number): void {
    this.rafId = 0;
    // The springs are tuned per 60 Hz frame and stepped by the time that really
    // passed, so a 120 Hz screen does not run them twice as fast. A timestamp
    // that did not advance counts as one frame.
    const elapsed = time - this.lastTime;
    const step = this.lastTime < 0 || elapsed <= 0 ? 1 : Math.min(MAX_STEP, elapsed / FRAME_MS);
    this.lastTime = time;

    const moving = this.move(step);
    this.draw();

    // Nothing left to move: sleep until the pointer, a resize or a new input
    // asks for another frame.
    if (moving && this.wake) this.rafId = requestAnimationFrame(next => this.tick(next));
    else this.lastTime = -1;
  }

  /** Advance every dot by `step` frames; returns whether any is still moving. */
  private move(step: number): boolean {
    const reach = Math.max(0, this.radius());
    const push = this.strength();
    const active = this.pointer.inside && reach > 0;

    let px = 0;
    let py = 0;
    if (active) {
      // Read once a frame rather than once a move: a page that scrolls under a
      // still pointer moves the grid under it too. The rect is the box as
      // drawn, after any transform on it or an ancestor, and the grid is laid
      // out in the box before them, so the pointer is scaled back into it.
      const rect = this.host.nativeElement.getBoundingClientRect();
      px = (this.pointer.clientX - rect.left) * (rect.width > 0 ? this.box.width / rect.width : 1);
      py = (this.pointer.clientY - rect.top) * (rect.height > 0 ? this.box.height / rect.height : 1);
    }

    const reach2 = reach * reach;
    const pull = SPRING * step;
    const keep = Math.pow(DAMPING, step);
    const rise = 1 - Math.pow(1 - GLOW_RISE, step);
    const fall = 1 - Math.pow(1 - GLOW_FALL, step);

    let moving = false;
    for (const dot of this.dots) {
      let tx = 0;
      let ty = 0;
      let glow = 0;
      if (active) {
        const dx = dot.x - px;
        const dy = dot.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach2) {
          const d = Math.sqrt(d2);
          const u = 1 - d / reach;
          // Smoothstep: no edge where the radius ends, and a flat top under the pointer.
          glow = u * u * (3 - 2 * u);
          if (d > 0) {
            tx = (dx / d) * push * glow;
            ty = (dy / d) * push * glow;
          }
        }
      }

      dot.vx = (dot.vx + (tx - dot.ox) * pull) * keep;
      dot.vy = (dot.vy + (ty - dot.oy) * pull) * keep;
      dot.ox += dot.vx * step;
      dot.oy += dot.vy * step;
      dot.glow += (glow - dot.glow) * (glow > dot.glow ? rise : fall);

      if (
        !moving &&
        (Math.abs(tx - dot.ox) > REST ||
          Math.abs(ty - dot.oy) > REST ||
          Math.abs(dot.vx) > REST ||
          Math.abs(dot.vy) > REST ||
          Math.abs(glow - dot.glow) > GLOW_REST)
      ) {
        moving = true;
      }
    }
    return moving;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // Retire the stand-in only once something is really painted. Runs outside
    // Angular, so the `set` schedules the one host-binding update it needs.
    if (!this.painted()) this.painted.set(true);

    const canvas = this.canvasRef().nativeElement;
    const r = this.size() / 2;
    ctx.clearRect(0, 0, this.box.width, this.box.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = resolveCssColor(canvas, this.dotColor() ?? 'var(--wr-dot-grid-dot-color)', DOT_FALLBACK);
    this.fillDots(ctx, this.dots, r);

    // Lit dots go over their resting selves in the active colour, at their
    // glow as alpha: the blend of the two colours without parsing either, so
    // an `oklch()` or a `display-p3` colour works as well as an `rgb()`.
    for (const level of this.lit) level.length = 0;
    let anyLit = false;
    for (const dot of this.dots) {
      const level = Math.round(dot.glow * GLOW_LEVELS);
      if (level > 0) {
        this.lit[Math.min(level, GLOW_LEVELS) - 1].push(dot);
        anyLit = true;
      }
    }
    if (!anyLit) return;

    ctx.fillStyle = resolveCssColor(canvas, this.activeColor() ?? 'var(--wr-dot-grid-active-color)', ACTIVE_FALLBACK);
    this.lit.forEach((dots, i) => {
      if (dots.length === 0) return;
      ctx.globalAlpha = (i + 1) / GLOW_LEVELS;
      this.fillDots(ctx, dots, r);
    });
    ctx.globalAlpha = 1;
  }

  /** One path for every dot in `dots`, filled once. */
  private fillDots(ctx: CanvasRenderingContext2D, dots: readonly Dot[], r: number): void {
    ctx.beginPath();
    for (const dot of dots) {
      const x = dot.x + dot.ox;
      const y = dot.y + dot.oy;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }
}
