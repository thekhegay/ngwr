import { Component, DestroyRef, ElementRef, ViewEncapsulation, inject, input, viewChild } from '@angular/core';

import { numAttr, resolveCssColorChannels } from 'ngwr/utils';

import { createCanvasBackdrop } from '../canvas-backdrop';

import { type Ripple, rippleAdd, rippleAlive, rippleField, rippleGridLayout } from './ripple-model';

/** A grid line is sampled this often along its length, in px, so a bend is a curve and not a kink. */
const SAMPLE = 6;
/** The glow is quantised into this many strokes, so a frame is a handful of paths, not one per segment. */
const LEVELS = 6;
/** How much of its colour a line shows at rest and fully lit. */
const ALPHA = 0.2;
const ALPHA_LIT = 0.7;
const LINE_WIDTH = 1;

/**
 * A faint square grid of thin lines behind a page's content. A click or a tap
 * on the parent sends a ring out from that point: as the wave passes, the lines
 * bend outward and brighten a little toward the primary colour; the ring
 * widens, fades, and the grid lies flat again. Several rings add up where they
 * cross. The model is `ripple-model.ts`.
 *
 * Fills its positioned parent, which isolates itself, so the host's negative
 * z-index lands under the content and over the page background. The parent
 * takes the click, passively and never stopped, so a link or a button over the
 * grid works as before and still starts a ring under the pointer. One canvas
 * through `createCanvasBackdrop`: the frame loop runs only while a ring is
 * alive, on screen and with the document visible; at rest the flat grid is
 * drawn once, as straight lines. In motion each line is a polyline sampled
 * every few px, and the segments are grouped by glow into a few strokes.
 *
 * Colours come from the `--ngwr-ripple-grid-*` hooks through
 * `resolveCssColorChannels`, re-read when the scheme changes. Under
 * `prefers-reduced-motion: reduce` only the flat grid is drawn; under
 * `forced-colors: active` nothing is. The server renders the empty canvas,
 * absolutely positioned, so the browser's first draw shifts no layout.
 * Decorative: `aria-hidden`, no pointer events. Styles: `ripple-grid.scss`,
 * loaded by `styles.scss`.
 */
@Component({
  selector: 'ngwr-ripple-grid',
  templateUrl: './ripple-grid.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-ripple-grid', 'aria-hidden': 'true' },
})
export class RippleGrid {
  /** Distance between two grid lines, in px. @default 32 */
  readonly spacing = input(32, { transform: numAttr(32) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** One stroke per glow level, rest first. */
  private strokes: string[] = [];

  private xs = new Float32Array(0);
  private ys = new Float32Array(0);
  // Every line's samples in one run, line after line; `lineStart` holds where each begins and a final end.
  private baseX = new Float32Array(0);
  private baseY = new Float32Array(0);
  private lineStart = new Int32Array(1);
  private posX = new Float32Array(0);
  private posY = new Float32Array(0);
  private level = new Uint8Array(0);
  private readonly field = new Float32Array(3);

  private ripples: Ripple[] = [];
  /** The scene's clock, in ms: moves only while a frame runs, so a hidden tab holds the rings where they are. */
  private time = 0;

  private clickTarget: HTMLElement | null = null;

  private readonly backdrop = createCanvasBackdrop(() => this.canvasRef().nativeElement, {
    colors: canvas => this.resolveColors(canvas),
    layout: (width, height) => this.layout(width, height),
    active: () => this.ripples.length > 0,
    advance: dt => this.advance(dt),
    draw: (ctx, width, height) => this.draw(ctx, width, height),
    rest: () => this.rest(),
    mounted: () => this.listen(),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clickTarget?.removeEventListener('click', this.onClick);
      this.clickTarget = null;
    });
  }

  /** The parent takes the click: the host and its canvas never do. */
  private listen(): void {
    const target = this.host.nativeElement.parentElement;
    this.clickTarget = target;
    target?.addEventListener('click', this.onClick, { passive: true });
  }

  private readonly onClick = (event: MouseEvent): void => {
    // A keyboard activation of a link or a button is a click with no point: nothing to ring from.
    if (event.detail === 0 || !this.backdrop.ctx) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const ripple = { x: event.clientX - rect.left, y: event.clientY - rect.top, born: this.time };
    this.ripples = rippleAdd(this.ripples, ripple);
    this.backdrop.sync();
  };

  private resolveColors(canvas: HTMLCanvasElement): void {
    const ink = resolveCssColorChannels(canvas, 'var(--ngwr-ripple-grid-ink)', '#6b7280');
    const glow = resolveCssColorChannels(canvas, 'var(--ngwr-ripple-grid-glow)', '#3969e2');
    this.strokes = [];
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      const channel = (c: number): number => Math.round((ink[c] + (glow[c] - ink[c]) * t) * 255);
      const alpha = ALPHA + (ALPHA_LIT - ALPHA) * t;
      this.strokes.push(`rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha.toFixed(3)})`);
    }
  }

