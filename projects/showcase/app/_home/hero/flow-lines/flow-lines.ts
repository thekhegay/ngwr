import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { clamp, numAttr, resolveCssColor, watchColorScheme } from 'ngwr/utils';

const MAX_DPR = 2;
/** A tab that was throttled comes back with one huge frame; the field moves at most this far at once. */
const MAX_FRAME_MS = 50;
/** Noise coordinates per px: the wavelength of the ripple is about three times this many px. */
const NOISE_FREQ = 1 / 180;
/** Noise time per ms: how fast the ripple drifts. */
const NOISE_DRIFT = 0.00025;
/** How far a point is pushed at the pointer itself, in px. */
const PUSH = 28;
/** Spring that returns a pushed point: under-damped, so it overshoots a little. */
const STIFFNESS = 0.1;
const DAMPING = 0.86;

/** `n` folded into the lattice's 0..255, for any integer. */
const wrap = (n: number): number => ((n % 256) + 256) % 256;

// Value noise on a shuffled lattice, seeded once per page.
const PERM = new Uint8Array(512);
const VALUES = new Float32Array(512);
{
  const order = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = order[wrap(i)];
    VALUES[i] = Math.random() * 2 - 1;
  }
}

const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smooth noise in -1..1, continuous in all three arguments. */
function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const yw = wrap(yi);
  const zw = wrap(zi);
  const a = PERM[wrap(xi)] + yw;
  const b = PERM[wrap(xi + 1)] + yw;
  const aa = PERM[a] + zw;
  const ab = PERM[a + 1] + zw;
  const ba = PERM[b] + zw;
  const bb = PERM[b + 1] + zw;
  return lerp(
    lerp(lerp(VALUES[aa], VALUES[ba], u), lerp(VALUES[ab], VALUES[bb], u), v),
    lerp(lerp(VALUES[aa + 1], VALUES[ba + 1], u), lerp(VALUES[ab + 1], VALUES[bb + 1], u), v),
    w
  );
}

/**
 * A full-bleed decorative field of thin vertical lines that ripple slowly, like
 * wind through grass: every control point drifts with smooth noise, so
 * neighbouring lines move together, and the pointer over the parent pushes
 * nearby points aside, which spring back when it leaves.
 *
 * Fills its parent, which positions it (`position: relative`) and takes the
 * pointer. Paints on a 2D canvas created after the first render, so the server
 * renders the host and nothing else; the frame loop runs only while the host is
 * on screen and the tab is visible. Under `prefers-reduced-motion: reduce` it
 * draws one frame and stays still.
 */
@Component({
  selector: 'ngwr-flow-lines',
  template: '',
  styleUrl: './flow-lines.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-flow-lines', 'aria-hidden': 'true' },
})
export class FlowLines {
  /** Distance between two lines, in px. @default 10 */
  readonly gap = input(10, { transform: numAttr(10) });

  /** Distance between two control points down a line, in px. @default 24 */
  readonly step = input(24, { transform: numAttr(24) });

  /** How far a point drifts sideways at most, in px. @default 24 */
  readonly sway = input(24, { transform: numAttr(24) });

  /** How far a point drifts up or down at most, in px. @default 12 */
  readonly lift = input(12, { transform: numAttr(12) });

  /** How far from the pointer a point is still pushed, in px. @default 150 */
  readonly reach = input(150, { transform: numAttr(150) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private ink = '';

  // One entry per control point, column-major
  private cols = 0;
  private rows = 0;
  private posX = new Float32Array(0);
  private posY = new Float32Array(0);
  private offX = new Float32Array(0);
  private offY = new Float32Array(0);
  private velX = new Float32Array(0);
  private velY = new Float32Array(0);

  private pointerX = NaN;
  private pointerY = NaN;
  private time = 0;
  private inView = false;
  private running = false;
  private rafId: number | null = null;
  private lastFrame = 0;

  private resizeObserver: ResizeObserver | null = null;
  private viewObserver: IntersectionObserver | null = null;
  private pointerTarget: HTMLElement | null = null;

  constructor() {
    if (!this.isBrowser) return;

    effect(() => {
      this.platform.pageVisible();
      this.platform.prefersReducedMotion();
      this.sync();
    });

    afterNextRender(() => this.mount());

    inject(DestroyRef).onDestroy(() => this.unmount());
  }

  private mount(): void {
    const element = this.host.nativeElement;
    const canvas = element.ownerDocument.createElement('canvas');
    canvas.className = 'ngwr-flow-lines__canvas';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    element.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = ctx;
    this.resolveColors();

    this.resizeObserver = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      this.resize(rect?.width ?? element.clientWidth, rect?.height ?? element.clientHeight);
    });
    this.resizeObserver.observe(element);

    this.viewObserver = new IntersectionObserver(entries => {
      this.inView = entries.some(entry => entry.isIntersecting);
      this.sync();
    });
    this.viewObserver.observe(element);

    this.pointerTarget = element.parentElement;
    this.pointerTarget?.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.pointerTarget?.addEventListener('pointerleave', this.onPointerLeave, { passive: true });

    watchColorScheme(
      () => {
        this.resolveColors();
        if (!this.running) this.draw();
      },
      { injector: this.injector }
    );
  }

