import { Component, DestroyRef, ElementRef, ViewEncapsulation, inject, input, viewChild } from '@angular/core';

import { clamp, numAttr, resolveCssColorChannels } from 'ngwr/utils';

import { MAX_DPR, MAX_PIXELS, createCanvasBackdrop } from '../canvas-backdrop';

/** How far a dot is pushed at the pointer itself, in px. */
const PUSH = 14;
/** Spring that returns a pushed dot, tuned per 60Hz frame: it overshoots about 15% and settles in half a second. */
const STIFFNESS = 0.12;
const DAMPING = 0.72;
/** How much of the gap to its target a dot's light closes per 60Hz frame. */
const LIGHT_EASE = 0.18;
/** Below this, in px and in light, a dot counts as at rest and snaps there. */
const REST_EPS = 0.02;
/** The light is quantised into this many fill colours, so a frame is a handful of paths, not one per dot. */
const LEVELS = 8;
/** A dot's radius at rest and fully lit, in px. */
const RADIUS = 1.1;
const RADIUS_LIT = 1.9;
/** How much of its colour a dot shows at rest and fully lit. */
const ALPHA = 0.32;
const ALPHA_LIT = 0.75;
/** A tap's ring: how far it travels and how long it takes. */
const PULSE_REACH = 220;
const PULSE_MS = 650;
const PULSE_WIDTH = 36;
const TAU = Math.PI * 2;

/**
 * One damped spring step on one axis, in place: `vel[i]` is updated, then
 * added to `off[i]`. `scale` is the frame length in 60Hz frames, so a slow
 * frame takes a longer step and a fast screen a shorter one, and the motion
 * reads the same on both.
 */
export function dotGridSpringStep(
  off: Float32Array,
  vel: Float32Array,
  i: number,
  target: number,
  scale: number
): void {
  const k = STIFFNESS * scale;
  const damping = DAMPING ** scale;
  vel[i] = (vel[i] + (target - off[i]) * k) * damping;
  off[i] += vel[i];
}

/** Where the dots of a `width` by `height` field sit, centred, `spacing` apart. */
export function dotGridLayout(
  width: number,
  height: number,
  spacing: number
): { cols: number; rows: number; x: Float32Array<ArrayBuffer>; y: Float32Array<ArrayBuffer> } {
  const gap = Math.max(8, spacing);
  const cols = width > 0 && height > 0 ? Math.floor(width / gap) + 1 : 0;
  const rows = cols > 0 ? Math.floor(height / gap) + 1 : 0;
  const x0 = (width - (cols - 1) * gap) / 2;
  const y0 = (height - (rows - 1) * gap) / 2;
  const x = new Float32Array(cols * rows);
  const y = new Float32Array(cols * rows);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const i = c * rows + r;
      x[i] = x0 + c * gap;
      y[i] = y0 + r * gap;
    }
  }
  return { cols, rows, x, y };
}

/**
 * An even field of small, faint dots behind a section's content. Near the
 * pointer the dots light up toward the primary colour and are pushed gently
 * away; each one follows a damped spring back to its place when the pointer
 * moves on, so a fast sweep leaves a short, soft wake that settles. With no
 * pointer the field rests.
 *
 * Fills its positioned parent, which isolates itself (`.ngwr-section--backdrop`)
 * so the host's negative z-index lands under the content and over the page
 * background. The parent takes the pointer: the host and its canvas never do.
 * One canvas through `createCanvasBackdrop`, redrawn only while something
 * moves: the frame loop runs while the pointer is over the parent or a dot is
 * still settling, and only while the host is on screen and the document is
 * visible; at rest the still field is drawn once. Touch never pushes, so a
 * scroll over the section is never fought; a tap sends one ring of light out
 * from the finger instead.
 *
 * Colours come from the `--ngwr-dot-grid-*` hooks through `resolveCssColorChannels`,
 * re-read when the scheme changes. Under `prefers-reduced-motion: reduce` only
 * the still field is drawn; under `forced-colors: active` nothing is. The server
 * renders the empty canvas, absolutely positioned, so the browser's first draw
 * shifts no layout. Decorative: `aria-hidden`, no pointer events. Styles:
 * `dot-grid.scss`, loaded by `styles.scss`.
 */
