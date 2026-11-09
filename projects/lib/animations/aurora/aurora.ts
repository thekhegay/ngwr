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

import { FRAME_FLOOR_SLACK, MAX_FRAME_MS } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { numAttr, resolveCssColorChannels, watchColorScheme, wrCheckStyles } from 'ngwr/utils';

import {
  AURORA_CONTEXT_ATTRIBUTES,
  type AuroraFrame,
  type AuroraGLContext,
  type AuroraRenderer,
  createAuroraRenderer,
} from './aurora-gl';
import {
  FRAME_MS,
  GLOW_PEAK,
  HUE_DRIFT,
  RAY_DRIFT,
  RAY_FREQ,
  WASH_ALPHA,
  WASH_CHROMA,
  WASH_LIFT,
  WAVE_DRIFT,
  WAVE_FREQ,
  auroraApproach,
  auroraDriftLive,
  auroraEdgeSign,
  auroraFactor,
  auroraFollowTarget,
  auroraHeight,
  auroraIntro,
  auroraLayers,
  auroraLight,
  auroraRatio,
  auroraShare,
  auroraSideFade,
  auroraStop,
  auroraWave,
} from './aurora-model';
import type { WrAuroraEdge } from './types';

/** The stops' fallbacks where a hook resolves to nothing: green, blue, violet. */
const FALLBACK_STOPS = ['#008800', '#3969e2', '#8a4fcf'] as const;

/**
 * A curtain of light hanging from one edge of a section and reaching part of
 * the way in, like an aurora: its free edge a slow broad wave, fine rays
 * shimmering inside it, brightest just short of the free edge and fading
 * toward the one it hangs from, its colour flowing across the width through
 * three stops from the theme. Up to three curtains hang at different depths,
 * the farther one broader, slower and dimmer, so they move in parallax, and
 * the whole drifts gently toward the pointer. On a light surface it is a
 * wash of saturated colour that thins to transparent; on a dark one it is
 * light added to the surface. The drawing is one WebGL pass in
 * `aurora-gl.ts`, drawn at half resolution at most and scaled up by the
 * browser, since nothing in it is sharp; the pure pieces (the profile, the
 * rays, the intro, the drift, the colour stops in OKLCh, the canvas size and
 * the frame cap) are `aurora-model.ts`.
 *
 * Fills its positioned parent, which isolates itself, so the host's negative
 * z-index lands under the content and over the page background. The parent
 * takes the pointer, passively: the host and its canvas never do, and a
 * finger is ignored, so a scroll over the section is never fought. The
 * context is made when the host is first on screen and sized, not at mount,
 * so a region nobody scrolls to costs nothing; the loop runs while the host
 * is on screen and the document is visible, at thirty frames a second, and
 * with `speed` at none only while the intro or the drift still moves.
 *
 * Colours come from the `--wr-aurora-color-1`, `-2` and `-3` hooks through
 * `resolveCssColorChannels`, re-read when the scheme changes; the surface is
 * read too, which decides between the wash and the light. Under
 * `prefers-reduced-motion: reduce` one still frame is drawn, whole and at
 * rest; under `forced-colors: active` nothing is; without WebGL nothing is;
 * on the server the empty canvas is rendered, absolutely positioned, so the
 * browser's first draw shifts no layout. A lost context is let go and rebuilt
 * when it comes back. Decorative: `aria-hidden`, no pointer events. Styles:
 * `@use 'ngwr/animations/aurora'`.
 */
