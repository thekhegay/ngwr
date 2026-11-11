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
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { wrNumAttr, wrResolveCssColorChannels, wrWatchColorScheme, wrCheckStyles } from 'ngwr/utils';

import { FRAME_FLOOR_SLACK, MAX_FRAME_MS } from '../internal';

import {
  FLOW_CONTEXT_ATTRIBUTES,
  type FlowFrame,
  type FlowGLContext,
  type FlowRenderer,
  createFlowRenderer,
} from './flow-gl';
import {
  FlowRipples,
  FlowWake,
  INTRO_SOFT,
  INTRO_STAGGER,
  RIPPLE_LIFE,
  RIPPLE_SPEED,
  RIPPLE_WIDTH,
  SPRING_RATE,
  flowDamping,
  flowFade,
  flowFrameMs,
  flowInk,
  flowIntroHead,
  flowPush,
  flowRatio,
  flowSpacing,
} from './flow-model';
import type { WrFlowLinesOrientation } from './types';

/** The drift's frequency along a line, in noise cells per CSS px: a wave is about two cells long. */
const NOISE_FREQ = 1 / 220;
/** How much slower the drift varies across the lines than along them: neighbours move together. */
const NOISE_ACROSS = 0.7;
/** How fast the drift moves, in noise cells per second under a unit `speed`. */
const NOISE_DRIFT = 0.11;
/** The dashes: one every this many CSS px, the dash's share of it, and how fast they stream in px/s under a unit `speed`. */
const DASH_PERIOD = 56;
const DASH_DUTY = 0.55;
const DASH_SPEED = 40;
/** How much of its colour a line lays, on a light surface and on a dark one. */
const INK_LIGHT = 0.2;
const INK_DARK = 0.26;

/**
 * A dense field of thin parallel lines behind a section's content that flows
 * like silk: a slow, smooth noise field bends every line in long gentle
 * waves, neighbours moving together, so the field reads like a surface or a
 * contour map in a breeze. The pointer is a soft weight on it: lines within
 * reach are pushed away with a smooth falloff and take on the accent where
 * they are displaced the most, and when it moves on they spring back with a
 * small elastic bounce, so a moving pointer leaves a short living wake. A
 * click sends a ring out across the field. The lines can be dashed, with the
 * dashes streaming along them, and can draw in from the inline start on
 * first view. The drawing is one WebGL pass in `flow-gl.ts`, a distance
 * field per pixel, so a line is a crisp anti-aliased hairline and a curve is
 * smooth whatever bends it; the pure pieces (the spring, the wake, the
 * ripples, the intro, the canvas size and the frame cap) are
 * `flow-model.ts`.
 *
 * Fills its positioned parent, which isolates itself, so the host's negative
 * z-index lands under the content and over the page background. The parent
 * takes the pointer, passively: the host and its canvas never do, a finger
 * that moves pushes nothing, so a scroll over the section is never fought,
 * and a tap may ripple. The context is made when the host is first on screen
 * and sized, not at mount, so a region nobody scrolls to costs nothing; the
 * loop runs while the host is on screen and the document is visible, at
 * thirty frames a second while only the drift moves and at the screen's rate
 * while a wake, a ripple or the intro is live; with `speed` at none it stops
 * once they settle. The canvas renders at the device ratio under the model's
 * pixel budget.
 *
 * Colours come from the `--wr-flow-lines-color` and `-accent` hooks through
 * `wrResolveCssColorChannels`, re-read when the scheme changes; the surface is
 * read too, so the lines lay a little more light on a dark one than ink on
 * a light one, which is what reads the same. Under `prefers-reduced-motion: reduce` one still frame is
 * drawn, whole and at rest; under `forced-colors: active` nothing is;
 * without WebGL nothing is; on the server the empty canvas is rendered,
 * absolutely positioned, so the browser's first draw shifts no layout. A
 * lost context is let go and rebuilt when it comes back. Decorative:
 * `aria-hidden`, no pointer events. Styles: `@use 'ngwr/animations/flow-lines'`.
 */
