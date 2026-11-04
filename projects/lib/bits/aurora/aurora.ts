/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * Angular adaptation of the Aurora background by David Haz / reactbits.dev.
 * Original: https://www.reactbits.dev/backgrounds/aurora
 *
 * The reactbits version renders through the OGL library; this port talks
 * to WebGL2 directly — same vertex/fragment shaders, zero dependencies.
 */

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
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr, resolveCssColorChannels, watchColorScheme } from 'ngwr/utils';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  // Clamp the brightness floor: the upstream shader multiplies colour by
  // raw intensity, which fades the ribbon to BLACK while still opaque —
  // invisible on dark pages, a dirty gray halo on light ones. Keeping the
  // hue saturated and letting alpha alone do the fading works on both.
  vec3 auroraColor = rampColor * max(intensity, 0.85);

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

/** What the GPU holds for one context. A lost context takes all of it, so a restored one builds it again. */
interface Gpu {
  readonly program: WebGLProgram;
  readonly buffer: WebGLBuffer | null;
  readonly uniforms: Readonly<Record<string, WebGLUniformLocation | null>>;
}

/** What a stop falls back to when it cannot be read: the reactbits palette. */
const DEFAULT_STOPS = ['#5227ff', '#7cff67', '#5227ff'] as const;

/**
 * The theme's stop hooks, written out in full: `gen:css-vars` finds a read by
 * its literal name, and a name built from a template string is invisible to it.
 */
const STOP_HOOKS = ['var(--wr-aurora-stop-1)', 'var(--wr-aurora-stop-2)', 'var(--wr-aurora-stop-3)'] as const;

/**
 * Aurora background — flowing northern-lights ribbons rendered with a
 * WebGL2 simplex-noise shader, ramped across three colour stops. Fills
 * its nearest positioned ancestor; renders nothing without WebGL2.
 *
 * Under `prefers-reduced-motion` a single static frame is drawn, and drawn
 * again in the new colours when the page's colour scheme switches.
 *
 * Under forced colours the canvas is hidden and its loop stops with it, leaving the
 * box on the palette's own ground, which is what forced text and marks are chosen
 * against. The loop also stops off screen and with no box to draw on.
 *
 * With no WebGL2 context, or a shader the driver refuses, nothing is thrown and
 * the canvas stays empty. A context the browser takes away is rebuilt if it offers
 * one back. A destroyed host hands its GPU resources back at once. Browsers keep a
 * small number of live contexts and kill the oldest: Chromium frees the slot at that
 * point, while WebKit frees it only when the context is collected and offers an
 * evicted one no restore, so there a host that is not drawing can stay empty for good.
 *
 * @example
 * ```html
 * <div style="position: relative; min-height: 24rem; overflow: hidden">
 *   <wr-aurora />
 *   <h1 style="position: relative">Welcome aboard</h1>
 * </div>
 * ```
 *
 * @see https://ngwr.dev/bits/aurora
 */
@Component({
  selector: 'wr-aurora',
  template: '<canvas #canvas class="wr-aurora__canvas" aria-hidden="true"></canvas>',
  styleUrl: './aurora.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-aurora' },
})
export class WrAurora {
  /**
   * Exactly three colour stops, ramped left → right — any CSS colour each, a
   * `var()` token or a `light-dark()` pair included. Alpha is ignored; the
   * ribbon fades through its own. When unset, the theme decides: deep
   * violet/emerald on light, the neon reactbits palette on dark.
   */
  readonly colorStops = input<readonly string[] | null>(null);

  /** Wave height multiplier. @default 1 */
  readonly amplitude = input(1, { transform: numAttr(1) });

  /** Softness of the aurora's lower edge, 0..1. @default 0.5 */
  readonly blend = input(0.5, { transform: numAttr(0.5) });

  /** Time multiplier. @default 1 */
  readonly speed = input(1, { transform: numAttr(1) });

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platform = inject(WrPlatform);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private gl: WebGL2RenderingContext | null = null;
  private gpu: Gpu | null = null;
  private rafId = 0;
  /** The shader time last drawn, so a resize can repaint the frame it just cleared. */
  private time = 0;

  /** Flips once a program is built, and back when the context goes — everything that draws waits for it. */
  private readonly booted = signal(false);
  /** Whether the host is in the viewport; stays `true` without an observer. */
  private readonly onScreen = signal(true);
  /**
   * Whether the box has an area. The intersection observer calls a zero-area canvas
   * intersecting and sends no entry when it gains a size, so this reads the box instead.
   */
  private readonly hasBox = signal(false);

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // Push input changes into uniforms without restarting the loop. Under
    // reduced motion this also repaints the static frame — and so does the
    // moment motion stops. After render rather than an `effect`, which runs
    // before a directive's host binding: a still frame drawn then would miss a
    // hook it changes in the same pass.
    afterRenderEffect(() => {
      if (!this.booted()) return;
      const still = this.platform.prefersReducedMotion();
      this.colorStops();
      this.amplitude();
      this.blend();
      untracked(() => {
        this.pushUniforms();
        if (still) this.draw(0);
      });
    });