@Component({
  selector: 'ngwr-dot-grid',
  templateUrl: './dot-grid.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-dot-grid', 'aria-hidden': 'true' },
})
export class DotGrid {
  /** Distance between two dots, in px. @default 26 */
  readonly spacing = input(26, { transform: numAttr(26) });

  /** How far from the pointer a dot still lights and moves, in px. @default 140 */
  readonly reach = input(140, { transform: numAttr(140) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** One fill per light level, rest first, and the radius that goes with it. */
  private fills: string[] = [];
  private radii: number[] = [];

  // One entry per dot, column-major
  private count = 0;
  private baseX = new Float32Array(0);
  private baseY = new Float32Array(0);
  private offX = new Float32Array(0);
  private offY = new Float32Array(0);
  private velX = new Float32Array(0);
  private velY = new Float32Array(0);
  private light = new Float32Array(0);
  /** Each dot's light level this frame, so the draw groups dots by fill. */
  private level = new Uint8Array(0);

  private pointerX = NaN;
  private pointerY = NaN;
  private pulseX = NaN;
  private pulseY = NaN;
  private pulseAge = Infinity;
  /** True while every dot sits at its place, unlit and still. */
  private settled = true;

  private pointerTarget: HTMLElement | null = null;

  private readonly backdrop = createCanvasBackdrop(() => this.canvasRef().nativeElement, {
    colors: canvas => this.resolveColors(canvas),
    layout: (width, height) => this.layout(width, height),
    active: () => this.pointerInside || !this.settled,
    advance: dt => this.advance(dt),
    draw: (ctx, width, height) => this.draw(ctx, width, height),
    rest: () => this.rest(),
    mounted: () => this.listen(),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pointerTarget?.removeEventListener('pointermove', this.onPointerMove);
      this.pointerTarget?.removeEventListener('pointerleave', this.onPointerLeave);
      this.pointerTarget?.removeEventListener('pointerdown', this.onPointerDown);
      this.pointerTarget = null;
    });
  }

  /** The parent takes the pointer: the host and its canvas never do. */
  private listen(): void {
    const target = this.host.nativeElement.parentElement;
    this.pointerTarget = target;
    target?.addEventListener('pointermove', this.onPointerMove, { passive: true });
    target?.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
    target?.addEventListener('pointerdown', this.onPointerDown, { passive: true });
  }

  // Pointer

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A finger that moves is scrolling: the field must never fight it.
    if (event.pointerType === 'touch' || !this.backdrop.ctx) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
    this.settled = false;
    this.backdrop.sync();
  };

  private readonly onPointerLeave = (): void => {
    this.pointerX = NaN;
    this.pointerY = NaN;
    this.backdrop.sync();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' || !this.backdrop.ctx) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    this.pulseX = event.clientX - rect.left;
    this.pulseY = event.clientY - rect.top;
    this.pulseAge = 0;
    this.settled = false;
    this.backdrop.sync();
  };

  // Layout

  private resolveColors(canvas: HTMLCanvasElement): void {
    const ink = resolveCssColorChannels(canvas, 'var(--ngwr-dot-grid-ink)', '#6b7280');
    const glow = resolveCssColorChannels(canvas, 'var(--ngwr-dot-grid-glow)', '#3969e2');
    this.fills = [];
    this.radii = [];
    for (let l = 0; l < LEVELS; l++) {
      const t = l / (LEVELS - 1);
      const channel = (c: number): number => Math.round((ink[c] + (glow[c] - ink[c]) * t) * 255);
      const alpha = ALPHA + (ALPHA_LIT - ALPHA) * t;
      this.fills.push(`rgba(${channel(0)}, ${channel(1)}, ${channel(2)}, ${alpha.toFixed(3)})`);
      this.radii.push(RADIUS + (RADIUS_LIT - RADIUS) * t);
    }
  }

