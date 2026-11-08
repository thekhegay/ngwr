/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { createCanvasBackdrop } from 'ngwr/animations/core';
import { numAttr, resolveCssColorChannels, wrCheckStyles } from 'ngwr/utils';

import {
  type ThreadLayout,
  createThreadNoise,
  threadApproach,
  threadLayout,
  threadPull,
  threadSway,
} from './thread-model';

/** The slowest the ribbon is redrawn, in ms: 30fps is more than its sway needs. */
const FRAME_MS = 33;
/** How much of the gap to its target the pull's strength closes per 60Hz frame, waxing and waning. */
const PULL_IN = 0.08;
const PULL_OUT = 0.04;
/** How much of the gap to the pointer the pull's centre closes per 60Hz frame. */
const FOLLOW = 0.18;
/** Below this the pull counts as gone and is not computed. */
const PULL_EPS = 0.005;
/** How much of its colour a thread shows: the muted ink, and the few tinted toward the primary. */
const ALPHA = 0.22;
const ALPHA_TINT = 0.34;
/** How far a tinted thread goes from the ink toward the tint colour. */
const TINT_MIX = 0.85;
const LINE_WIDTH = 1;

/**
 * A loose ribbon of hairline threads behind a section's content, running from
 * the start edge to the far one: gathered close together where they begin and
 * fanning apart as they go, like the strands of a cable fraying out. Every
 * thread sways slowly on its own, from noise smooth along its length, across
 * the ribbon and in time, so neighbours move together but never in step; a few
 * threads are tinted toward the primary colour. The pointer over the parent
 * gently draws the nearby part of the threads toward itself, the pull waxing
 * as it arrives and waning after it leaves. The hero's field pushes lines away
 * and runs an even grid of them; this is one ribbon, and it pulls.
 *
 * Fills its parent, which must be positioned (`position: relative`) and
 * isolated (`isolation: isolate`): the host is absolute, `inset: 0`, at
 * `z-index: -1`, so it lands at the floor of the parent's own stacking
 * context, under the content and over the page background. The parent takes
 * the pointer, passively: the host and its canvas never do, and a finger is
 * ignored, so a scroll over the section is never fought. One canvas through
 * `createCanvasBackdrop`: the ribbon never rests, so the loop runs whenever
 * the host is on screen and the document is visible, at most every
 * `FRAME_MS`; each thread is a smooth curve through about one point per 72px.
 * Under `prefers-reduced-motion: reduce` the still ribbon is drawn once; under
 * `forced-colors: active` nothing is. The server renders the empty canvas,
 * absolutely positioned, so the browser's first draw shifts no layout. The
 * noise is seeded, so two mounts show one ribbon. Under RTL the ribbon is
 * mirrored: it gathers at the inline start.
 *
 * Colours come from the `--wr-thread-lines-*` hooks through
 * `resolveCssColorChannels`, re-read when the scheme changes; the edges and
 * the lower part, where a section's cards sit, are faded by the stylesheet's
 * mask. Decorative: `aria-hidden`, no pointer events. Styles:
 * `@use 'ngwr/animations/thread-lines'`.
 */
@Component({
  selector: 'wr-thread-lines',
  templateUrl: './thread-lines.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-thread-lines', 'aria-hidden': 'true' },
})
export class WrThreadLines {
  /** How many threads the ribbon has. @default 24 */
  readonly count = input(24, { transform: numAttr(24) });

