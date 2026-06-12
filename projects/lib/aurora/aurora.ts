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
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { WrPlatform } from 'ngwr/platform';
import { numAttr } from 'ngwr/utils';

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

function hexToRgb01(hex: string): [number, number, number] {
  let val = hex.replace('#', '');
  if (val.length === 3) val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
  return [
    Number.parseInt(val.slice(0, 2), 16) / 255,
    Number.parseInt(val.slice(2, 4), 16) / 255,
    Number.parseInt(val.slice(4, 6), 16) / 255,
  ];
}

/**
 * Aurora background — flowing northern-lights ribbons rendered with a
 * WebGL2 simplex-noise shader, ramped across three colour stops. Fills
 * its nearest positioned ancestor; renders nothing without WebGL2.
 *
 * Under `prefers-reduced-motion` a single static frame is drawn.
 *
 * @example
 * ```html
 * <div style="position: relative; min-height: 24rem; overflow: hidden">
 *   <wr-aurora />
 *   <h1 style="position: relative">Welcome aboard</h1>
 * </div>
 * ```
 *
 * @see https://ngwr.dev/animations/aurora
 */
@Component({
  selector: 'wr-aurora',
  template: '<canvas #canvas class="wr-aurora__canvas"></canvas>',
  styleUrl: './aurora.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-aurora' },
})
export class WrAurora {
  /**
   * Exactly three colour stops, ramped left → right. When unset, the
   * theme decides: deep violet/emerald on light, the neon reactbits
   * palette on dark.
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
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private rafId = 0;

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => this.zone.runOutsideAngular(() => this.boot()));

    // Push input changes into uniforms without restarting the loop. Under
    // reduced motion this also repaints the static frame.
    effect(() => {
      this.colorStops();
      this.amplitude();
      this.blend();
      if (!this.gl) return;
      this.pushUniforms();
      if (this.platform.prefersReducedMotion()) this.draw(0);
    });
  }

  private boot(): void {
    const canvas = this.canvasRef().nativeElement;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return;
    this.gl = gl;

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        // eslint-disable-next-line no-console -- GPU shader failures are otherwise invisible
        console.error('wr-aurora shader error:', gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    for (const name of ['uTime', 'uAmplitude', 'uColorStops', 'uResolution', 'uBlend']) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }

    // One oversized triangle covers the viewport — no index buffer needed.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resize = (): void => {
      const rect = this.host.nativeElement.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width));
      canvas.height = Math.max(1, Math.round(rect.height));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(this.uniforms['uResolution'], canvas.width, canvas.height);
      if (this.platform.prefersReducedMotion()) this.draw(0);
    };

    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(this.host.nativeElement);

    resize();
    this.pushUniforms();

    if (this.platform.prefersReducedMotion()) {
      // Static frame — the ribbons hold their t=0 shape.
      this.draw(0);
    } else {
      const loop = (t: number): void => {
        this.rafId = requestAnimationFrame(loop);
        this.pushUniforms();
        this.draw(t * 0.01 * this.speed() * 0.1);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', resize);
      ro.disconnect();
    });
  }

  private pushUniforms(): void {
    const gl = this.gl;
    if (!gl) return;
    const stops = this.resolveStops();
    const flat = new Float32Array(9);
    for (let i = 0; i < 3; i++) {
      const [r, g, b] = hexToRgb01(stops[Math.min(i, stops.length - 1)] ?? '#5227ff');
      flat[i * 3] = r;
      flat[i * 3 + 1] = g;
      flat[i * 3 + 2] = b;
    }
    gl.uniform3fv(this.uniforms['uColorStops'], flat);
    gl.uniform1f(this.uniforms['uAmplitude'], this.amplitude());
    gl.uniform1f(this.uniforms['uBlend'], this.blend());
  }

  /** Explicit input wins; otherwise the theme's `--wr-aurora-stop-*` vars. */
  private resolveStops(): readonly string[] {
    const explicit = this.colorStops();
    if (explicit !== null) return explicit;
    const style = getComputedStyle(this.host.nativeElement);
    return [
      style.getPropertyValue('--wr-aurora-stop-1').trim() || '#5227ff',
      style.getPropertyValue('--wr-aurora-stop-2').trim() || '#7cff67',
      style.getPropertyValue('--wr-aurora-stop-3').trim() || '#5227ff',
    ];
  }

  private draw(time: number): void {
    const gl = this.gl;
    if (!gl) return;
    gl.uniform1f(this.uniforms['uTime'], time);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