  private unmount(): void {
    this.running = false;
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.viewObserver?.disconnect();
    this.pointerTarget?.removeEventListener('pointermove', this.onPointerMove);
    this.pointerTarget?.removeEventListener('pointerleave', this.onPointerLeave);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
  };

  private readonly onPointerLeave = (): void => {
    this.pointerX = NaN;
    this.pointerY = NaN;
  };

  private resolveColors(): void {
    if (!this.canvas) return;
    this.ink = resolveCssColor(this.canvas, 'var(--ngwr-flow-lines-ink)', 'rgba(15, 23, 42, 0.14)');
  }

  private resize(width: number, height: number): void {
    if (!this.canvas || !this.ctx || width <= 0 || height <= 0) return;
    const dpr = Math.min(MAX_DPR, this.host.nativeElement.ownerDocument.defaultView?.devicePixelRatio ?? 1);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gap = Math.max(4, this.gap());
    const step = Math.max(8, this.step());
    this.cols = Math.floor(width / gap) + 1;
    // One point above the top and one below the bottom, so the ends never show.
    this.rows = Math.floor(height / step) + 3;
    const count = this.cols * this.rows;
    this.posX = new Float32Array(count);
    this.posY = new Float32Array(count);
    this.offX = new Float32Array(count);
    this.offY = new Float32Array(count);
    this.velX = new Float32Array(count);
    this.velY = new Float32Array(count);

    this.advance(0);
    this.draw();
    this.sync();
  }

  // Motion

  /** Starts or stops the loop to match the page, the viewport and the user. */
  private sync(): void {
    const run =
      this.ctx !== null &&
      this.width > 0 &&
      this.inView &&
      this.platform.pageVisible() &&
      !this.platform.prefersReducedMotion();
    if (run === this.running) return;
    this.running = run;
    if (run) {
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
      return;
    }
    this.stopLoop();
    if (this.platform.prefersReducedMotion()) this.draw();
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly frame = (now: number): void => {
    this.rafId = null;
    const dt = clamp(now - this.lastFrame, 0, MAX_FRAME_MS);
    this.lastFrame = now;
    this.time += dt;
    this.advance(dt);
    this.draw();
    if (this.running) this.rafId = requestAnimationFrame(this.frame);
  };

  /** Moves every control point: the noise drift, then the pointer push and its spring. */
  private advance(dt: number): void {
    const gap = Math.max(4, this.gap());
    const step = Math.max(8, this.step());
    const sway = this.sway();
    const lift = this.lift();
    const reach = this.reach();
    const reach2 = reach * reach;
    const px = this.pointerX;
    const py = this.pointerY;
    const pushing = !Number.isNaN(px);
    const t = this.time * NOISE_DRIFT;
    // The spring is tuned per 60Hz frame; a slower frame takes a longer step.
    const k = STIFFNESS * Math.min(2, dt / 16.7);
    const damping = DAMPING ** Math.min(2, dt / 16.7);

    for (let c = 0; c < this.cols; c++) {
      const x0 = c * gap;
      const nx = x0 * NOISE_FREQ;
      for (let r = 0; r < this.rows; r++) {
        const i = c * this.rows + r;
        const y0 = (r - 1) * step;
        const ny = y0 * NOISE_FREQ;
        const x = x0 + sway * noise3(nx, ny, t);
        const y = y0 + lift * noise3(nx + 31.7, ny + 11.3, t + 7.9);

        let targetX = 0;
        let targetY = 0;
        if (pushing) {
          const dx = x - px;
          const dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < reach2 && d2 > 0) {
            const d = Math.sqrt(d2);
            const force = (1 - d / reach) ** 2 * PUSH;
            targetX = (dx / d) * force;
            targetY = (dy / d) * force;
          }
        }
        this.velX[i] = (this.velX[i] + (targetX - this.offX[i]) * k) * damping;
        this.velY[i] = (this.velY[i] + (targetY - this.offY[i]) * k) * damping;
        this.offX[i] += this.velX[i];
        this.offY[i] += this.velY[i];

        this.posX[i] = x + this.offX[i];
        this.posY[i] = y + this.offY[i];
      }
    }
  }

  /** One frame: every line as a smooth curve through its points, one stroke for all of them. */
  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || this.width === 0) return;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.strokeStyle = this.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const rows = this.rows;
    for (let c = 0; c < this.cols; c++) {
      const base = c * rows;
      ctx.moveTo(this.posX[base], this.posY[base]);
      for (let r = 1; r < rows - 1; r++) {
        const i = base + r;
        ctx.quadraticCurveTo(
          this.posX[i],
          this.posY[i],
          (this.posX[i] + this.posX[i + 1]) / 2,
          (this.posY[i] + this.posY[i + 1]) / 2
        );
      }
      ctx.lineTo(this.posX[base + rows - 1], this.posY[base + rows - 1]);
    }
    ctx.stroke();
  }
}