@Component({
  selector: 'wr-aurora',
  templateUrl: './aurora.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-aurora', 'aria-hidden': 'true' },
})
export class WrAurora {
  /** The edge the curtain hangs from. @default 'top' */
  readonly edge = input<WrAuroraEdge>('top');
  /** How far into the region the curtain reaches, as a share of its height, from 0.1 to 1. @default 0.5 */
  readonly height = input(0.5, { transform: numAttr(0.5) });
  /** How far the free edge's wave moves it, a multiplier: one is about a quarter of the curtain's height; none is a straight edge. @default 1 */
  readonly amplitude = input(1, { transform: numAttr(1) });
  /** The size of the shapes, a multiplier: one puts about a wave and a half across the width; more is broader. @default 1 */
  readonly scale = input(1, { transform: numAttr(1) });
  /** How fast the wave, the rays and the hue move, a multiplier: none holds the curtain still. @default 1 */
  readonly speed = input(1, { transform: numAttr(1) });
  /** How strong the light is, a multiplier on the wash's alpha and the glow. @default 1 */
  readonly glow = input(1, { transform: numAttr(1) });
  /** How strongly the rays show, from none to one. @default 0.6 */
  readonly rays = input(0.6, { transform: numAttr(0.6) });
  /** How many curtains hang at different depths, from one to three. @default 2 */
  readonly layers = input(2, { transform: numAttr(2) });
  /** Whether the curtain fades and lengthens in when first on screen. @default false */
  readonly intro = input(false, { transform: booleanAttribute });
  /** Whether the curtain drifts gently toward the pointer over the parent. @default true */
  readonly follow = input(true, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platform = inject(WrPlatform);
  private readonly doc = inject(DOCUMENT);
  private readonly dir = inject(Directionality, { optional: true });
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  /** The stops run from the inline start: under RTL that is the right. */
  private readonly mirrored = computed(() => this.dir?.valueSignal() === 'rtl');

  private gl: AuroraGLContext | null = null;
  private renderer: AuroraRenderer | null = null;
  /** Set once the browser was asked for a context, so a refusal is not asked again. */
  private contextTried = false;

  /** The host's CSS size, zero until the first layout. */
  private regionWidth = 0;
  private regionHeight = 0;
  private readonly frame: AuroraFrame = {
    width: 0,
    height: 0,
    scale: 1,
    regionWidth: 0,
    regionHeight: 0,
    edge: 1,
    mirror: 1,
    reach: 0.5,
    wave: 0,
    waveFrequency: WAVE_FREQ,
    rayFrequency: RAY_FREQ,
    waveTime: 0,
    rayTime: 0,
    hueTime: 0,
    layers: 2,
    rays: 0.6,
    glow: 1,
    light: 1,
    sideFade: 0,
    introFade: 1,
    introReach: 1,
    driftAcross: 0,
    driftStretch: 0,
    stops: [new Float32Array(3), new Float32Array(3), new Float32Array(3)],
    washAlpha: WASH_ALPHA,
    washLift: WASH_LIFT,
    washChroma: WASH_CHROMA,
    glowPeak: GLOW_PEAK,
  };

  /** The scene's clock in seconds, moving only while a frame runs, so a hidden tab holds the pose; and the motion's own, scaled by `speed`. */
  private time = 0;
  private motion = 0;
  /** When the intro began on the scene's clock; NaN before it has. */
  private introAt = NaN;
  /** Where the pointer is over the parent, in CSS px from the host's top left; NaN when it is not. */
  private pointerX = NaN;
  private pointerY = NaN;
  /** The drift toward the pointer, across and the stretch, and where it is heading. */
  private across = 0;
  private stretch = 0;
  private target: [number, number] = [0, 0];

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
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('animations/aurora');
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    effect(() => {
      this.platform.pageVisible();
      this.platform.prefersReducedMotion();
      this.speed();
      untracked(() => this.sync());
    });
    effect(() => {
      this.edge();
      this.height();
      this.amplitude();
      this.scale();
      this.glow();
      this.rays();
      this.layers();
      this.mirrored();
      untracked(() => this.still());
    });
    effect(() => {
      this.follow();
      untracked(() => {
        this.retarget();
        this.sync();
      });
    });
    watchColorScheme(() => {
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
  private ensure(): AuroraRenderer | null {
    if (this.renderer) return this.renderer;
    if (this.contextTried || !this.mounted) return null;
    this.contextTried = true;
    const canvas = this.canvasRef().nativeElement;
    const gl =
      canvas.getContext('webgl2', AURORA_CONTEXT_ATTRIBUTES) ?? canvas.getContext('webgl', AURORA_CONTEXT_ATTRIBUTES);
    if (!gl) return null;
    this.gl = gl;
    this.renderer = createAuroraRenderer(gl);
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
    this.renderer = createAuroraRenderer(this.gl);
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
    this.regionWidth = width;
    this.regionHeight = height;
    this.retarget();
    this.sync();
  }

  /** Sizes the canvas to the host under the render ratio. */
  private size(): void {
    const canvas = this.canvasRef().nativeElement;
    const ratio = auroraRatio(this.regionWidth, this.regionHeight);
    const width = Math.max(1, Math.round(this.regionWidth * ratio));
    const height = Math.max(1, Math.round(this.regionHeight * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    this.frame.width = width;
    this.frame.height = height;
    this.frame.scale = this.regionWidth / width;
  }

  // Colours

  private resolveColors(): void {
    if (!this.renderer) return;
    const canvas = this.canvasRef().nativeElement;
    FALLBACK_STOPS.forEach((fallback, i) => {
      const rgb = resolveCssColorChannels(canvas, `var(--wr-aurora-color-${i + 1})`, fallback);
      this.frame.stops[i].set(auroraStop(rgb));
    });
    const light = auroraLight(resolveCssColorChannels(canvas, 'var(--wr-color-surface)', '#ffffff'));
    this.frame.light = light ? 1 : 0;
  }

  // Pointer

  private readonly onPointerMove = (event: PointerEvent): void => {
    // A finger that moves is scrolling: the curtain must never fight it. Nothing to follow under reduced motion or with `follow` off.
    if (
      event.pointerType === 'touch' ||
      this.regionWidth === 0 ||
      !untracked(this.follow) ||
      this.platform.prefersReducedMotion()
    ) {
      return;
    }
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    this.pointerX = event.clientX - rect.left;
    this.pointerY = event.clientY - rect.top;
    this.retarget();
    this.sync();
  };

  private readonly onPointerLeave = (): void => {
    if (Number.isNaN(this.pointerX)) return;
    this.pointerX = NaN;
    this.pointerY = NaN;
    this.retarget();
    this.sync();
  };

  /** Where the drift is heading, from the pointer; nothing under reduced motion or with `follow` off. */
  private retarget(): void {
    if (this.platform.prefersReducedMotion() || !untracked(this.follow)) {
      this.target = [0, 0];
      return;
    }
    const reach = auroraHeight(untracked(this.height));
    this.target = auroraFollowTarget(this.pointerX, this.pointerY, this.regionWidth, this.regionHeight, reach);
  }

  // Loop

  /** Whether anything moves while `speed` is none: the intro, or the drift toward the pointer. */
  private live(): boolean {
    return (
      (!Number.isNaN(this.introAt) && this.frame.introFade < 1) ||
      auroraDriftLive(this.across, this.stretch, this.target)
    );
  }

  private sync(): void {
    const reduced = this.platform.prefersReducedMotion();
    const allowed = this.mounted && this.regionWidth > 0 && this.inView && this.platform.pageVisible();
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

  /** Everything beyond the curtain gone at once: the still frame has no drift and no intro in it. */
  private rest(): void {
    this.introAt = NaN;
    this.frame.introFade = 1;
    this.frame.introReach = 1;
    this.across = 0;
    this.stretch = 0;
    this.target = [0, 0];
  }

  private stopLoop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  /** One frame drawn outside the loop: the reduced-motion still, and a resize or a retheme while the loop is off. */
  private still(): void {
    if (this.running || !this.mounted || this.regionWidth === 0 || !this.inView) return;
    this.draw();
  }

  private readonly frameLoop = (now: number): void => {
    this.rafId = null;
    if (!this.running) return;
    if (now - this.lastFrame + FRAME_FLOOR_SLACK < FRAME_MS) {
      this.rafId = requestAnimationFrame(this.frameLoop);
      return;
    }
    const dt = Math.min(Math.max(now - this.lastFrame, 0), MAX_FRAME_MS) / 1000;
    this.lastFrame = now;
    this.advance(dt);
    this.draw();
    // Nothing left to move: the loop rests until the pointer, a resize or a retheme.
    if (untracked(this.speed) <= 0 && !this.live()) {
      this.running = false;
      return;
    }
    if (this.running) this.rafId = requestAnimationFrame(this.frameLoop);
  };

  /** The clocks move on and the drift follows its target. */
  private advance(dt: number): void {
    this.time += dt;
    this.motion += dt * Math.max(0, untracked(this.speed));
    this.across = auroraApproach(this.across, this.target[0], dt);
    this.stretch = auroraApproach(this.stretch, this.target[1], dt);
    if (!auroraDriftLive(this.across, this.stretch, this.target)) {
      [this.across, this.stretch] = this.target;
    }
  }

  /** The frame's numbers from the inputs and the state, and the pass. */
  private draw(): void {
    const renderer = this.ensure();
    if (!renderer || this.regionWidth === 0) return;
    const frame = this.frame;
    this.size();

    const scale = auroraFactor(untracked(this.scale), 1, 0.2);
    frame.regionWidth = this.regionWidth;
    frame.regionHeight = this.regionHeight;
    frame.edge = auroraEdgeSign(untracked(this.edge));
    frame.mirror = this.mirrored() ? -1 : 1;
    frame.reach = auroraHeight(untracked(this.height));
    frame.wave = auroraWave(untracked(this.amplitude));
    frame.waveFrequency = WAVE_FREQ / scale;
    frame.rayFrequency = RAY_FREQ / scale;
    frame.waveTime = this.motion * WAVE_DRIFT;
    frame.rayTime = this.motion * RAY_DRIFT;
    frame.hueTime = this.motion * HUE_DRIFT;
    frame.layers = auroraLayers(untracked(this.layers));
    frame.rays = auroraShare(untracked(this.rays), 0.6);
    frame.glow = auroraFactor(untracked(this.glow), 1);
    frame.sideFade = auroraSideFade(this.regionWidth);
    frame.driftAcross = this.across;
    frame.driftStretch = this.stretch;

    // The intro begins at the first drawn frame, when the host is sized and on screen.
    if (untracked(this.intro) && Number.isNaN(this.introAt) && !this.platform.prefersReducedMotion()) {
      this.introAt = this.time;
    }
    [frame.introFade, frame.introReach] = Number.isNaN(this.introAt) ? [1, 1] : auroraIntro(this.time - this.introAt);

    renderer.render(frame);
  }
}

export { FALLBACK_STOPS };