  /** The lines, and each one's samples along its length, the last sample on the far edge. */
  private layout(width: number, height: number): void {
    const { xs, ys } = rippleGridLayout(width, height, this.spacing());
    this.xs = xs;
    this.ys = ys;
    const along = Math.ceil(height / SAMPLE) + 1;
    const across = Math.ceil(width / SAMPLE) + 1;
    const count = xs.length * along + ys.length * across;
    this.baseX = new Float32Array(count);
    this.baseY = new Float32Array(count);
    this.posX = new Float32Array(count);
    this.posY = new Float32Array(count);
    this.level = new Uint8Array(count);
    this.lineStart = new Int32Array(xs.length + ys.length + 1);
    let i = 0;
    let line = 0;
    for (const x of xs) {
      this.lineStart[line++] = i;
      for (let k = 0; k < along; k++, i++) {
        this.baseX[i] = x;
        this.baseY[i] = Math.min(k * SAMPLE, height);
      }
    }
    for (const y of ys) {
      this.lineStart[line++] = i;
      for (let k = 0; k < across; k++, i++) {
        this.baseX[i] = Math.min(k * SAMPLE, width);
        this.baseY[i] = y;
      }
    }
    this.lineStart[line] = i;
    this.ripples = [];
  }

  private rest(): void {
    this.ripples = [];
  }

  /** The clock moves on and the rings that have faded are dropped. */
  private advance(dt: number): void {
    this.time += dt;
    this.ripples = rippleAlive(this.ripples, this.time);
  }

  private draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.strokes.length === 0) return;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = LINE_WIDTH;
    if (this.ripples.length === 0) {
      this.drawFlat(ctx, width, height);
      return;
    }
    this.sample();
    this.drawBent(ctx);
  }

  /** The grid at rest: straight lines, one path, one stroke. */
  private drawFlat(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.beginPath();
    for (const x of this.xs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (const y of this.ys) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.strokeStyle = this.strokes[0];
    ctx.stroke();
  }

  /** Every sample displaced by the live rings, and its glow quantised to a level. */
  private sample(): void {
    const { field, ripples, time } = this;
    for (let i = 0; i < this.baseX.length; i++) {
      rippleField(ripples, time, this.baseX[i], this.baseY[i], field);
      this.posX[i] = this.baseX[i] + field[0];
      this.posY[i] = this.baseY[i] + field[1];
      this.level[i] = Math.round(Math.min(1, field[2]) * (LEVELS - 1));
    }
  }

  /** The grid in motion: one path per glow level, every segment at that level in it, each segment drawn once. */
  private drawBent(ctx: CanvasRenderingContext2D): void {
    const lines = this.lineStart.length - 1;
    for (let l = 0; l < LEVELS; l++) {
      let any = false;
      ctx.beginPath();
      for (let line = 0; line < lines; line++) {
        const end = this.lineStart[line + 1] - 1;
        let open = false;
        for (let i = this.lineStart[line]; i < end; i++) {
          if (Math.max(this.level[i], this.level[i + 1]) !== l) {
            open = false;
            continue;
          }
          if (!open) {
            ctx.moveTo(this.posX[i], this.posY[i]);
            open = true;
          }
          ctx.lineTo(this.posX[i + 1], this.posY[i + 1]);
          any = true;
        }
      }
      if (!any) continue;
      ctx.strokeStyle = this.strokes[l];
      ctx.stroke();
    }
  }
}

export { LEVELS as RIPPLE_GRID_LEVELS, SAMPLE as RIPPLE_GRID_SAMPLE };
