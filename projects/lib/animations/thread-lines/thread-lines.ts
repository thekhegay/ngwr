/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';

import { FRAME_FLOOR_SLACK, MAX_FRAME_MS } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrResolveCssColorChannels, wrWatchColorScheme, wrCheckStyles } from 'ngwr/utils';

import {
  THREAD_CONTEXT_ATTRIBUTES,
  type ThreadFrame,
  type ThreadGLContext,
  type ThreadRenderer,
  createThreadRenderer,
} from './thread-gl';
import {
  FOLLOW_RATE,
  FRAY_POWER,
  SPRING_DAMPING,
  SPRING_RATE,
  type ThreadSpring,
  threadCount,
  threadFrameMs,
  threadInk,
  threadLength,
  threadRatio,
  threadSpringStep,
  threadSpringStill,
  threadStrandTexture,
  threadStrands,
  threadWidths,
} from './thread-model';

/** Where the bundle's centre line sits at the gathered end and at the far one, as a share of the height from the middle. */
const CENTRE_START = -0.1;
const CENTRE_END = 0.02;
/** How far a strand's own path bends at the far end under a unit `fray`, as a share of the height. */
const PATH = 0.075;
/** The travelling wave: the main harmonic's wavelengths per ribbon length and its period in seconds under a unit `speed`; the second is shorter and faster. */
const WAVE_CYCLES = 1.4;
const WAVE_PERIOD = 9;
const WAVE_CYCLES_2 = 3.1;
const WAVE_PERIOD_2 = 5.6;
/** The parting's reach, in CSS px, and how far it pushes at its heart under a unit `parting`, as a share of the reach. */
const PART_RADIUS = 110;
const PART_PUSH = 0.45;
/** How much of its colour a strand's core lays and how much glow rings it, on a light surface and on a dark one. */
const INK_LIGHT: readonly [number, number] = [0.6, 0.03];
const INK_DARK: readonly [number, number] = [0.75, 0.07];

/**
 * A wide ribbon of fine threads behind a section's content, like silk: dozens
 * of hair-thin strands flowing across the region at a slight angle, close
 * together near one end, almost a single cord, and parting as they go toward
 * the other, each taking a path of its own. The whole bundle rides slow waves
 * that travel along it, neighbours moving almost together but not quite, so
 * the ribbon shimmers; the strands are brightest in the middle of the bundle
 * and fade toward its edges and at both ends, and the outer ones blend toward
 * an accent. The pointer parts the threads around itself, like fingers drawn
 * through silk, and they close again behind it with a slightly elastic
 * return. The drawing is one WebGL pass in `thread-gl.ts`; the pure pieces
 * (the strands, the fray, the parting and its spring, the canvas size and the
 * frame cap) are `thread-model.ts`.
 *
 * Fills its positioned parent, which isolates itself, so the host's negative
 * z-index lands under the content and over the page background. The parent
 * takes the pointer, passively: the host and its canvas never do, and a
 * finger is ignored, so a scroll over the section is never fought. The
 * context is made when the host is first on screen and sized, not at mount,
 * so a region nobody scrolls to costs nothing; the loop runs while the host
 * is on screen and the document is visible, at thirty frames a second while
 * only the waves move and at the screen's rate while the parting is live.
 * The canvas renders at the device ratio under the model's pixel budget.
 *
 * Colours come from the `--wr-thread-lines-color` and `-accent` hooks through
 * `wrResolveCssColorChannels`, re-read when the scheme changes; the surface is
 * read too, so on a light one the strands are laid as ink with next to no
 * glow and on a dark one they are lit, with a soft glow. Under
 * `prefers-reduced-motion: reduce` one still frame is drawn; under
 * `forced-colors: active` nothing is; without WebGL nothing is; on the
 * server the empty canvas is rendered, absolutely positioned, so the
 * browser's first draw shifts no layout. A lost context is let go and
 * rebuilt when it comes back. Under RTL the ribbon is mirrored, so it
 * gathers at the inline start. Decorative: `aria-hidden`, no pointer events.
 * Styles: `@use 'ngwr/animations/thread-lines'`.
 */
