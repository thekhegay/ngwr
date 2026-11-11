/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';

import { MAX_FRAME_MS, MAX_PIXELS, canvasBackdropRatio } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrResolveCssColorChannels, wrWatchColorScheme, wrCheckStyles } from 'ngwr/utils';

import { FLUID_CONTEXT_ATTRIBUTES, type FluidGLContext, type FluidSim, createFluidSim } from './fluid-gl';
import {
  CYCLE_PX,
  type FluidColor,
  QUALITY,
  SPLASH_RAYS,
  SPLASH_SPIN,
  SPLASH_STEPS,
  fluidDecay,
  fluidDyeScale,
  fluidGrid,
  fluidInk,
  fluidPaletteColor,
  fluidRainbowColor,
  fluidRestMs,
  fluidSplash,
  fluidSplats,
  fluidVelocity,
} from './fluid-model';
import type { WrFluidCursorQuality } from './types';

/** The palette hooks, in stroke order, each with what it is read as where the sheet is missing. */
const PALETTE_HOOKS: readonly (readonly [string, string])[] = [
  ['var(--wr-fluid-cursor-color-1)', '#3969e2'],
  ['var(--wr-fluid-cursor-color-2)', '#dc3137'],
  ['var(--wr-fluid-cursor-color-3)', '#ffba00'],
  ['var(--wr-fluid-cursor-color-4)', '#008800'],
  ['var(--wr-fluid-cursor-color-5)', '#3472d9'],
];

/** How much of the pointer's speed a unit `force` hands the fluid. */
const FORCE_BASE = 0.55;
/** The density a unit `intensity` lays per splat. */
const DYE_BASE = 0.3;
/** The vorticity confinement a unit `swirl` applies. */
const SWIRL_BASE = 24;
/**
 * A click's splash: each ray is {@link SPLASH_STEPS} splats out along its
 * direction, this many radii apart, each this fraction of the radius and
 * narrower than the last, with this much of a stroke's dye. The arm is laid
 * as dye, not left to the push: an outward push alone is divergence, and the
 * pressure solve takes it straight back out.
 */
const SPLASH_OFFSET = 0.7;
const SPLASH_RAY = 0.55;
const SPLASH_DYE = 1.5;
/** A click turns the palette this far, so the splash is not the stroke's colour. */
const SPLASH_PHASE = 0.17;

/**
 * Coloured ink behind a region's content, stirred by the pointer: a move lays
 * dye and momentum into a fluid, and the dye swirls into curling eddies,
 * folds over itself, drifts on with the motion the pointer gave it and fades
 * out over a few seconds. A fast stroke leaves a long sweeping trail with
 * vortices peeling off; a slow one soft billows; a click a radial splash.
 * The fluid is `fluid-gl.ts`, a stable-fluids solver as WebGL passes; the
 * pure pieces (grids, decay, splat spacing, palette) are `fluid-model.ts`.
 *
 * Fills its positioned parent, which isolates itself, so the host's negative
 * z-index lands under the content and over the page background. The parent
 * takes the pointer, passively: the host and its canvas never do. A mouse,
 * a pen and a finger all draw; a finger is never stopped from scrolling. The
 * context and the fields are created at the first input, not at mount, so a
 * region nobody hovers costs nothing; the frame loop runs only while the
 * host is on screen, the document is visible and the last input is nearer
 * than the time the dye takes to fade (`trail`, from the model, no
 * read-back), and stops on its own after that, the fields cleared.
 *
 * Colours come from the `--wr-fluid-cursor-color-*` hooks through
 * `wrResolveCssColorChannels`, re-read when the scheme changes; a stroke
 * cycles through them as it goes, or through the hue circle under `rainbow`.
 * The display pass reads the surface too: on a light one the dye is laid as
 * ink, its colour at full saturation under a coverage that rises with its
 * density, so it reads as ink on white and not as a glow; on a dark one the
 * coverage rises faster, so a thin strand still shows. Under
 * `prefers-reduced-motion: reduce` nothing is drawn; under `forced-colors:
 * active` nothing is; on the server the empty canvas is rendered, absolutely
 * positioned, so the browser's first draw shifts no layout. A lost context
 * is let go and rebuilt when it comes back. Decorative: `aria-hidden`, no
 * pointer events. Styles: `@use 'ngwr/animations/fluid-cursor'`, which also
 * lists the hooks.
 */