  /** How far from the pointer a thread is still pulled, in px. @default 180 */
  readonly reach = input(180, { transform: numAttr(180) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly dir = inject(Directionality, { optional: true });
  /** The ribbon gathers at the inline start: under RTL every x is mirrored at the draw. */
  private readonly mirrored = computed(() => this.dir?.valueSignal() === 'rtl');

  private readonly noise = createThreadNoise();
  private strokeInk = '';
  private strokeTint = '';

  private ribbon: ThreadLayout = threadLayout(0, 0, 0, 2);
  private width = 0;
  private posX = new Float32Array(0);
  private posY = new Float32Array(0);
  private readonly pullOut = new Float32Array(2);

  /** The scene's clock, in ms: moves only while a frame runs, so a hidden tab holds the pose. */
  private time = 0;
  /** Where the mouse is over the parent, in canvas px; NaN when it is not. */
  private pointerX = NaN;
  private pointerY = NaN;
  /** Where the pull is centred and how strong it is, eased after the pointer. */
  private pullX = NaN;
  private pullY = NaN;
  private pull = 0;

  private pointerTarget: HTMLElement | null = null;

  private readonly backdrop = createCanvasBackdrop(() => this.canvasRef().nativeElement, {
    frameMs: FRAME_MS,
    colors: canvas => this.resolveColors(canvas),
    layout: (width, height) => this.layout(width, height),
    // A living backdrop: it never rests, so the gates alone decide.
    active: () => true,
    advance: dt => this.advance(dt),
    draw: (ctx, width, height) => this.draw(ctx, width, height),
    rest: () => this.rest(),
    mounted: () => this.listen(),
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/thread-lines');
    // A still ribbon (reduced motion) follows a direction switch; a moving one redraws anyway.
    effect(() => {
      this.mirrored();
      if (!this.backdrop.running) this.backdrop.draw();
    });

    inject(DestroyRef).onDestroy(() => {
      this.pointerTarget?.removeEventListener('pointermove', this.onPointerMove);
      this.pointerTarget?.removeEventListener('pointerleave', this.onPointerLeave);
      this.pointerTarget = null;
    });
  }

  /** The parent takes the pointer: the host and its canvas never do. */
  private listen(): void {
    const target = this.host.nativeElement.parentElement;
    this.pointerTarget = target;
    target?.addEventListener('pointermove', this.onPointerMove, { passive: true });
    target?.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
  }

  // Pointer

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A finger that moves is scrolling: the ribbon must never fight it.
    if (event.pointerType === 'touch' || !this.backdrop.ctx) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
  };

  private readonly onPointerLeave = (): void => {
    this.pointerX = NaN;
    this.pointerY = NaN;
  };

  // Layout

  private resolveColors(canvas: HTMLCanvasElement): void {
    const ink = resolveCssColorChannels(canvas, 'var(--wr-thread-lines-ink)', '#6b7280');
    const tint = resolveCssColorChannels(canvas, 'var(--wr-thread-lines-tint)', '#3969e2');
    const channel = (c: number): number => Math.round((ink[c] + (tint[c] - ink[c]) * TINT_MIX) * 255);
    this.strokeInk = `rgba(${Math.round(ink[0] * 255)}, ${Math.round(ink[1] * 255)}, ${Math.round(ink[2] * 255)}, ${ALPHA})`;
    this.strokeTint = `rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${ALPHA_TINT})`;
  }

  private layout(width: number, height: number): void {
    this.ribbon = threadLayout(width, height, this.count());
    this.width = width;
    this.posX = new Float32Array(this.ribbon.y.length);
    this.posY = new Float32Array(this.ribbon.y.length);
    this.pose();
  }

  // Motion

  /** The ribbon with no pull, at the clock's pose. */
  private rest(): void {
    this.pull = 0;
    this.pullX = NaN;
    this.pullY = NaN;
    this.pose();
  }

  /** The clock moves on, the pull eases after the pointer, and every point is posed. */
  private advance(dt: number): void {
    this.time += dt;
    const scale = dt / 16.7;
    const pointing = !Number.isNaN(this.pointerX);
    if (pointing) {
      // The first touch of the pointer sets the centre; after that it is eased.
      if (Number.isNaN(this.pullX)) {
        this.pullX = this.pointerX;
        this.pullY = this.pointerY;
      } else {
        this.pullX = threadApproach(this.pullX, this.pointerX, FOLLOW, scale);
        this.pullY = threadApproach(this.pullY, this.pointerY, FOLLOW, scale);
      }
    }
    this.pull = threadApproach(this.pull, pointing ? 1 : 0, pointing ? PULL_IN : PULL_OUT, scale);
    if (this.pull < PULL_EPS) {
      this.pull = 0;
      if (!pointing) {
        this.pullX = NaN;
        this.pullY = NaN;
      }
    }
    this.pose();
  }

  /** Every point: its place at rest, its sway now, and the pull if there is one. */
  private pose(): void {
    const { count, points, x, y } = this.ribbon;
    const pulling = this.pull > 0;
    // The pointer is physical; the ribbon is laid out from the inline start.
    const px = this.mirrored() ? this.width - this.pullX : this.pullX;
    const py = this.pullY;
    const reach = this.reach();
    const out = this.pullOut;
    const last = points - 1;
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < points; k++) {
        const idx = i * points + k;
        const sx = x[k];
        let sy = y[idx] + threadSway(this.noise, sx, k / last, i, this.time);
        let dx = 0;
        if (pulling) {
          threadPull(sx - px, sy - py, reach, this.pull, out);
          dx = out[0];
          sy += out[1];
        }
        this.posX[idx] = sx + dx;
        this.posY[idx] = sy;
      }
    }
  }

  /** One frame: every thread as a smooth curve through its points, one stroke for the ink and one for the tint. */
  private draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.strokeInk === '') return;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = LINE_WIDTH;
    this.strokeThreads(ctx, width, 0, this.strokeInk);
    this.strokeThreads(ctx, width, 1, this.strokeTint);
  }

  private strokeThreads(ctx: CanvasRenderingContext2D, width: number, tinted: number, stroke: string): void {
    const { count, points, tinted: tints } = this.ribbon;
    const flip = this.mirrored();
    const px = (value: number): number => (flip ? width - value : value);
    let any = false;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      if (tints[i] !== tinted) continue;
      const base = i * points;
      ctx.moveTo(px(this.posX[base]), this.posY[base]);
      for (let k = 1; k < points - 1; k++) {
        const idx = base + k;
        ctx.quadraticCurveTo(
          px(this.posX[idx]),
          this.posY[idx],
          px((this.posX[idx] + this.posX[idx + 1]) / 2),
          (this.posY[idx] + this.posY[idx + 1]) / 2
        );
      }
      ctx.lineTo(px(this.posX[base + points - 1]), this.posY[base + points - 1]);
      any = true;
    }
    if (!any) return;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export { FRAME_MS as THREAD_LINES_FRAME_MS, PULL_IN as THREAD_LINES_PULL_IN, PULL_OUT as THREAD_LINES_PULL_OUT };