    // A still frame keeps the colours it was drawn with, so a scheme switch
    // under reduced motion re-resolves the stops and paints it again. The loop
    // needs no help: it re-resolves on every frame it draws.
    watchColorScheme(() => {
      if (!this.gpu || !this.platform.prefersReducedMotion()) return;
      this.pushUniforms();
      this.draw(0);
    });

    // The frame loop runs only while there is something to see: never under
    // `prefers-reduced-motion`, read live (the effect above paints the static
    // frame when it switches on), and not while the host is off screen or has no
    // box — a background redrawn out of sight still costs a frame every frame.
    effect(onCleanup => {
      if (!this.booted() || !this.onScreen() || !this.hasBox() || this.platform.prefersReducedMotion()) return;
      const loop = (t: number): void => {
        this.rafId = requestAnimationFrame(loop);
        this.pushUniforms();
        this.draw(t * 0.01 * this.speed() * 0.1);
      };
      this.zone.runOutsideAngular(() => (this.rafId = requestAnimationFrame(loop)));
      onCleanup(() => cancelAnimationFrame(this.rafId));
    });
  }

  private boot(): void {
    const canvas = this.canvasRef().nativeElement;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
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

    const hostEl = this.host.nativeElement;
    const fit = (): void => {
      // The layout box and not `getBoundingClientRect()`, which is the box after
      // transforms: no observer hears of a transform, so a host booted under a
      // `scale(0)` would count as having no box for good.
      const width = hostEl.clientWidth;
      const height = hostEl.clientHeight;
      this.hasBox.set(width > 0 && height > 0);
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (this.gpu) gl.uniform2f(this.gpu.uniforms['uResolution'], canvas.width, canvas.height);
    };

    const onLost = (event: Event): void => {
      // Without this the browser never offers the context back.
      event.preventDefault();
      this.gpu = null;
      this.booted.set(false);
    };
    const onRestored = (): void => {
      this.gpu = this.build(gl);
      if (!this.gpu) return;
      // The resolution went with the old program; the effects redraw the rest.
      fit();
      this.booted.set(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    // Sizing the bitmap clears it, and observer entries arrive after the frame's own
    // callbacks and before its paint, so a repaint left to the loop would leave this
    // frame empty.
    const resize = (): void => {
      fit();
      this.draw(this.platform.prefersReducedMotion() ? 0 : this.time);
    };

    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(hostEl);

    fit();
    this.pushUniforms();

    // Static frame — the ribbons hold their t=0 shape. Painted under reduced
    // motion, and as the first frame either way; the loop takes over from here.
    this.draw(0);

    // Without an observer (jsdom) the host simply counts as visible. The canvas
    // rather than the host, which fills the same box, so a canvas hidden under forced
    // colours stops the loop too. A box flush against a zero-height clip intersects with
    // nothing showing, and only a second threshold reports the clip moving. It sits below
    // any real ratio, or a clip closing on a transition steps from under it to 0 without
    // crossing anything.
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
      window.removeEventListener('resize', resize);
      ro.disconnect();
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
        console.error('wr-aurora program error:', gl.getProgramInfoLog(program));
      }
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of ['uTime', 'uAmplitude', 'uColorStops', 'uResolution', 'uBlend']) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    // One oversized triangle covers the viewport — no index buffer needed.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    return { program, buffer, uniforms };
  }

  private compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    if (!gl.isContextLost()) {
      // eslint-disable-next-line no-console -- GPU shader failures are otherwise invisible
      console.error('wr-aurora shader error:', gl.getShaderInfoLog(shader));
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

  private pushUniforms(): void {
    const { gl, gpu } = this;
    if (!gl || !gpu) return;
    const flat = new Float32Array(9);
    for (let i = 0; i < 3; i++) flat.set(this.resolveStop(i), i * 3);
    gl.uniform3fv(gpu.uniforms['uColorStops'], flat);
    gl.uniform1f(gpu.uniforms['uAmplitude'], this.amplitude());
    gl.uniform1f(gpu.uniforms['uBlend'], this.blend());
  }

  /**
   * Stop `index` as shader channels. Explicit input wins; otherwise the theme's
   * `--wr-aurora-stop-*` hook, which holds a `light-dark()` pair no uniform can
   * take, so either is resolved through the cascade first. Read every frame, so
   * a colour-scheme change reaches the ribbon on the next one.
   */
  private resolveStop(index: number): [number, number, number] {
    const explicit = this.colorStops();
    const fallback = DEFAULT_STOPS[index];
    const expression =
      explicit === null ? STOP_HOOKS[index] : (explicit[Math.min(index, explicit.length - 1)] ?? fallback);
    return resolveCssColorChannels(this.canvasRef().nativeElement, expression, fallback);
  }

  private draw(time: number): void {
    const { gl, gpu } = this;
    if (!gl || !gpu || !this.hasBox()) return;
    this.time = time;
    gl.uniform1f(gpu.uniforms['uTime'], time);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