@Component({
  selector: 'wr-thread-lines',
  templateUrl: './thread-lines.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-thread-lines', 'aria-hidden': 'true' },
})
export class WrThreadLines {
  /** How many strands the bundle has, 128 at most. @default 72 */
  readonly count = input(72, { transform: wrNumAttr(72) });
  /** How thick a strand is, in device px. @default 1 */
  readonly thickness = input(1, { transform: wrNumAttr(1) });
  /** How high the travelling wave lifts the bundle, in CSS px. @default 16 */
  readonly amplitude = input(16, { transform: wrNumAttr(16) });
  /** How fast the wave travels, a multiplier: one is a wave every nine seconds. @default 1 */
  readonly speed = input(1, { transform: wrNumAttr(1) });
  /** How far the strands part by the far end, a multiplier: none keeps them a cord the whole way. @default 1 */
  readonly fray = input(1, { transform: wrNumAttr(1) });
  /** The ribbon's tilt, in degrees: positive falls toward the far end, negative rises. @default -6 */
  readonly angle = input(-6, { transform: wrNumAttr(-6) });
  /** How strongly the pointer parts the strands, a multiplier: none turns the parting off. @default 1 */
  readonly parting = input(1, { transform: wrNumAttr(1) });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  /** The ribbon gathers at the inline start: under RTL its axis is mirrored. */
  private readonly mirrored = computed(() => this.dir?.valueSignal() === 'rtl');

  private gl: ThreadGLContext | null = null;
  private renderer: ThreadRenderer | null = null;
  /** Set once the browser was asked for a context, so a refusal is not asked again. */
  private contextTried = false;
  /** How many strands the renderer holds; -1 before the first upload. */
  private uploaded = -1;

  /** The host's CSS size, zero until the first layout. */
  private width = 0;
  private height = 0;
  private readonly frame: ThreadFrame = {
    width: 0,
    height: 0,
    scale: 1,
    regionWidth: 0,
    regionHeight: 0,
    cos: 1,
    sin: 0,
    length: 1,
    mirror: 1,
    gather: 0,
    spread: 0,
    power: FRAY_POWER,
    centreStart: 0,
    centreEnd: 0,
    path: 0,
    amplitude: 0,
    wave1: 0,
    wave2: 0,
    phase1: 0,
    phase2: 0,
    thickness: 0.5,
    count: 1,
    color: new Float32Array([0.42, 0.45, 0.5]),
    accent: new Float32Array([0.22, 0.41, 0.89]),
    core: INK_LIGHT[0],
    glow: INK_LIGHT[1],
    pointerAlong: 0,
    pointerAcross: 0,
    push: 0,
    radius: PART_RADIUS,
  };

  /** The scene's clock, in seconds: moves only while a frame runs, so a hidden tab holds the pose. */
  private time = 0;
  /** Where the pointer is over the parent, in CSS px from the host's top left; NaN when it is not. */
  private pointerX = NaN;
  private pointerY = NaN;
  /** The parting: how open it is, and where its centre is, each eased after the pointer. */
  private readonly open: ThreadSpring = { value: 0, speed: 0 };
  private readonly centreX: ThreadSpring = { value: 0, speed: 0 };
  private readonly centreY: ThreadSpring = { value: 0, speed: 0 };

  private running = false;
  private rafId: number | null = null;
  private lastFrame = 0;
  private resizeRafId: number | null = null;
  private pendingWidth = 0;
  private pendingHeight = 0;
  private inView = false;
  private mounted = false;

