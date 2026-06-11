/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the Waves background by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/backgrounds/waves
 *
 * A grid of vertical lines drawn on a 2D canvas. Each point drifts on
 * perlin noise and is pushed around by the pointer with a spring
 * (tension + friction) pulling it back to rest.
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

// ──────── Perlin noise (Stefan Gustavson's reference permutation) ────────
/* eslint-disable no-bitwise -- permutation-table hashing is inherently bitwise */

class Grad {
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {}

  dot2(x: number, y: number): number {
    return this.x * x + this.y * y;
  }
}

const GRAD3: readonly Grad[] = [
  new Grad(1, 1),
  new Grad(-1, 1),
  new Grad(1, -1),
  new Grad(-1, -1),
  new Grad(1, 0),
  new Grad(-1, 0),
  new Grad(1, 0),
  new Grad(-1, 0),
  new Grad(0, 1),
  new Grad(0, -1),
  new Grad(0, 1),
  new Grad(0, -1),
];

// prettier-ignore
const P: readonly number[] = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240,
  21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88,
  237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83,
  111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216,
  80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186,
  3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58,
  17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193,
  238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128,
  195, 78, 66, 215, 61, 156, 180,
];

class Noise {
  private readonly perm = new Array<number>(512);
  private readonly gradP = new Array<Grad>(512);

  constructor(seed: number) {
    if (seed > 0 && seed < 1) seed *= 65536;
    seed = Math.floor(seed);
    if (seed < 256) seed |= seed << 8;
    for (let i = 0; i < 256; i++) {
      const v = i & 1 ? P[i] ^ (seed & 255) : P[i] ^ ((seed >> 8) & 255);
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = GRAD3[v % 12];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b;
  }

  perlin2(x: number, y: number): number {
    let gx = Math.floor(x);
    let gy = Math.floor(y);
    x -= gx;
    y -= gy;
    gx &= 255;
    gy &= 255;
    const n00 = this.gradP[gx + this.perm[gy]].dot2(x, y);
    const n01 = this.gradP[gx + this.perm[gy + 1]].dot2(x, y - 1);
    const n10 = this.gradP[gx + 1 + this.perm[gy]].dot2(x - 1, y);
    const n11 = this.gradP[gx + 1 + this.perm[gy + 1]].dot2(x - 1, y - 1);
    const u = this.fade(x);
    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
  }
}

/* eslint-enable no-bitwise */
// ──────── Component ────────

interface WavePoint {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
}

/**
 * Wave-field background — a grid of lines drifting on perlin noise,
 * nudged by the pointer. Fills its nearest positioned ancestor; put it
 * behind hero copy or section content.
 *
 * Colours are theme-aware by default: a soft dark line on light surfaces,
 * a faint white line on dark — override with `[lineColor]`.
 *
 * @example
 * ```html
 * <section style="position: relative">
 *   <wr-waves />
 *   <h1>Hero copy above the waves</h1>
 * </section>
 * ```
 *
 * @see https://ngwr.dev/animations/waves
 */
@Component({
  selector: 'wr-waves',
  template: '<canvas #canvas class="wr-waves__canvas"></canvas>',
  styleUrl: './waves.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-waves',
    '[style.background-color]': 'backgroundColor()',
  },
})
export class WrWaves {
  /** Line stroke colour. When unset, the theme decides. */
  readonly lineColor = input<string | null>(null);

  /** Background fill behind the lines. @default 'transparent' */
  readonly backgroundColor = input('transparent');

  /** Horizontal noise drift per ms. @default 0.0125 */
  readonly waveSpeedX = input(0.0125, { transform: num(0.0125) });

  /** Vertical noise drift per ms. @default 0.005 */
  readonly waveSpeedY = input(0.005, { transform: num(0.005) });

  /** Horizontal wave amplitude in px. @default 32 */
  readonly waveAmpX = input(32, { transform: num(32) });

  /** Vertical wave amplitude in px. @default 16 */
  readonly waveAmpY = input(16, { transform: num(16) });

  /** Horizontal gap between lines in px. @default 10 */
  readonly xGap = input(10, { transform: num(10) });

  /** Vertical gap between points on a line in px. @default 32 */
  readonly yGap = input(32, { transform: num(32) });

  /** Velocity damping of the cursor spring, 0..1. @default 0.925 */
  readonly friction = input(0.925, { transform: num(0.925) });

  /** Pull-back strength of the cursor spring. @default 0.005 */
  readonly tension = input(0.005, { transform: num(0.005) });

