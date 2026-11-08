/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, DestroyRef, ElementRef, ViewEncapsulation, inject, viewChild } from '@angular/core';

import { createCanvasBackdrop, type WrNoise } from 'ngwr/animations/core';
import { resolveCssColorChannels, wrCheckStyles } from 'ngwr/utils';

import {
  CAP,
  type FluidPool,
  TINTS,
  createFluidNoise,
  fluidAdvance,
  fluidAlpha,
  fluidBlend,
  fluidClear,
  fluidEmit,
  fluidLive,
  fluidPool,
  fluidRadius,
  fluidVelocity,
} from './fluid-model';

/** The side of a pre-rendered particle, in px: it is drawn scaled, so this is the gradient's resolution only. */
const SPRITE = 64;
/** The sprite's fall-off, from its centre to its edge: how much of the colour at each stop. */
const SPRITE_STOPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.35, 0.55],
  [0.7, 0.15],
  [1, 0],
];

/**
 * A soft trail of colour behind a region's content, left by the pointer: as
 * the mouse moves, particles are emitted along its path, each a blurred disc
 * that drifts on with some of the pointer's speed, is carried round by a slow
 * swirling field, grows and fades, like ink dropped in water, gone about a
 * second after the mouse stops. The model is `fluid-model.ts`: a pool of
 * `CAP` particles, filled in a ring so a long stroke never grows past it.
 *
 * Fills its positioned parent, which isolates itself, so the host's negative
 * z-index lands under the content and over the page background. The parent
 * takes the pointer, passively: the host and its canvas never do, and a
 * finger is ignored, so a scroll over the region is never fought; a pen
 * draws like a mouse. One canvas through `createCanvasBackdrop`: the frame
 * loop runs only while a particle is alive, on screen and with the document
 * visible, and stops on its own once the trail has dissolved; a still trail
 * costs no frames. Each colour is pre-rendered once into a small sprite,
 * and a frame is one `drawImage` per live particle.
 *
 * Colours come from the `--wr-fluid-cursor-*` hooks through
 * `resolveCssColorChannels`, re-read when the scheme changes: `TINTS` steps
 * from tint A to tint B, the stroke cycling between them as it goes. On a
 * dark surface the particles are added (`lighter`), so the trail glows where
 * it is thick; on a light one they are laid over at a lower strength, since
 * added colour on white only saturates. Under `prefers-reduced-motion:
 * reduce` nothing is drawn; under `forced-colors: active` nothing is; on the
 * server the empty canvas is rendered, absolutely positioned, so the
 * browser's first draw shifts no layout. Decorative: `aria-hidden`, no
 * pointer events. Styles: `@use 'ngwr/animations/fluid-cursor'`, which also lists
 * the `--wr-fluid-cursor-*` hooks.
 */
@Component({
  selector: 'wr-fluid-cursor',
  templateUrl: './fluid-cursor.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-fluid-cursor', 'aria-hidden': 'true' },
})
export class WrFluidCursor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly pool: FluidPool = fluidPool(CAP);
  private readonly noise: WrNoise = createFluidNoise();
  private readonly flow = new Float32Array(2);
  private readonly velocity = new Float32Array(2);

  /** One pre-rendered disc per tint, A first; empty until the colours resolve. */
  private sprites: HTMLCanvasElement[] = [];
  private composite: GlobalCompositeOperation = 'source-over';
  private strength = 0;

  /** The scene's clock, in ms: moves only while a frame runs, so a hidden tab holds the field. */
  private time = 0;
  /** Where and when the pointer last was over the parent, in canvas px; NaN between strokes. */
  private lastX = NaN;
  private lastY = NaN;
  private lastTime = 0;

  private pointerTarget: HTMLElement | null = null;

  private readonly backdrop = createCanvasBackdrop(() => this.canvasRef().nativeElement, {
    colors: canvas => this.resolveColors(canvas),
    layout: () => undefined,
    active: () => this.pool.alive > 0,
    advance: dt => this.advance(dt),
    draw: (ctx, width, height) => this.draw(ctx, width, height),
    rest: () => fluidClear(this.pool),
    mounted: () => this.listen(),
  });

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/fluid-cursor');

    inject(DestroyRef).onDestroy(() => {
      this.pointerTarget?.removeEventListener('pointermove', this.onPointerMove);
      this.pointerTarget?.removeEventListener('pointerleave', this.onPointerLeave);
      this.pointerTarget = null;
      this.sprites = [];
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
    // A finger that moves is scrolling: the trail must never fight it.
    if (event.pointerType === 'touch' || !this.backdrop.ctx) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = event.timeStamp;
    if (Number.isNaN(this.lastX)) {
      fluidEmit(this.pool, x, y, x, y, 0, 0);
    } else {
      fluidVelocity(x - this.lastX, y - this.lastY, now - this.lastTime, this.velocity);
      fluidEmit(this.pool, this.lastX, this.lastY, x, y, this.velocity[0], this.velocity[1]);
    }
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
    this.backdrop.sync();
  };

  private readonly onPointerLeave = (): void => {
    this.lastX = NaN;
    this.lastY = NaN;
  };

  // Colours

  private resolveColors(canvas: HTMLCanvasElement): void {
    const a = resolveCssColorChannels(canvas, 'var(--wr-fluid-cursor-tint-a)', '#3969e2');
    const b = resolveCssColorChannels(canvas, 'var(--wr-fluid-cursor-tint-b)', '#0ea5e9');
    const surface = resolveCssColorChannels(canvas, 'var(--wr-color-surface)', '#ffffff');
    const blend = fluidBlend(surface);
    this.composite = blend.composite;
    this.strength = blend.strength;
    const doc = canvas.ownerDocument;
    const sprites: HTMLCanvasElement[] = [];
    for (let k = 0; k < TINTS; k++) {
      const t = k / (TINTS - 1);
      const channel = (c: number): number => Math.round((a[c] + (b[c] - a[c]) * t) * 255);
      const sprite = this.sprite(doc, `${channel(0)}, ${channel(1)}, ${channel(2)}`);
      if (!sprite) break;
      sprites.push(sprite);
    }
    this.sprites = sprites.length === TINTS ? sprites : [];
  }

  /** A disc of one colour, full at the centre and gone at the edge, drawn once. */
  private sprite(doc: Document, rgb: string): HTMLCanvasElement | null {
    const canvas = doc.createElement('canvas');
    canvas.width = SPRITE;
    canvas.height = SPRITE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const half = SPRITE / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    for (const [stop, alpha] of SPRITE_STOPS) gradient.addColorStop(stop, `rgba(${rgb}, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SPRITE, SPRITE);
    return canvas;
  }

  // Motion

  private advance(dt: number): void {
    this.time += dt;
    fluidAdvance(this.pool, dt, this.noise, this.time, this.flow);
  }

  /** One frame: every live particle as its tint's sprite, scaled to its radius, at its strength. */
  private draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    const pool = this.pool;
    if (pool.alive === 0 || this.sprites.length === 0) return;
    ctx.globalCompositeOperation = this.composite;
    for (let i = 0; i < pool.cap; i++) {
      if (!fluidLive(pool, i)) continue;
      const r = fluidRadius(pool.age[i], pool.life[i]) * pool.size[i];
      ctx.globalAlpha = fluidAlpha(pool.age[i], pool.life[i]) * this.strength;
      ctx.drawImage(this.sprites[pool.tint[i]], pool.x[i] - r, pool.y[i] - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

export { SPRITE as FLUID_CURSOR_SPRITE };