  private resizeObserver: ResizeObserver | null = null;
  private viewObserver: IntersectionObserver | null = null;
  private pointerTarget: HTMLElement | null = null;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/thread-lines');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      this.platform.pageVisible();
      this.platform.prefersReducedMotion();
      this.mirrored();
      untracked(() => this.sync());
    });
    effect(() => {
      this.count();
      this.fray();
      this.angle();
      untracked(() => this.still());
    });
    wrWatchColorScheme(() => {
      this.resolveColors();
      this.still();
    });

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
      this.sync();
    }

    const canvas = this.canvasRef().nativeElement;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    const target = host.parentElement;
    this.pointerTarget = target;
    target?.addEventListener('pointermove', this.onPointerMove, { passive: true });
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
    this.pointerTarget?.removeEventListener('pointerleave', this.onPointerLeave);
    this.pointerTarget = null;
    if (this.mounted) {
      const canvas = this.canvasRef().nativeElement;
      canvas.removeEventListener('webglcontextlost', this.onContextLost);
      canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    }
    this.renderer?.destroy();
    this.renderer = null;
    // The context itself is let go now rather than when the canvas is collected.
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.mounted = false;
  }

  // Context

  /** The context and the renderer, made at the first chance to draw; `null` where the browser has no WebGL. */
  private ensure(): ThreadRenderer | null {
    if (this.renderer) return this.renderer;
    if (this.contextTried || !this.mounted) return null;
    this.contextTried = true;
    const canvas = this.canvasRef().nativeElement;
    const gl =
      canvas.getContext('webgl2', THREAD_CONTEXT_ATTRIBUTES) ?? canvas.getContext('webgl', THREAD_CONTEXT_ATTRIBUTES);
    if (!gl) return null;
    this.gl = gl;
    this.renderer = createThreadRenderer(gl);
    if (!this.renderer) return null;
    this.uploaded = -1;
    this.resolveColors();
    return this.renderer;
  }

  private readonly onContextLost = (event: Event): void => {
    // Not prevented, the browser never restores it.
    event.preventDefault();
    this.renderer = null;
    this.running = false;
    this.stopLoop();
  };

  private readonly onContextRestored = (): void => {
    if (!this.gl) return;
    this.renderer = createThreadRenderer(this.gl);
    this.uploaded = -1;
    this.still();
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
    this.still();
    this.sync();
  }

  /** Sizes the canvas to the host under the pixel budget. */
  private size(): void {
    const canvas = this.canvasRef().nativeElement;
    const ratio = threadRatio(this.width, this.height, this.doc.defaultView?.devicePixelRatio ?? 1);
    const width = Math.round(this.width * ratio);
    const height = Math.round(this.height * ratio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    this.frame.width = width;
    this.frame.height = height;
    this.frame.scale = 1 / ratio;
  }

  // Colours

  private resolveColors(): void {
    if (!this.renderer) return;
    const canvas = this.canvasRef().nativeElement;
    this.frame.color.set(wrResolveCssColorChannels(canvas, 'var(--wr-thread-lines-color)', '#6b7280'));
    this.frame.accent.set(wrResolveCssColorChannels(canvas, 'var(--wr-thread-lines-accent)', '#3969e2'));
    const light = threadInk(wrResolveCssColorChannels(canvas, 'var(--wr-color-surface)', '#ffffff'));
    const ink = light ? INK_LIGHT : INK_DARK;
    this.frame.core = ink[0];
    this.frame.glow = ink[1];
  }

  // Pointer

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A finger that moves is scrolling: the ribbon must never fight it.
    if (event.pointerType === 'touch' || this.width === 0) return;
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
  };

  private readonly onPointerLeave = (): void => {
    this.pointerX = NaN;
    this.pointerY = NaN;
  };

  // Loop

  /** Whether the strands are parted, still closing or about to part: the frame cap is lifted while they are. */
  private parted(): boolean {
    if (!threadSpringStill(this.open)) return true;
    return !Number.isNaN(this.pointerX) && untracked(this.parting) > 0;
  }

  private sync(): void {
    const reduced = this.platform.prefersReducedMotion();
    const allowed = this.mounted && this.width > 0 && this.inView && this.platform.pageVisible();
    const run = allowed && !reduced;
    if (run !== this.running) {
      this.running = run;
      if (run) {
        this.lastFrame = performance.now();
        this.rafId = requestAnimationFrame(this.frameLoop);
        return;
      }
      this.stopLoop();
    }
    // Reduced motion: one still frame, with the strands closed, however the pointer sits.
    if (allowed && reduced) {
      this.rest();
      this.still();
    }
  }

  /** The parting closed at once: the still frame has no gap in it. */
  private rest(): void {
    this.open.value = 0;
    this.open.speed = 0;
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  /** One frame drawn outside the loop: the reduced-motion still, and a resize or a retheme while the loop is off. */
  private still(): void {
    if (this.running || !this.mounted || this.width === 0 || !this.inView) return;
    this.draw();
  }

  private readonly frameLoop = (now: number): void => {
    this.rafId = null;
    if (!this.running) return;
    const floor = threadFrameMs(this.parted());
    if (floor > 0 && now - this.lastFrame + FRAME_FLOOR_SLACK < floor) {
      this.rafId = requestAnimationFrame(this.frameLoop);
      return;
    }
    const dt = Math.min(Math.max(now - this.lastFrame, 0), MAX_FRAME_MS) / 1000;
    this.lastFrame = now;
    this.advance(dt);
    this.draw();
    if (this.running) this.rafId = requestAnimationFrame(this.frameLoop);
  };

  /** The clock moves on and the parting eases after the pointer. */
  private advance(dt: number): void {
    this.time += dt * untracked(this.speed);
    const pointing = !Number.isNaN(this.pointerX) && untracked(this.parting) > 0;
    if (pointing) {
      if (threadSpringStill(this.open)) {
        // The first touch sets the centre; after that it follows.
        this.centreX.value = this.pointerX;
        this.centreY.value = this.pointerY;
        this.centreX.speed = this.centreY.speed = 0;
      } else {
        threadSpringStep(this.centreX, this.pointerX, dt, FOLLOW_RATE, 1);
        threadSpringStep(this.centreY, this.pointerY, dt, FOLLOW_RATE, 1);
      }
    }
    threadSpringStep(this.open, pointing ? 1 : 0, dt, SPRING_RATE, SPRING_DAMPING);
  }

  /** The frame's numbers from the inputs and the state, and the pass. */
  private draw(): void {
    const renderer = this.ensure();
    if (!renderer || this.width === 0) return;
    const frame = this.frame;
    this.size();

    const count = threadCount(untracked(this.count));
    if (count !== this.uploaded) {
      renderer.strands(threadStrandTexture(threadStrands(count)), count);
      this.uploaded = count;
    }
    const width = this.width;
    const height = this.height;
    const angle = (untracked(this.angle) * Math.PI) / 180;
    const fray = Math.max(0, untracked(this.fray));
    const widths = threadWidths(height, fray);
    const mirror = this.mirrored() ? -1 : 1;

    frame.regionWidth = width;
    frame.regionHeight = height;
    frame.cos = Math.cos(angle);
    frame.sin = Math.sin(angle);
    frame.length = threadLength(width, height, angle);
    frame.mirror = mirror;
    frame.gather = widths.gather;
    frame.spread = widths.spread;
    frame.centreStart = CENTRE_START * height;
    frame.centreEnd = CENTRE_END * height;
    frame.path = PATH * fray * height;
    frame.amplitude = untracked(this.amplitude);
    frame.wave1 = WAVE_CYCLES * Math.PI * 2;
    frame.wave2 = WAVE_CYCLES_2 * Math.PI * 2;
    frame.phase1 = ((this.time / WAVE_PERIOD) % 1) * Math.PI * 2;
    frame.phase2 = ((this.time / WAVE_PERIOD_2) % 1) * Math.PI * 2;
    frame.thickness = Math.max(0.1, untracked(this.thickness)) / 2;
    frame.count = count;

    // The parting's centre, from the host's top left into the ribbon's frame.
    const dx = this.centreX.value - width / 2;
    const dy = this.centreY.value - height / 2;
    frame.pointerAlong = (dx * frame.cos + dy * frame.sin) * mirror;
    frame.pointerAcross = -dx * frame.sin + dy * frame.cos;
    frame.push = this.open.value * untracked(this.parting) * PART_PUSH * PART_RADIUS;
    frame.radius = PART_RADIUS;

    renderer.render(frame);
  }
}

export { CENTRE_END, CENTRE_START, INK_DARK, INK_LIGHT, PART_PUSH, PART_RADIUS, PATH, WAVE_PERIOD };