@Component({
  selector: 'wr-fluid-cursor',
  templateUrl: './fluid-cursor.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-fluid-cursor', 'aria-hidden': 'true' },
})
export class WrFluidCursor {
  /** How much dye a move lays, a multiplier. @default 1 */
  readonly intensity = input(1, { transform: wrNumAttr(1) });
  /** The radius of a splat, in CSS px: how wide the ink the pointer lays is. @default 24 */
  readonly size = input(24, { transform: wrNumAttr(24) });
  /** How much of the pointer's speed the fluid takes, a multiplier. @default 1 */
  readonly force = input(1, { transform: wrNumAttr(1) });
  /** How strongly the eddies are fed back, a multiplier: more curls the trail tighter, none lets it smooth out. @default 1 */
  readonly swirl = input(1, { transform: wrNumAttr(1) });
  /** How long the dye lasts, in seconds, from a fresh splat to gone. @default 3 */
  readonly trail = input(3, { transform: wrNumAttr(3) });
  /** How long the motion the pointer gave lasts, in seconds. @default 6 */
  readonly momentum = input(6, { transform: wrNumAttr(6) });
  /** Whether the dye is shaded by its own relief, a slight lighting from the top left. @default true */
  readonly shading = input(true, { transform: booleanAttribute });
  /** Whether a stroke cycles the hue circle instead of the theme's palette. @default false */
  readonly rainbow = input(false, { transform: booleanAttribute });
  /** Whether a click or a tap splashes the ink outward from the point. @default true */
  readonly clickSplash = input(true, { transform: booleanAttribute });
  /** How finely the fluid is simulated: the grids and the pressure solve. @default 'medium' */
  readonly quality = input<WrFluidCursorQuality>('medium');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private gl: FluidGLContext | null = null;
  private sim: FluidSim | null = null;
  /** Set once the browser was asked for a context, so a refusal is not asked again. */
  private contextTried = false;

  /** The host's CSS size, zero until the first layout. */
  private width = 0;
  private height = 0;
  private simWidth = 1;
  private ink = false;
  private readonly palette: FluidColor[] = [];
  private readonly color = new Float32Array(3);
  private readonly velocity = new Float32Array(2);
  private readonly rays = new Float32Array(SPLASH_RAYS * 2);
  private phase = 0;

  /** The scene's clock, in ms: moves only while a frame runs, so a hidden tab holds the ink. */
  private time = 0;
  /** When, on that clock, the last input's dye is gone. */
  private restAt = 0;
  private running = false;
  private rafId: number | null = null;
  private lastFrame = 0;
  private resizeRafId: number | null = null;
  private pendingWidth = 0;
  private pendingHeight = 0;
  private inView = false;
  private mounted = false;

  /** Where and when the pointer last was over the parent, in CSS px; NaN between strokes. */
  private lastX = NaN;
  private lastY = NaN;
  private lastTime = 0;

