/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the ClickSpark effect by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/animations/click-spark
 */

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

interface Spark {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly startTime: number;
}

const num =
  (fallback: number) =>
  (v: unknown): number =>
    coerceNumberProperty(v, fallback);

const EASINGS: Readonly<Record<WrClickSparkEasing, (t: number) => number>> = {
  linear: t => t,
  'ease-in': t => t * t,
  'ease-in-out': t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'ease-out': t => t * (2 - t),
};

/**
 * Click ripple — bursts a ring of short line sparks from the click point
 * across any projected content. Wraps children in a positioned container
 * with a `pointer-events: none` canvas overlay, so projected DOM stays
 * fully interactive.
 *
 * @example
 * ```html
 * <wr-click-spark>
 *   <h1>Click anywhere</h1>
 *   <button>Buttons still work</button>
 * </wr-click-spark>
 * ```
 *
 * @see https://www.reactbits.dev/animations/click-spark
 */
@Component({
  selector: 'wr-click-spark',
  templateUrl: './click-spark.html',
  styleUrl: './click-spark.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-click-spark',
    '(click)': 'onClick($event)',
  },
})
export class WrClickSpark {
  /** Spark line colour. @default '#fff' */
  readonly sparkColor = input('#fff');

  /** Length of each spark line in pixels (at t=0; tapers to 0 at t=1). @default 10 */
  readonly sparkSize = input(10, { transform: num(10) });

  /** Distance each spark travels from origin in pixels. @default 15 */
  readonly sparkRadius = input(15, { transform: num(15) });

  /** Number of sparks per click (evenly distributed around the circle). @default 8 */
  readonly sparkCount = input(8, { transform: num(8) });

  /** Animation duration in ms. @default 400 */
  readonly duration = input(400, { transform: num(400) });

  /** Easing function applied to the travel distance. @default 'ease-out' */
  readonly easing = input<WrClickSparkEasing>('ease-out');

  /** Multiplier on the travel distance — bumps the radius without changing `sparkRadius`. @default 1 */
  readonly extraScale = input(1, { transform: num(1) });

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  private sparks: Spark[] = [];

  constructor() {
    if (!this.isBrowser) return;
    afterNextRender(() => {
      this.syncCanvasSize();
      this.watchResize();
      this.startLoop();
    });
  }

  protected onClick(event: MouseEvent): void {
    // Reduced motion: no spark bursts — same policy as wr-confetti.
    if (this.platform.prefersReducedMotion()) return;
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = performance.now();
    const count = this.sparkCount();
    for (let i = 0; i < count; i++) {
      this.sparks.push({ x, y, angle: (2 * Math.PI * i) / count, startTime: now });
    }
  }

  // Internals

  private syncCanvasSize(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = this.host.nativeElement;
    const { width, height } = host.getBoundingClientRect();
    if (canvas.width !== Math.round(width)) canvas.width = Math.round(width);
    if (canvas.height !== Math.round(height)) canvas.height = Math.round(height);
  }

  private watchResize(): void {
    if (typeof ResizeObserver === 'undefined') return;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.syncCanvasSize(), 100);
    });
    ro.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => {
      ro.disconnect();
      clearTimeout(resizeTimer);
    });
  }

  private startLoop(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const draw = (ts: number): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ease = EASINGS[this.easing()];
      const duration = this.duration();
      const sparkRadius = this.sparkRadius();
      const sparkSize = this.sparkSize();
      const extraScale = this.extraScale();
      const color = this.sparkColor();

      this.sparks = this.sparks.filter(spark => {
        const elapsed = ts - spark.startTime;
        if (elapsed >= duration) return false;
        const progress = elapsed / duration;
        const eased = ease(progress);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return true;
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
  }
}

export type WrClickSparkEasing = 'linear' | 'ease-in' | 'ease-in-out' | 'ease-out';