  /** Max px a point can be dragged from rest. @default 100 */
  readonly maxCursorMove = input(100, { transform: num(100) });

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx: CanvasRenderingContext2D | null = null;
  private readonly noise = new Noise(Math.random());
  private lines: WavePoint[][] = [];
  private bounding = { width: 0, height: 0, left: 0, top: 0 };
  private readonly mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
  private rafId = 0;

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // Re-seed the grid when geometry inputs change.
    effect(() => {
      this.xGap();
      this.yGap();
      if (!this.ctx) return;
      this.setSize();
      this.setLines();
    });
  }

  // ──────── Setup ────────

  private boot(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.setSize();
    this.setLines();

    const onResize = (): void => {
      this.setSize();
      this.setLines();
      if (this.platform.prefersReducedMotion()) this.drawLines();
    };
    const onMouseMove = (e: MouseEvent): void => this.updateMouse(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent): void => this.updateMouse(e.touches[0].clientX, e.touches[0].clientY);

    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(this.host.nativeElement);

    // Reduced motion: one static, undisturbed grid — no drift, no loop,
    // no pointer reactivity.
    if (this.platform.prefersReducedMotion()) {
      this.drawLines();
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        ro.disconnect();
      });
      return;
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    this.rafId = requestAnimationFrame(t => this.tick(t));

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      ro.disconnect();
      cancelAnimationFrame(this.rafId);
    });
  }

  private setSize(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.bounding = { width: rect.width, height: rect.height, left: rect.left, top: rect.top };
    const canvas = this.canvasRef().nativeElement;
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  private setLines(): void {
    const { width, height } = this.bounding;
    this.lines = [];
    const oWidth = width + 200;
    const oHeight = height + 30;
    const xGap = this.xGap();
    const yGap = this.yGap();
    const totalLines = Math.ceil(oWidth / xGap);
    const totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap * totalLines) / 2;
    const yStart = (height - yGap * totalPoints) / 2;
    for (let i = 0; i <= totalLines; i++) {
      const pts: WavePoint[] = [];
      for (let j = 0; j <= totalPoints; j++) {
        pts.push({
          x: xStart + xGap * i,
          y: yStart + yGap * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }
      this.lines.push(pts);
    }
  }

  // ──────── Frame loop ────────

  private tick(time: number): void {
    const mouse = this.mouse;
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;
    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    const d = Math.hypot(dx, dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    this.movePoints(time);
    this.drawLines();
    this.rafId = requestAnimationFrame(t => this.tick(t));
  }

  private movePoints(time: number): void {
    const mouse = this.mouse;
    const waveSpeedX = this.waveSpeedX();
    const waveSpeedY = this.waveSpeedY();
    const waveAmpX = this.waveAmpX();
    const waveAmpY = this.waveAmpY();
    const friction = this.friction();
    const tension = this.tension();
    const maxCursorMove = this.maxCursorMove();

    for (const pts of this.lines) {
      for (const p of pts) {
        const move = this.noise.perlin2((p.x + time * waveSpeedX) * 0.002, (p.y + time * waveSpeedY) * 0.0015) * 12;
        p.wave.x = Math.cos(move) * waveAmpX;
        p.wave.y = Math.sin(move) * waveAmpY;

        const dx = p.x - mouse.sx;
        const dy = p.y - mouse.sy;
        const dist = Math.hypot(dx, dy);
        const l = Math.max(175, mouse.vs);
        if (dist < l) {
          const s = 1 - dist / l;
          const f = Math.cos(dist * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
        }

        p.cursor.vx += (0 - p.cursor.x) * tension;
        p.cursor.vy += (0 - p.cursor.y) * tension;
        p.cursor.vx *= friction;
        p.cursor.vy *= friction;
        p.cursor.x += p.cursor.vx * 2;
        p.cursor.y += p.cursor.vy * 2;
        p.cursor.x = Math.min(maxCursorMove, Math.max(-maxCursorMove, p.cursor.x));
        p.cursor.y = Math.min(maxCursorMove, Math.max(-maxCursorMove, p.cursor.y));
      }
    }
  }

  private moved(point: WavePoint, withCursor: boolean): { x: number; y: number } {
    const x = point.x + point.wave.x + (withCursor ? point.cursor.x : 0);
    const y = point.y + point.wave.y + (withCursor ? point.cursor.y : 0);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }

  private drawLines(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = this.bounding;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = this.resolveLineColor();
    for (const points of this.lines) {
      let p1 = this.moved(points[0], false);
      ctx.moveTo(p1.x, p1.y);
      points.forEach((p, idx) => {
        const isLast = idx === points.length - 1;
        p1 = this.moved(p, !isLast);
        const p2 = this.moved(points[idx + 1] ?? points[points.length - 1], !isLast);
        ctx.lineTo(p1.x, p1.y);
        if (isLast) ctx.moveTo(p2.x, p2.y);
      });
    }
    ctx.stroke();
  }

  /** Explicit input wins; otherwise the theme's `--wr-waves-line-color`. */
  private resolveLineColor(): string {
    const explicit = this.lineColor();
    if (explicit !== null) return explicit;
    const themed = getComputedStyle(this.host.nativeElement).getPropertyValue('--wr-waves-line-color').trim();
    return themed || 'rgba(15, 23, 42, 0.12)';
  }

  private updateMouse(x: number, y: number): void {
    // Re-read the box each move — cheaper than tracking scroll, and the
    // host is usually a hero that rarely reflows mid-gesture.
    const rect = this.host.nativeElement.getBoundingClientRect();
    const mouse = this.mouse;
    mouse.x = x - rect.left;
    mouse.y = y - rect.top;
    if (!mouse.set) {
      mouse.sx = mouse.x;
      mouse.sy = mouse.y;
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.set = true;
    }
  }
}