@Component({
  selector: 'wr-flow-lines',
  templateUrl: './flow-lines.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-flow-lines', 'aria-hidden': 'true' },
})
export class WrFlowLines {
  /** Between two lines, in CSS px, four at least. @default 10 */
  readonly spacing = input(10, { transform: wrNumAttr(10) });
  /** How thick a line is, in CSS px. @default 1 */
  readonly lineWidth = input(1, { transform: wrNumAttr(1) });
  /** How far the drift bends a line at most, in CSS px. @default 28 */
  readonly amplitude = input(28, { transform: wrNumAttr(28) });
  /** Which way the lines run across the region. @default 'horizontal' */
  readonly orientation = input<WrFlowLinesOrientation>('horizontal');
  /** The lines' tilt from their orientation, in degrees: positive falls toward the inline end. @default 0 */
  readonly twist = input(0, { transform: wrNumAttr(0) });
  /** How fast the drift and the dashes move, a multiplier: none holds the field still between pushes. @default 1 */
  readonly speed = input(1, { transform: wrNumAttr(1) });
  /** How far from the pointer a line is still pushed, in CSS px. @default 160 */
  readonly reach = input(160, { transform: wrNumAttr(160) });
  /** How hard the pointer pushes, a multiplier: one moves a line a seventh of `reach` at most; none turns the push off. @default 1 */
  readonly push = input(1, { transform: wrNumAttr(1) });
  /** How much a released line swings past its place, a multiplier: none settles without a swing. @default 1 */
  readonly bounce = input(1, { transform: wrNumAttr(1) });
  /** Whether a click, or a tap, sends a ring out across the field. @default true */
  readonly ripple = input(true, { transform: booleanAttribute });
  /** Whether the lines draw in from the inline start when first on screen. @default false */
  readonly intro = input(false, { transform: booleanAttribute });
  /** Whether the lines are dashed, with the dashes streaming along them. @default false */
  readonly dashed = input(false, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  /** The intro draws from the inline start and the tilt falls toward the inline end: under RTL both are mirrored. */
  private readonly mirrored = computed(() => this.dir?.valueSignal() === 'rtl');

  private gl: FlowGLContext | null = null;
  private renderer: FlowRenderer | null = null;
  /** Set once the browser was asked for a context, so a refusal is not asked again. */
  private contextTried = false;

  /** The host's CSS size, zero until the first layout. */
  private width = 0;
  private height = 0;
  private readonly wake = new FlowWake();
  private readonly ripples = new FlowRipples();
  private readonly frame: FlowFrame = {
    width: 0,
    height: 0,
    scale: 1,
    regionWidth: 0,
    regionHeight: 0,
    cos: 1,
    sin: 0,
    mirror: 1,
    spacing: 10,
    halfWidth: 0.5,
    ink: INK_LIGHT,
    amplitude: 0,
    frequency: NOISE_FREQ,
    across: NOISE_ACROSS,
    time: 0,
    color: new Float32Array([0.42, 0.45, 0.5]),
    accent: new Float32Array([0.22, 0.41, 0.89]),
    wake: this.wake.data,
    wakeCount: 0,
    wakeBox: this.wake.box,
    reach: 160,
    push: 0,
    ripples: this.ripples.data,
    rippleCount: 0,
    rippleSpeed: RIPPLE_SPEED,
    rippleWidth: RIPPLE_WIDTH,
    rippleLife: RIPPLE_LIFE,
    dashPeriod: DASH_PERIOD,
    dashDuty: DASH_DUTY,
    dashOffset: 0,
    dashed: false,
    introHead: Infinity,
    introStagger: INTRO_STAGGER,
    introSoft: INTRO_SOFT,
    fade: 0,
  };

  /** The scene's clock in seconds, moving only while a frame runs, so a hidden tab holds the pose; and the drift's own, scaled by `speed`. The wake and the ripples keep wall time instead. */
  private time = 0;
  private drift = 0;
  /** When the intro began on the scene's clock; NaN before it has. */
  private introAt = NaN;
  /** Where the pointer is over the parent, in CSS px from the host's top left; NaN when it is not. */
  private pointerX = NaN;
  private pointerY = NaN;

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
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/flow-lines');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      this.platform.pageVisible();
      this.platform.prefersReducedMotion();
      this.speed();
      untracked(() => this.sync());
    });
    effect(() => {
      this.spacing();
      this.lineWidth();
      this.amplitude();
      this.orientation();
      this.twist();
      this.dashed();
      this.mirrored();
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
    this.renderer?.destroy();
    this.renderer = null;
    // The context itself is let go now rather than when the canvas is collected.
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.mounted = false;
  }

  // Context

  /** The context and the renderer, made at the first chance to draw; `null` where the browser has no WebGL. */
  private ensure(): FlowRenderer | null {
    if (this.renderer) return this.renderer;
    if (this.contextTried || !this.mounted) return null;
    this.contextTried = true;
    const canvas = this.canvasRef().nativeElement;
    const gl =
      canvas.getContext('webgl2', FLOW_CONTEXT_ATTRIBUTES) ?? canvas.getContext('webgl', FLOW_CONTEXT_ATTRIBUTES);
    if (!gl) return null;
    this.gl = gl;
    this.renderer = createFlowRenderer(gl);
    if (!this.renderer) return null;
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
    this.renderer = createFlowRenderer(this.gl);
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
    this.sync();
  }

  /** Sizes the canvas to the host under the pixel budget. */
  private size(): void {
    const canvas = this.canvasRef().nativeElement;
    const ratio = flowRatio(this.width, this.height, this.doc.defaultView?.devicePixelRatio ?? 1);
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
    this.frame.color.set(wrResolveCssColorChannels(canvas, 'var(--wr-flow-lines-color)', '#6b7280'));
    this.frame.accent.set(wrResolveCssColorChannels(canvas, 'var(--wr-flow-lines-accent)', '#3969e2'));
    const light = flowInk(wrResolveCssColorChannels(canvas, 'var(--wr-color-surface)', '#ffffff'));
    this.frame.ink = light ? INK_LIGHT : INK_DARK;
  }

  // Pointer

  /** Where `event` is over the host, in CSS px from its top left. */
  private at(event: PointerEvent): [number, number] {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A finger that moves is scrolling: the field must never fight it.
    if (event.pointerType === 'touch' || this.width === 0) return;
    [this.pointerX, this.pointerY] = this.at(event);
    if (untracked(this.push) > 0 && !this.platform.prefersReducedMotion()) {
      this.wake.move(this.pointerX, this.pointerY, performance.now() / 1000);
      this.sync();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.width === 0 || event.button !== 0 || !untracked(this.ripple) || this.platform.prefersReducedMotion()) {
      return;
    }
    const [x, y] = this.at(event);
    this.ripples.add(x, y, performance.now() / 1000);
    this.sync();
  };

  private readonly onPointerLeave = (): void => {
    this.pointerX = NaN;
    this.pointerY = NaN;
    this.wake.release(performance.now() / 1000);
  };

  // Loop

  /** Whether anything beyond the drift moves: a wake, a ripple or the intro. The frame cap is lifted while it does. */
  private live(): boolean {
    return (
      this.wake.segments.length > 0 ||
      this.ripples.ripples.length > 0 ||
      (!Number.isNaN(this.introAt) && Number.isFinite(this.frame.introHead))
    );
  }

  private sync(): void {
    const reduced = this.platform.prefersReducedMotion();
    const allowed = this.mounted && this.width > 0 && this.inView && this.platform.pageVisible();
    const run = allowed && !reduced && (untracked(this.speed) > 0 || this.live());
    if (run !== this.running) {
      this.running = run;
      if (run) {
        this.lastFrame = performance.now();
        this.rafId = requestAnimationFrame(this.frameLoop);
        return;
      }
      this.stopLoop();
    }
    // Allowed but not running: one still frame, under reduced motion whole and at rest, however the pointer sits.
    if (allowed && !run) {
      if (reduced) this.rest();
      this.still();
    }
  }

  /** Everything beyond the drift gone at once: the still frame has no push and no intro in it. */
  private rest(): void {
    this.wake.clear();
    this.ripples.clear();
    this.introAt = NaN;
    this.frame.introHead = Infinity;
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
    const floor = flowFrameMs(this.live());
    if (floor > 0 && now - this.lastFrame + FRAME_FLOOR_SLACK < floor) {
      this.rafId = requestAnimationFrame(this.frameLoop);
      return;
    }
    const dt = Math.min(Math.max(now - this.lastFrame, 0), MAX_FRAME_MS) / 1000;
    this.lastFrame = now;
    // The wall clock the pointer's events were stamped on, not the frame's timestamp: a headless or throttled browser hands out one that runs apart from it.
    this.advance(performance.now() / 1000, dt);
    this.draw();
    // Nothing left to move: the loop rests until a push, a resize or a retheme.
    if (untracked(this.speed) <= 0 && !this.live()) {
      this.running = false;
      return;
    }
    if (this.running) this.rafId = requestAnimationFrame(this.frameLoop);
  };

  /**
   * The clocks move on and the wake's weights follow. The scene's clock takes
   * the frame's clamped `dt`, so a throttled tab resumes where it was; the
   * wake and the ripples read the wall clock, `now`, which the pointer's
   * events are stamped on, so a slow frame rate stretches nothing.
   */
  private advance(now: number, dt: number): void {
    this.time += dt;
    this.drift += dt * Math.max(0, untracked(this.speed));
    const reach = Math.max(1, untracked(this.reach));
    const push = flowPush(untracked(this.push), reach);
    this.wake.update(now, push, reach, SPRING_RATE, flowDamping(untracked(this.bounce)));
    this.ripples.update(now);
  }

  /** The frame's numbers from the inputs and the state, and the pass. */
  private draw(): void {
    const renderer = this.ensure();
    if (!renderer || this.width === 0) return;
    const frame = this.frame;
    this.size();

    const width = this.width;
    const height = this.height;
    const mirror = this.mirrored() ? -1 : 1;
    const turn = untracked(this.orientation) === 'vertical' ? 90 : 0;
    const angle = ((untracked(this.twist) + turn) * Math.PI) / 180;
    frame.regionWidth = width;
    frame.regionHeight = height;
    frame.cos = Math.cos(angle);
    frame.sin = Math.sin(angle) * mirror;
    frame.mirror = mirror;
    frame.spacing = flowSpacing(untracked(this.spacing));
    frame.halfWidth = Math.max(0.1, untracked(this.lineWidth)) / 2 / frame.scale;
    frame.amplitude = untracked(this.amplitude);
    frame.time = this.drift * NOISE_DRIFT;
    frame.wakeCount = this.wake.count;
    frame.reach = Math.max(1, untracked(this.reach));
    frame.push = flowPush(untracked(this.push), frame.reach);
    frame.rippleCount = this.ripples.count;
    frame.dashed = untracked(this.dashed);
    frame.dashOffset = -((this.drift * DASH_SPEED) % DASH_PERIOD);
    frame.fade = flowFade(width, height);

    // The intro begins at the first drawn frame, when the host is sized and on screen.
    if (untracked(this.intro) && Number.isNaN(this.introAt) && !this.platform.prefersReducedMotion()) {
      this.introAt = this.time;
    }
    const length = Math.abs(width * frame.cos) + Math.abs(height * frame.sin);
    frame.introHead = Number.isNaN(this.introAt) ? Infinity : flowIntroHead(this.time - this.introAt, length);

    renderer.render(frame);
  }
}

export { DASH_DUTY, DASH_PERIOD, DASH_SPEED, INK_DARK, INK_LIGHT, NOISE_ACROSS, NOISE_DRIFT, NOISE_FREQ };
