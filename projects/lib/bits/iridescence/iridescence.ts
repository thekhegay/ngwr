/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * After the Iridescence background idea on reactbits.dev
 * (https://www.reactbits.dev/backgrounds/iridescence). The shader is written for
 * ngwr from scratch: folded silk under a raking light, with the motion, the
 * inputs and the names this library's own.
 *
 * WebGL2 rather than a 2D canvas, deliberately, unlike `wr-threads` and
 * `wr-ripple-grid`. Those draw a few dozen strokes; this works out every pixel,
 * every frame, which is a job for a fragment shader and no job for a 2D context.
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { clamp, numAttr, resolveCssColor, resolveCssColorChannels, watchColorScheme } from 'ngwr/utils';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec3 uPhase;
uniform vec2 uPointer;
uniform vec3 uColor;
out vec4 fragColor;

// Folded silk. A height field of draped folds is lit by a raking key light; hue is a small, luma-free offset
// driven by the fold slope. No finite differences: every stage carries its gradient by the chain rule, so the
// normal costs one evaluation of the cloth instead of three.

// One stage of the warp: moves v by a sine of u, and carries the gradient of v along with it.
void shear(inout float v, inout vec2 gv, float u, vec2 gu, float amp, float k, float phi) {
  v += amp * sin(k * u + phi);
  gv += amp * k * cos(k * u + phi) * gu;
}

// One family of folds added to the height. Negative skew bends the sine so the flank facing the light is short
// and bright and the other long and soft, which is the drape's crest and valley. t tapers the family, gt is its
// gradient.
void pleat(inout float h, inout vec2 g, float u, vec2 gu, float skew, float amp, float t, vec2 gt) {
  float b = u + skew * sin(u);
  float s = sin(b);
  h += amp * t * s;
  g += amp * (t * cos(b) * (1.0 + skew * cos(u)) * gu + s * gt);
}

void main() {
  vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / min(uResolution.x, uResolution.y);
  vec3 ph = uPhase;
  vec2 st = uPointer;

  // Drape axis: q.x runs along the folds, q.y across them. gx and gy are the gradients of q.x and q.y.
  vec2 gx = vec2(0.86, 0.51);
  vec2 gy = vec2(-0.51, 0.86);
  vec2 q = vec2(dot(p, gx), dot(p, gy)) + st * vec2(0.5, 0.8);

  // The warp. The pointer enters each stage differently, so stirring bends the folds instead of sliding the
  // picture. Sums like ph.y - ph.x are still integer multiples, so seam free, and give slow beats: the large
  // displacements run on those so the cloth does not stream.

  // A long sweep: the whole drape bends once across the frame.
  shear(q.y, gy, q.x, gx, 0.42, 0.60, ph.x + 1.6 * st.x);

  // Gather: spacing across the drape swells and tightens along its length, so folds fan out from a pinch.
  float ga = 0.85 * q.x + ph.y - ph.x + 1.2 * st.y;
  float gs = 0.20 * sin(ga);
  gy = (1.0 + gs) * gy + q.y * 0.20 * 0.85 * cos(ga) * gx;
  q.y *= 1.0 + gs;

  // A slip along the folds, so tapers and crossings do not line up across the width.
  shear(q.x, gx, q.y, gy, 0.22, 1.10, -ph.y - 0.8 * st.y);

  // Differential bend: this one reads q.y too, so neighbouring folds bend apart and bunch instead of running
  // as parallel stripes.
  shear(q.y, gy, q.x + 0.8 * q.y, gx + 0.8 * gy, 0.24, 1.15, ph.z - ph.y - 2.0 * st.x);

  // Height, three scales of cloth: a big billow slightly off axis that decides where the light pools, the main
  // folds, and a fine echo. Each main fold is gated across the drape as well as along it, so some stand proud
  // and others die out; that hierarchy is what stops it reading as stripes. The tapers run on the fast phase:
  // folds swell and relax in place more than they travel.
  float h = 0.0;
  vec2 g = vec2(0.0);
  pleat(h, g, 2.3 * q.y - 0.8 * q.x - ph.x + 2.5 * st.y - 1.5 * st.x, 2.3 * gy - 0.8 * gx, -0.2, 0.62, 1.0, vec2(0.0));
  float a = 0.9 * q.x + 1.3 * q.y - ph.z;
  pleat(h, g, 5.0 * q.y + ph.x, 5.0 * gy, -0.36, 0.50, 0.68 + 0.32 * sin(a), 0.32 * cos(a) * (0.9 * gx + 1.3 * gy));
  a = 1.1 * q.y + 0.6 * q.x + 1.9 + ph.z;
  pleat(h, g, 9.5 * q.y + 0.5 * q.x - ph.y, 9.5 * gy + 0.5 * gx, -0.34, 0.20, 0.55 + 0.45 * sin(a),
        0.45 * cos(a) * (1.1 * gy + 0.6 * gx));

  // Raking key light: a flat patch sits mid-tone, the two flanks of a crest go opposite ways. The sheen is a broad
  // lobe that rides the lit flank. A weak bounce from the far side keeps the shaded flank from going to slate.
  const vec3 L = normalize(vec3(-0.50, 0.72, 0.48));
  const vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  const vec3 B = normalize(vec3(0.42, -0.60, 0.68));
  vec3 n = normalize(vec3(-0.27 * g, 1.0));
  float body = pow(0.5 + 0.5 * dot(n, L), 1.35);
  float sheen = pow(max(dot(n, H), 0.0), 26.0);
  float bounce = pow(max(dot(n, B), 0.0), 8.0);

  // Valleys sit in their own shade whatever the light does; this keeps depth in the dark tint.
  float lum = (0.21 + 1.12 * body) * (0.90 + 0.15 * h) + 0.30 * sheen + 0.08 * bounce;

  // Shot silk: the hue turns with the slope seen from the light, pale rose on the lit flank, lilac on the flat,
  // periwinkle in the shade. The drift along the warped cloth wanders further where it is lit, so pale sky and rose
  // zones follow the folds while the shade holds its colour: a warm highlight or a green-heavy shade would grey
  // or flatten under the dark tint.
  float slope = dot(g, vec2(-0.57, 0.82));
  float turn = 0.42 * slope / sqrt(1.0 + 0.18 * slope * slope);
  float drift = sin(1.25 * q.y + 0.55 * q.x + ph.z - ph.y);
  float theta = 1.68 + 0.85 * turn - 0.2 * turn * turn + (0.15 + 0.85 * body) * drift;
  vec3 tone = cos(theta + vec3(0.0, 2.1, 4.2));

  // The offset has its luma removed, so colour draws no shapes of its own and the folds stay pure luminance.
  tone -= dot(tone, vec3(0.2126, 0.7152, 0.0722));

  // Chroma lives in the shade and the mid-tones; the highlight goes nearly white, which is what makes it pearl.
  vec3 col = lum * (1.0 + (0.46 - 0.28 * body - 0.08 * sheen) * tone);

  // Soft shoulder, so a highlight rolls off instead of clipping to a flat white shape.
  col = col / (1.0 + 0.26 * col * col);

  // Interleaved gradient noise, plus or minus half an 8-bit step: a large dark hero spreads a few levels of tint over
  // hundreds of pixels and bands. Static, off the pixel and never a phase, so it cannot shimmer or cost a held frame a redraw.
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;

  fragColor = vec4(col * uColor + dither / 255.0, 1.0);
}
`;

/** What the GPU holds for one context. A lost context takes all of it, so a restored one builds it again. */
interface Gpu {
  readonly program: WebGLProgram;
  readonly buffer: WebGLBuffer | null;
  readonly resolution: WebGLUniformLocation | null;
  readonly phase: WebGLUniformLocation | null;
  readonly pointer: WebGLUniformLocation | null;
  readonly color: WebGLUniformLocation | null;
}

/** The theme's hook. A `color` input left unset, emptied or blank follows it. */
const THEME_COLOR = 'var(--wr-iridescence-color)';

/** What the tint falls back to when no colour resolves: the hook's light value, which leaves the picture as it is. */
const FALLBACK_COLOR = 'rgb(255, 255, 255)';

const TAU = Math.PI * 2;

/**
 * How fast each phase turns at `speed` 1, in radians per second. The three have no
 * common factor, so at `speed` 1 the picture comes back round only after 2000π
 * seconds, an hour and three quarters.
 */
const RATE = [0.187, 0.283, 0.441] as const;

/** A 60 Hz frame, in ms: what the first frame of a run advances by, with no frame before it to measure from. */
const FRAME_MS = 1000 / 60;

/** The longest step one frame may take, in ms, so a tab that wakes after a pause does not jump the folds. */
const MAX_FRAME_MS = 50;

/**
 * How far the pointer stirs the folds at `amplitude` 1, with the pointer on an
 * edge of the box, in the shader's units (the short side of the box is 2).
 */
const REACH = 0.1;

/** The pointer's easing time constant, in ms: it covers 63% of the way to its target in this long, at any frame rate. */
const POINTER_TAU_MS = 250;

/**
 * How close the eased pointer has to be to its target to land on it. A step
 * of an exponential never arrives on its own, and a pointer still arriving would
 * keep a held picture redrawing.
 */
const POINTER_EPSILON = 1e-4;

/**
 * The most bitmap pixels the canvas is backed with. The picture is soft, so it
 * is backed at CSS pixels rather than device pixels to begin with, and a box too
 * large even for that scales both sides down: the fragment shader runs once per
 * bitmap pixel, every frame. `uResolution` follows the bitmap and the shader
 * normalises by its short side, so the picture does not change with it.
 */
const MAX_PIXELS = 2_000_000;

/**
 * `angle` brought into `[0, 2π)`, for a negative one as well. The shader reads a
 * phase only through sin and cos of a whole multiple of it, so the wrap is
 * invisible, and a phase that never grows never loses the precision a clock
 * would lose in a tab left open for a week.
 *
 * The last line is for a tiny negative angle, which rounds up to exactly 2π when
 * it is added back, and for an infinite `speed`, whose remainder is `NaN`: a `NaN`
 * phase would hold every later one.
 */
function wrap(angle: number): number {
  const turn = angle % TAU;
  const wrapped = turn < 0 ? turn + TAU : turn;
  return wrapped < TAU ? wrapped : 0;
}

/**
 * Iridescence background — folded silk under a raking light, its hue turning
 * with the slope of each fold from pale rose through lilac to sky, on a WebGL2
 * canvas. The folds drift and swell on their own, and the pointer stirs them,
 * bending the drape rather than sliding the picture. Fills its nearest positioned
 * ancestor: put it first in a `position: relative` box and give the content after
 * it a position of its own.
 *
 * The pointer is followed on the host's PARENT, with passive listeners, so the
 * silk answers a pointer that is over the content in front of it rather than over
 * the canvas — the host itself takes no pointer events and never steals a click.
 * Placed directly in a shadow root, where it has no parent element, it follows
 * the pointer on the shadow host; with neither it listens nowhere.
 *
 * Decorative only: the canvas is `aria-hidden`, the host has no role and nothing
 * in it takes focus or a click.
 *
 * The frame loop runs only while the host is on screen with a box to draw on and
 * something can move: not at `speed` 0 with no pointer to follow, where one still
 * frame is drawn. At
 * `speed` 0 with the pointer followed, the loop runs and draws only while the
 * pointer is stirring something. Off screen it stops asking for frames and resumes
 * where it left off.
 *
 * Under `prefers-reduced-motion`, read live, one still frame is drawn and nothing
 * follows — no loop, no pointer listeners, the pointer back at rest. It is held at
 * the phases the folds had reached, so switching the preference on does not jump
 * them, and it is drawn again when the colour, the box or the page's colour scheme
 * changes.
 *
 * `[color]` is multiplied over the picture, so white leaves it as it is, and it
 * defaults to the `--wr-iridescence-color` hook: white on a light page, a deep
 * slate blue on a dark one. Any CSS colour works, a `var()` token or a
 * `light-dark()` pair included, resolved through the cascade before it reaches the
 * shader, which reads neither. Pass an opaque colour: the canvas drops alpha and
 * the stand-in keeps it.
 *
 * Measured over 240 phase combinations, with the pointer at rest and at the box's
 * four corners at `amplitude` 1, `--wr-color-on-surface` holds 4.5:1 on the dark
 * default (5.01:1 at the 99th-percentile pixel, 4.89:1 in the worst frame) and not
 * on the light one (3.93:1 at the 1st-percentile pixel, 2.8:1 in the worst frame),
 * so text there needs a scrim or a card.
 *
 * The host's own background is a stand-in: soft diagonal bands in the same palette,
 * which an opaque colour tints the same way. The stand-in shows before hydration on a
 * prerendered page, on a machine with no WebGL2 and after a lost context, so the box
 * is never empty and text placed on it keeps its ground. The canvas fades in over it,
 * because the stand-in is an approximation and not the same picture, so
 * `.wr-iridescence--painted` hands over rather than swaps.
 *
 * Under forced colours the canvas is hidden and its loop stops with it, leaving the
 * box on the palette's own ground, which is what forced text and marks are chosen
 * against.
 *
 * With no WebGL2 context, or a shader the driver refuses, nothing is thrown and
 * the stand-in stays. A context the browser takes away is rebuilt if it offers one
 * back. A destroyed host hands its GPU resources back at once. Browsers keep a small
 * number of live contexts and kill the oldest: Chromium frees the slot at that point,
 * while WebKit frees it only when the context is collected and offers an evicted one
 * no restore, so there a host that is not drawing can stay on the stand-in for good.
 *
 * @example
 * ```html
 * <section style="position: relative; min-height: 24rem; padding: 2rem; overflow: hidden">
 *   <wr-iridescence />
 *   <wr-card style="max-width: 26rem">
 *     <h1>Hero copy on a card above the silk</h1>
 *   </wr-card>
 * </section>
 * ```
 *
 * @see https://ngwr.dev/bits/iridescence
 */
@Component({
  selector: 'wr-iridescence',
  template: '<canvas #canvas class="wr-iridescence__canvas" aria-hidden="true"></canvas>',
  styleUrl: './iridescence.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-iridescence',
    // Feed the CSS stand-in (see `styles/_rules.scss`) so it takes the same tint,
    // and fade the canvas in over it once it has painted.
    '[style.--wr-iridescence-input-color]': 'standInColor()',
    '[class.wr-iridescence--painted]': 'painted()',
  },
})
export class WrIridescence {
  /**
   * Tint multiplied over the picture, any CSS colour — a `var()` token or a
   * `light-dark()` pair included. Pass an opaque colour: the canvas drops alpha and
   * the stand-in keeps it. When unset, empty or blank, `--wr-iridescence-color`
   * decides.
   */
  readonly color = input<string | null>(null);

  /**
   * Speed of the folds; `0` holds them and a negative value reverses them.
   * Changing it never jumps the picture. @default 1
   */
  readonly speed = input(1, { transform: numAttr(1) });

  /**
   * How hard the pointer stirs the folds; `0` leaves the pointer out and a
   * negative value stirs them the other way. @default 1
   */
  readonly amplitude = input(1, { transform: numAttr(1) });

  /** Whether the pointer stirs the folds at all. @default true */
  readonly followPointer = input(true, { transform: coerceBooleanProperty });

  /**
   * A colour the author chose, published so the stand-in takes it too; `null` while
   * the input is unset. On a variable of its own rather than on the hook, which an
   * author sets from outside: a `null` binding wipes a value of its own name from the
   * host's `style` attribute.
   */
  protected readonly standInColor = computed(() => (this.color() ?? '').trim() || null);

  /** The colour the canvas resolves: an input that is unset, empty or blank leaves the hook in charge. */
  private readonly expression = computed(() => (this.color() ?? '').trim() || THEME_COLOR);

  /** Whether the pointer is listened for: never under `prefers-reduced-motion`, read live. */
  private readonly listening = computed(
    () => !this.platform.prefersReducedMotion() && this.followPointer() && this.amplitude() !== 0
  );

  /**
   * Whether anything can change between two frames. While it is `false` there is
   * no loop, only a still frame.
   */
  private readonly moving = computed(
    () => !this.platform.prefersReducedMotion() && (this.speed() !== 0 || this.listening())
  );

  /**
   * Flips once the canvas has drawn, which fades it in over the stand-in. Set
   * inside the draw rather than at the end of the boot, so a canvas with nothing
   * on it is never shown, and back to `false` with a lost context.
   */
  protected readonly painted = signal(false);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private gl: WebGL2RenderingContext | null = null;
  private gpu: Gpu | null = null;
  /** The size the canvas is backed at, in bitmap pixels. */
  private bitmap = { width: 0, height: 0 };
  private rafId = 0;

  /** The three phases, each in `[0, 2π)`. Kept across a parked loop, so the folds resume in place. */
  private readonly phase = [0, 0, 0];

  /**
   * `uPointer` as drawn (`x`, `y`), and where it is heading before `amplitude`
   * (`aimX`, `aimY`). `amplitude` is applied per frame rather than kept in the aim,
   * so changing it eases over like any other move instead of jumping.
   */
  private readonly pointer = { x: 0, y: 0, aimX: 0, aimY: 0 };

  /** The last pointer position in viewport coordinates, while a frame still owes it a look at the host's rect. */
  private lastMove: { x: number; y: number } | null = null;

  /** The last colour string the cascade resolved to, and its channels: the parse is skipped while it holds. */
  private resolved = '';
  private channels: readonly [number, number, number] = [1, 1, 1];

  /**
   * Whether the picture changed since the loop last drew it — the colour, the
   * scheme, a restart. The loop skips the frames that would only repeat the last
   * one, and this is what makes it draw again.
   */
  private dirty = true;

  /** Flips once a program is built, and back when the context goes — everything that draws waits for it. */
  private readonly booted = signal(false);

  /** Whether the host is in the viewport; stays `true` without an observer. */
  private readonly onScreen = signal(true);

  /**
   * Whether the bitmap has an area. The intersection observer calls a zero-area
   * canvas intersecting and sends no entry when it gains a size, so this reads the
   * bitmap instead.
   */
  private readonly hasBox = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // A still frame stays as it was drawn, so with nothing moving a new colour
    // paints it again — and so does the moment motion stops. A running loop is
    // only told the picture changed. `speed`, `amplitude` and `followPointer` are
    // left out: none of them changes a picture at rest. After render rather than an
    // `effect`, which runs before a directive's host binding: a still frame drawn then
    // would miss a hook it changes in the same pass, and nothing draws it again.
    afterRenderEffect(() => {
      if (!this.booted()) return;
      const moving = this.moving();
      this.expression();
      untracked(() => this.repaint(moving));
    });

    // The same for the colour scheme: a frame keeps the colour it was resolved in,
    // and nothing else redraws a still frame or a held loop.
    watchColorScheme(() => {
      if (this.booted()) this.repaint(this.moving());
    });

    // The loop runs only while there is something to see: never while nothing can
    // move (see `moving`), and not while the host is off screen or has no box.
    // Toggling the pointer restarts it with or without the listeners.
    effect(onCleanup => {
      if (!this.booted() || !this.onScreen() || !this.hasBox() || !this.moving()) return;
      const follow = this.listening();
      onCleanup(untracked(() => this.zone.runOutsideAngular(() => this.animate(follow))));
    });
  }

  // Setup

  private boot(): void {
    const canvas = this.canvasRef().nativeElement;
    // Alpha stays on deliberately. The shader writes alpha 1, and in every state
    // with nothing drawn the canvas is transparent, so the stand-in shows through.
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    this.gl = gl;

    // A context can arrive already lost, past the browser's limit on live ones.
    // That is not a broken shader: the restore below builds it. A shader the
    // driver really refused has logged, and nothing will ever draw on this one.
    this.gpu = this.build(gl);
    if (!this.gpu && !gl.isContextLost()) {
      this.release(gl);
      return;
    }

    const onLost = (event: Event): void => {
      // Without this the browser never offers the context back.
      event.preventDefault();
      this.gpu = null;
      this.booted.set(false);
      this.painted.set(false);
    };
    const onRestored = (): void => {
      this.gpu = this.build(gl);
      if (this.gpu) this.booted.set(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    // `clientWidth` and not `getBoundingClientRect()`: the rect is the box after
    // transforms, so a host booted inside a dialog's scale-in would be backed for
    // 96% of its box and stretched by CSS once the animation ended. The observer's
    // first entry follows with the exact, sub-pixel size. Observer entries arrive
    // after the frame's own callbacks and before its paint, so a frame asked for
    // here would leave this one blank, and a resize drag would flicker: it draws
    // at once. Without an observer the box is what it was at boot.
    const hostEl = this.host.nativeElement;
    this.fit(hostEl.clientWidth, hostEl.clientHeight);
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(entries => {
            const rect = entries[entries.length - 1]?.contentRect;
            if (rect && this.fit(rect.width, rect.height)) this.draw();
          });
    ro?.observe(hostEl);

    // Off screen the loop stops asking for frames: a background redrawn out of
    // sight still costs the browser a frame every frame. The canvas rather than the
    // host, which fills the same box, so a canvas hidden under forced colours stops
    // it too. Without an observer (jsdom) the host simply counts as visible. A box flush
    // against a zero-height clip intersects with nothing showing, and only a second
    // threshold reports the clip moving. It sits below any real ratio, or a clip closing
    // on a transition steps from under it to 0 without crossing anything.
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            entries => {
              const { isIntersecting, intersectionRatio } = entries[entries.length - 1];
              this.onScreen.set(isIntersecting && intersectionRatio > 0);
            },
            { threshold: [0, 1e-9] }
          );
    io?.observe(canvas);

    this.destroyRef.onDestroy(() => {
      ro?.disconnect();
      io?.disconnect();
      // These first: losing the context below fires the event they listen for.
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      this.release(gl);
    });
    if (this.gpu) this.booted.set(true);
  }

  /**
   * Compile, link and upload what one context needs, and make it current. Returns
   * `null` when it cannot: on a lost context, where every call answers no and
   * nothing is wrong with the shader, it says nothing.
   */
  private build(gl: WebGL2RenderingContext): Gpu | null {
    const vert = this.compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = this.compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = vert && frag ? gl.createProgram() : null;
    if (vert && frag && program) {
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
    }
    // Only flagged: a shader stays alive as long as a program it is attached to.
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!program) return null;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (!gl.isContextLost()) {
        // eslint-disable-next-line no-console -- GPU shader failures are otherwise invisible
        console.error('wr-iridescence program error:', gl.getProgramInfoLog(program));
      }
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);

    // One oversized triangle covers the viewport, with no index buffer.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    return {
      program,
      buffer,
      resolution: gl.getUniformLocation(program, 'uResolution'),
      phase: gl.getUniformLocation(program, 'uPhase'),
      pointer: gl.getUniformLocation(program, 'uPointer'),
      color: gl.getUniformLocation(program, 'uColor'),
    };
  }

  private compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    if (!gl.isContextLost()) {
      // eslint-disable-next-line no-console -- GPU shader failures are otherwise invisible
      console.error('wr-iridescence shader error:', gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }

  /**
   * Give the GPU resources back at once rather than to the garbage collector:
   * browsers keep a small number of live contexts and kill the oldest, so a
   * navigating single-page app would lose the context of a page still on screen.
   * Chromium frees the slot here too. WebKit holds it until the context is collected,
   * and no API frees it sooner, so a still or parked host can still be evicted there.
   */
  private release(gl: WebGL2RenderingContext): void {
    if (this.gpu) {
      gl.deleteProgram(this.gpu.program);
      gl.deleteBuffer(this.gpu.buffer);
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.gpu = null;
    this.gl = null;
  }

  /**
   * Back the canvas for a `width` × `height` box, in CSS pixels. Returns whether
   * anything changed: writing `canvas.width` clears the bitmap even to the value it
   * already has, so an unchanged size is left alone. Rounded down, because rounding
   * to nearest could carry a box back over the budget it was just scaled under.
   */
  private fit(width: number, height: number): boolean {
    const area = width * height;
    const scale = area > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / area) : 1;
    const bitmapWidth = Math.floor(width * scale);
    const bitmapHeight = Math.floor(height * scale);
    if (bitmapWidth === this.bitmap.width && bitmapHeight === this.bitmap.height) return false;

    this.bitmap = { width: bitmapWidth, height: bitmapHeight };
    this.hasBox.set(bitmapWidth > 0 && bitmapHeight > 0);
    const canvas = this.canvasRef().nativeElement;
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
    return true;
  }

  // Frame loop

  /** Start the folds, and the pointer listeners when asked; returns what stops both. */
  private animate(follow: boolean): () => void {
    const stopPointer = follow ? this.listenToPointer() : null;
    let last = -1;
    // A frame already handed to the browser can still arrive after the stop — a
    // held or polyfilled scheduler does not always honour the cancel — and a late
    // one must not draw, nor schedule a loop nobody will stop again.
    let stopped = false;
    // The canvas holds whatever was drawn before the loop stopped, which may not
    // be the picture now: the first frame always draws.
    this.dirty = true;
    const tick = (now: number): void => {
      if (stopped) return;
      // A phase is stepped by the time that really passed, which is what keeps a
      // 120 Hz screen from running the folds twice as fast. A timestamp that did
      // not advance counts as one 60 Hz frame, and so does the first frame of a
      // run, which has nothing to measure from.
      const elapsed = now - last;
      const step = last < 0 || elapsed <= 0 ? FRAME_MS : Math.min(MAX_FRAME_MS, elapsed);
      last = now;
      const turned = this.turn(step);
      const stirred = this.easePointer(step);
      // At `speed` 0 with the pointer at rest this frame would only repeat the last.
      if (this.dirty || turned || stirred) this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      stopPointer?.();
    };
  }

  /**
   * Step the phases by `step` ms, and return whether they moved. Stepped rather
   * than computed from a clock: a clock times `speed` is a different angle the
   * moment `speed` changes, so moving the input would jump the picture, and here
   * it only changes how far the next step goes.
   */
  private turn(step: number): boolean {
    const speed = this.speed();
    if (speed === 0) return false;
    const seconds = step / 1000;
    for (let i = 0; i < RATE.length; i++) this.phase[i] = wrap(this.phase[i] + seconds * RATE[i] * speed);
    return true;
  }

  /**
   * Follow the pointer. On the parent, not the host: content in front of the canvas
   * receives the pointer, and its events bubble to the parent, never to a sibling.
   * Placed directly in a shadow root it has none, and the shadow host is where those
   * composed events land. Never the host itself, which takes no pointer events and
   * so could never hear one.
   */
  private listenToPointer(): () => void {
    const hostEl = this.host.nativeElement;
    const root = hostEl.getRootNode();
    const target =
      hostEl.parentElement ?? (root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null);

    const onMove = (event: PointerEvent): void => {
      this.lastMove = { x: event.clientX, y: event.clientY };
    };
    const onLeave = (): void => this.aimAtRest();
    target?.addEventListener('pointermove', onMove, { passive: true });
    target?.addEventListener('pointerleave', onLeave, { passive: true });
    target?.addEventListener('pointercancel', onLeave, { passive: true });

    return () => {
      target?.removeEventListener('pointermove', onMove);
      target?.removeEventListener('pointerleave', onLeave);
      target?.removeEventListener('pointercancel', onLeave);
      this.aimAtRest();
    };
  }

  private aimAtRest(): void {
    this.lastMove = null;
    this.pointer.aimX = 0;
    this.pointer.aimY = 0;
  }

  /**
   * Bring the pointer towards its target by `step` ms, and return whether it moved.
   *
   * The rect is read here, at most once a frame, rather than on every event, and it
   * is the box as drawn, after any transform on an ancestor, so a pointer lands where
   * it is seen. The offset is relative to the box, so a transform needs nothing more.
   */
  private easePointer(step: number): boolean {
    const pointer = this.pointer;
    if (this.lastMove) {
      const rect = this.host.nativeElement.getBoundingClientRect();
      const u = rect.width > 0 ? clamp((this.lastMove.x - rect.left) / rect.width, 0, 1) : 0.5;
      const v = rect.height > 0 ? clamp((this.lastMove.y - rect.top) / rect.height, 0, 1) : 0.5;
      // `v` runs down the box and GL's y runs up it.
      pointer.aimX = (u - 0.5) * 2 * REACH;
      pointer.aimY = (0.5 - v) * 2 * REACH;
      this.lastMove = null;
    }

    const amplitude = this.amplitude();
    const targetX = pointer.aimX * amplitude;
    const targetY = pointer.aimY * amplitude;
    // An amplitude that is not finite would stick a `NaN` in `uPointer` for good, since
    // every later step adds to it. 0 times `Infinity` is one, at the box's centre.
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return false;
    if (pointer.x === targetX && pointer.y === targetY) return false;

    const share = 1 - Math.exp(-step / POINTER_TAU_MS);
    pointer.x += (targetX - pointer.x) * share;
    pointer.y += (targetY - pointer.y) * share;
    if (Math.abs(targetX - pointer.x) < POINTER_EPSILON && Math.abs(targetY - pointer.y) < POINTER_EPSILON) {
      pointer.x = targetX;
      pointer.y = targetY;
    }
    return true;
  }

  // Drawing

  /** Bring the canvas up to date after the picture changed: a still frame now, or the loop's next one. */
  private repaint(moving: boolean): void {
    if (moving) {
      this.dirty = true;
      return;
    }
    // Nothing is following the pointer now, and there is no loop to ease it back.
    this.aimAtRest();
    this.pointer.x = 0;
    this.pointer.y = 0;
    this.draw();
  }

  /**
   * One frame at the current phases and pointer. Leaves `dirty` set when it has
   * nothing to draw on, a lost context or an empty box, so the next chance draws.
   */
  private draw(): void {
    const { gl, gpu } = this;
    const { width, height } = this.bitmap;
    if (!gl || !gpu || width === 0 || height === 0) return;

    const [r, g, b] = this.tint();
    gl.viewport(0, 0, width, height);
    gl.uniform2f(gpu.resolution, width, height);
    gl.uniform3f(gpu.phase, this.phase[0], this.phase[1], this.phase[2]);
    gl.uniform2f(gpu.pointer, this.pointer.x, this.pointer.y);
    gl.uniform3f(gpu.color, r, g, b);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.dirty = false;
    // Outside Angular, so the `set` schedules the one host-binding update it needs.
    if (!this.painted()) this.painted.set(true);
  }

  /**
   * The tint as shader channels. Resolved through the cascade on every draw, since
   * a uniform reads neither a `var()` nor a `light-dark()` and a hook changed by a
   * rule on the host should reach the next frame, and parsed only when that string
   * changes.
   */
  private tint(): readonly [number, number, number] {
    const canvas = this.canvasRef().nativeElement;
    const resolved = resolveCssColor(canvas, this.expression(), FALLBACK_COLOR);
    if (resolved !== this.resolved) {
      this.resolved = resolved;
      this.channels = resolveCssColorChannels(canvas, resolved, FALLBACK_COLOR);
    }
    return this.channels;
  }
}