  private layout(width: number, height: number): void {
    const { x, y } = dotGridLayout(width, height, this.spacing());
    this.count = x.length;
    this.baseX = x;
    this.baseY = y;
    this.offX = new Float32Array(this.count);
    this.offY = new Float32Array(this.count);
    this.velX = new Float32Array(this.count);
    this.velY = new Float32Array(this.count);
    this.light = new Float32Array(this.count);
    this.level = new Uint8Array(this.count);
    this.settled = true;
  }

  // Motion

  /** Whether the pointer rests over the parent. */
  private get pointerInside(): boolean {
    return !Number.isNaN(this.pointerX);
  }

  /** Every dot back at its place, unlit and still. */
  private rest(): void {
    this.offX.fill(0);
    this.offY.fill(0);
    this.velX.fill(0);
    this.velY.fill(0);
    this.light.fill(0);
    this.level.fill(0);
    this.pulseAge = Infinity;
    this.settled = true;
  }

  /** Moves every dot one frame: the pointer's push and light, the tap's ring, then the springs. */
  private advance(dt: number): void {
    const scale = Math.min(2, dt / 16.7);
    const ease = 1 - (1 - LIGHT_EASE) ** scale;
    const reach = this.reach();
    const reach2 = reach * reach;
    const px = this.pointerX;
    const py = this.pointerY;
    const pointing = this.pointerInside;

    this.pulseAge += dt;
    const pulsing = this.pulseAge < PULSE_MS;
    const pulseT = this.pulseAge / PULSE_MS;
    const pulseR = PULSE_REACH * (1 - (1 - pulseT) ** 2);
    const pulseStrength = pulsing ? 1 - pulseT : 0;

    let settled = true;
    for (let i = 0; i < this.count; i++) {
      const x = this.baseX[i];
      const y = this.baseY[i];
      let targetX = 0;
      let targetY = 0;
      let targetLight = 0;
      if (pointing) {
        const dx = x - px;
        const dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < reach2) {
          const d = Math.sqrt(d2);
          const w = (1 - d / reach) ** 2;
          targetLight = w;
          if (d > 0) {
            targetX = (dx / d) * w * PUSH;
            targetY = (dy / d) * w * PUSH;
          }
        }
      }
      if (pulsing) {
        const d = Math.hypot(x - this.pulseX, y - this.pulseY);
        const band = Math.abs(d - pulseR);
        if (band < PULSE_WIDTH) {
          targetLight = Math.max(targetLight, (1 - band / PULSE_WIDTH) * pulseStrength);
        }
      }

      dotGridSpringStep(this.offX, this.velX, i, targetX, scale);
      dotGridSpringStep(this.offY, this.velY, i, targetY, scale);
      this.light[i] += (targetLight - this.light[i]) * ease;

      const still =
        Math.abs(this.offX[i]) < REST_EPS &&
        Math.abs(this.offY[i]) < REST_EPS &&
        Math.abs(this.velX[i]) < REST_EPS &&
        Math.abs(this.velY[i]) < REST_EPS &&
        this.light[i] < REST_EPS;
      if (still) {
        this.offX[i] = 0;
        this.offY[i] = 0;
        this.velX[i] = 0;
        this.velY[i] = 0;
        this.light[i] = 0;
      } else {
        settled = false;
      }
      this.level[i] = Math.round(clamp(this.light[i], 0, 1) * (LEVELS - 1));
    }
    this.settled = settled && !pulsing;
  }

  /** One frame: one path per light level, every dot at that level in it. */
  private draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.fills.length === 0) return;
    ctx.clearRect(0, 0, width, height);
    for (let l = 0; l < LEVELS; l++) {
      const r = this.radii[l];
      let any = false;
      ctx.beginPath();
      for (let i = 0; i < this.count; i++) {
        if (this.level[i] !== l) continue;
        const x = this.baseX[i] + this.offX[i];
        const y = this.baseY[i] + this.offY[i];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = this.fills[l];
      ctx.fill();
    }
  }
}

export { LEVELS as DOT_GRID_LEVELS, MAX_DPR as DOT_GRID_MAX_DPR, MAX_PIXELS as DOT_GRID_MAX_PIXELS };