  private resizeObserver: ResizeObserver | null = null;
  private viewObserver: IntersectionObserver | null = null;
  private pointerTarget: HTMLElement | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/fluid-cursor');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      this.platform.pageVisible();
      this.platform.prefersReducedMotion();
      untracked(() => this.sync());
    });
    effect(() => {
      this.quality();
      untracked(() => this.relayout());
    });
    wrWatchColorScheme(() => this.resolveColors());

    afterNextRender(() => this.mount());
    inject(DestroyRef).onDestroy(() => this.unmount());
  }

  // Lifecycle

  private mount(): void {
    // Nothing drawn under forced colours: the stylesheet hides the host too.
    if (this.doc.defaultView?.matchMedia?.('(forced-colors: active)').matches) return;
    const host = this.host.nativeElement;
    this.mounted = true;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const rect = entries[entries.length - 1]?.contentRect;
        this.scheduleResize(rect?.width ?? host.clientWidth, rect?.height ?? host.clientHeight);
      });
      this.resizeObserver.observe(host);
    } else {
      this.layout(host.clientWidth, host.clientHeight);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.viewObserver = new IntersectionObserver(entries => {
        this.inView = entries[entries.length - 1]?.isIntersecting ?? false;
        this.sync();
      });
      this.viewObserver.observe(host);
    } else {
      this.inView = true;
    }

    const canvas = this.canvasRef().nativeElement;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    const target = host.parentElement;
    this.pointerTarget = target;
    target?.addEventListener('pointermove', this.onPointerMove, { passive: true });
    target?.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    target?.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
  }

  private unmount(): void {
    this.running = false;
    this.stopLoop();
    if (this.resizeRafId !== null) cancelAnimationFrame(this.resizeRafId);
    this.resizeRafId = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.viewObserver?.disconnect();
    this.viewObserver = null;
    this.pointerTarget?.removeEventListener('pointermove', this.onPointerMove);
    this.pointerTarget?.removeEventListener('pointerdown', this.onPointerDown);
    this.pointerTarget?.removeEventListener('pointerleave', this.onPointerLeave);
    this.pointerTarget = null;
    if (this.mounted) {
      const canvas = this.canvasRef().nativeElement;
      canvas.removeEventListener('webglcontextlost', this.onContextLost);
      canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    }
    this.sim?.destroy();
    this.sim = null;
    // The context itself is let go now rather than when the canvas is collected.
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.mounted = false;
  }

  // Context

  /** The context and the solver, made at the first input; `null` under reduced motion and where the browser has neither WebGL. */
  private ensure(): FluidSim | null {
    if (this.platform.prefersReducedMotion()) return null;
    if (this.sim) return this.sim;
    if (this.contextTried || !this.mounted) return null;
    this.contextTried = true;
    const canvas = this.canvasRef().nativeElement;
    const gl =
      canvas.getContext('webgl2', FLUID_CONTEXT_ATTRIBUTES) ?? canvas.getContext('webgl', FLUID_CONTEXT_ATTRIBUTES);
    if (!gl) return null;
    this.gl = gl;
    this.sim = createFluidSim(gl);
    if (!this.sim) return null;
    this.resolveColors();
    this.relayout();
    return this.sim;
  }

  private readonly onContextLost = (event: Event): void => {
    // Not prevented, the browser never restores it.
    event.preventDefault();
    this.sim = null;
    this.running = false;
    this.stopLoop();
  };

  private readonly onContextRestored = (): void => {
    if (!this.gl) return;
    this.sim = createFluidSim(this.gl);
    this.relayout();
    this.sync();
  };

  // Layout

  private scheduleResize(width: number, height: number): void {
    this.pendingWidth = width;
    this.pendingHeight = height;
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.layout(this.pendingWidth, this.pendingHeight);
    });
  }

  private layout(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.relayout();
  }

  /** Sizes the canvas and the grids for the current size and quality; the fields start over. */
  private relayout(): void {
    if (!this.sim || this.width === 0) return;
    const canvas = this.canvasRef().nativeElement;
    const dpr = canvasBackdropRatio(this.width, this.height, this.doc.defaultView?.devicePixelRatio ?? 1);
    canvas.width = Math.round(this.width * dpr);
    canvas.height = Math.round(this.height * dpr);
    const quality = QUALITY[untracked(this.quality)];
    const sim = fluidGrid(this.width, this.height, quality.sim, MAX_PIXELS);
    const dye = fluidGrid(this.width, this.height, Math.min(quality.dye, canvas.width, canvas.height), MAX_PIXELS);
    this.simWidth = sim.width;
    this.sim.resize(sim.width, sim.height, dye.width, dye.height);
    this.sim.size(this.width, this.height);
    this.sim.render(canvas.width, canvas.height, { ink: this.ink, shading: 0 });
    this.sync();
  }

  // Colours

  private resolveColors(): void {
    if (!this.sim) return;
    const canvas = this.canvasRef().nativeElement;
    this.palette.length = 0;
    for (const [hook, fallback] of PALETTE_HOOKS) this.palette.push(wrResolveCssColorChannels(canvas, hook, fallback));
    this.ink = fluidInk(wrResolveCssColorChannels(canvas, 'var(--wr-color-surface)', '#ffffff'));
  }

  /** The stroke's colour at its phase, into `color`. */
  private tint(): void {
    if (untracked(this.rainbow)) fluidRainbowColor(this.phase, this.color);
    else fluidPaletteColor(this.phase, this.palette, this.color);
  }

  // Pointer

  private readonly onPointerMove = (event: PointerEvent): void => {
    const sim = this.ensure();
    if (!sim || this.width === 0) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = event.timeStamp;
    if (!Number.isNaN(this.lastX)) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        const radius = untracked(this.size);
        const force = untracked(this.force) * FORCE_BASE * (this.simWidth / this.width);
        const n = fluidSplats(distance, radius);
        const dye = untracked(this.intensity) * DYE_BASE * fluidDyeScale(distance, n, radius);
        fluidVelocity(dx, dy, now - this.lastTime, this.velocity);
        const vx = this.velocity[0] * force;
        const vy = -this.velocity[1] * force;
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          this.phase += distance / n / CYCLE_PX;
          this.tint();
          sim.splat(
            (this.lastX + dx * t) / this.width,
            1 - (this.lastY + dy * t) / this.height,
            vx,
            vy,
            this.color[0] * dye,
            this.color[1] * dye,
            this.color[2] * dye,
            radius
          );
        }
        this.touch();
      }
    }
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const sim = this.ensure();
    if (!sim || this.width === 0) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = event.timeStamp;
    if (!untracked(this.clickSplash) || event.button !== 0) return;

    const radius = untracked(this.size);
    const force = untracked(this.force);
    const dye = untracked(this.intensity) * DYE_BASE * SPLASH_DYE;
    const scale = this.simWidth / this.width;
    this.phase += SPLASH_PHASE;
    this.tint();
    const n = fluidSplash(force, this.phase * SPLASH_RAYS, this.rays);
    for (let i = 0; i < n; i++) {
      const rx = this.rays[i * 2];
      const ry = this.rays[i * 2 + 1];
      // The arm lies along the ray's own direction, before the spin is added.
      const angle = Math.atan2(ry, rx) - Math.atan(SPLASH_SPIN);
      for (let k = 1; k <= SPLASH_STEPS; k++) {
        const px = x + Math.cos(angle) * radius * SPLASH_OFFSET * k;
        const py = y + Math.sin(angle) * radius * SPLASH_OFFSET * k;
        const taper = 1 - (k - 1) / (SPLASH_STEPS + 1);
        sim.splat(
          px / this.width,
          1 - py / this.height,
          rx * scale,
          -ry * scale,
          this.color[0] * dye,
          this.color[1] * dye,
          this.color[2] * dye,
          radius * SPLASH_RAY * taper
        );
      }
    }
    this.touch();
  };

  private readonly onPointerLeave = (): void => {
    this.lastX = NaN;
    this.lastY = NaN;
  };

  /** An input landed: the dye is live for `trail` from now. */
  private touch(): void {
    this.restAt = this.time + fluidRestMs(untracked(this.trail));
    this.sync();
  }

  // Loop

  private active(): boolean {
    return this.sim !== null && this.time < this.restAt;
  }

  private sync(): void {
    const reduced = this.platform.prefersReducedMotion();
    const allowed = this.mounted && this.width > 0 && this.inView && this.platform.pageVisible() && !reduced;
    if (reduced && this.active()) this.rest();
    const run = allowed && this.active();
    if (run === this.running) return;
    this.running = run;
    if (run) {
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
      return;
    }
    this.stopLoop();
  }

  /** The fields and the canvas emptied, and nothing left to move. */
  private rest(): void {
    this.restAt = this.time;
    this.sim?.clear();
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly frame = (now: number): void => {
    this.rafId = null;
    if (!this.running) return;
    const sim = this.sim;
    if (!sim) {
      this.running = false;
      return;
    }
    const dt = Math.min(Math.max(now - this.lastFrame, 0), MAX_FRAME_MS);
    this.lastFrame = now;
    this.time += dt;
    const quality = QUALITY[untracked(this.quality)];
    sim.step(dt / 1000, {
      dyeDecay: fluidDecay(untracked(this.trail)),
      velocityDecay: fluidDecay(untracked(this.momentum)),
      swirl: untracked(this.swirl) * SWIRL_BASE,
      iterations: quality.iterations,
    });
    const canvas = this.canvasRef().nativeElement;
    sim.render(canvas.width, canvas.height, { ink: this.ink, shading: untracked(this.shading) ? 1 : 0 });
    if (!this.active()) {
      // The dye is under the floor: the fields are emptied, so nothing faint lingers, and the loop ends.
      this.rest();
      this.running = false;
      return;
    }
    this.rafId = requestAnimationFrame(this.frame);
  };
}
