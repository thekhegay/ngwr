/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { LENS, RIPPLE_MAX, WAKE_MAX } from './flow-model';

/**
 * The one pass `<wr-flow-lines>` draws: a full-screen quad whose fragment
 * shader finds, for its pixel, the nearest line of the field and how far
 * away it is. The field is a family of level sets: a pixel is first carried
 * back through the pointer's wake and the ripples (each a radial push with a
 * smooth falloff, summed), then read in the lines' own frame, along and
 * across, and the drift, two octaves of smooth noise across the lines, is
 * taken off its across coordinate. What is left, divided by the spacing,
 * says which line is nearest and how far it is in the field's units; the
 * gradient of that coordinate, carried analytically through the noise and
 * through the pushes' Jacobians, turns it into a distance in device px, so
 * the line is a crisp anti-aliased hairline whatever bends it, and a curve
 * through the pushed region is as smooth as one at rest. Dashes, the intro's
 * head and the edge fade multiply the coverage; the accent is mixed in where
 * the push is strongest; the output is premultiplied.
 *
 * The wake's segments and the ripples come in as uniform arrays, so a frame
 * uploads a few hundred floats and nothing else. GLSL ES 1.00, which WebGL1
 * and WebGL2 both accept; the loop bounds are the model's `WAKE_MAX` and
 * `RIPPLE_MAX`, with a break at the live counts.
 */

type FlowGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/** What one frame needs, every length in CSS px unless said otherwise. */
interface FlowFrame {
  /** The canvas, in device px. */
  width: number;
  height: number;
  /** CSS px per device px: the inverse of the render ratio. */
  scale: number;
  /** The region's CSS size. */
  regionWidth: number;
  regionHeight: number;
  /** The lines' direction, as its cos and sin, and -1 under RTL so the intro draws from the inline start; 1 otherwise. */
  cos: number;
  sin: number;
  mirror: number;
  /** Between two lines; a line's half thickness in device px; how much of its colour a line lays. */
  spacing: number;
  halfWidth: number;
  ink: number;
  /** The drift: how far it bends a line, its frequency along a line in cycles per px, how much slower it varies across, and the clock. */
  amplitude: number;
  frequency: number;
  across: number;
  time: number;
  /** The line and the accent colour, 0..1 sRGB. */
  color: Float32Array;
  accent: Float32Array;
  /** The wake: `x`, `y`, weight, nothing per segment, how many are live, and the box they reach. */
  wake: Float32Array;
  wakeCount: number;
  wakeBox: Float32Array;
  /** How far from a segment it still pushes, and the push at its heart, which the accent is measured against. */
  reach: number;
  push: number;
  /** The ripples: `x`, `y`, age in seconds, crest push per ripple, and how many are live. */
  ripples: Float32Array;
  rippleCount: number;
  /** A ripple's speed in px/s, its ring's half width and its life in seconds. */
  rippleSpeed: number;
  rippleWidth: number;
  rippleLife: number;
  /** The dashes: their period, the dash's share of it, their offset along the lines now, and whether they are on. */
  dashPeriod: number;
  dashDuty: number;
  dashOffset: number;
  dashed: boolean;
  /** The intro's head from the start edge, how far the lines are staggered behind it and how soft it is; a head past everything is no intro. */
  introHead: number;
  introStagger: number;
  introSoft: number;
  /** How far in from the top and the bottom the field fades; the sides run on to the edge. */
  fade: number;
}

interface FlowRenderer {
  /** Draws the frame onto the canvas. */
  render(frame: FlowFrame): void;
  /** Frees the program and the quad. */
  destroy(): void;
}

const VERTEX = `
attribute vec2 aPosition;
void main () {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
const int WAKE_MAX = ${WAKE_MAX};
const int RIPPLE_MAX = ${RIPPLE_MAX};
const float LENS = ${LENS.toFixed(4)};
uniform vec2 uSize;
uniform float uScale;
uniform vec3 uAxis;
uniform vec3 uLine;
uniform vec4 uNoise;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec4 uWake[WAKE_MAX];
uniform float uWakeCount;
uniform vec4 uWakeBox;
uniform vec2 uReach;
uniform vec4 uRipple[RIPPLE_MAX];
uniform float uRippleCount;
uniform vec3 uRippleShape;
uniform vec4 uDash;
uniform vec4 uIntro;
uniform float uFade;

float hash (vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

// Value noise in -1..1 with its gradient, quintic-smoothed, so the slope is continuous too.
vec4 noised (vec3 x) {
  vec3 p = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = hash(p);
  float b = hash(p + vec3(1.0, 0.0, 0.0));
  float c = hash(p + vec3(0.0, 1.0, 0.0));
  float d = hash(p + vec3(1.0, 1.0, 0.0));
  float e = hash(p + vec3(0.0, 0.0, 1.0));
  float f = hash(p + vec3(1.0, 0.0, 1.0));
  float g = hash(p + vec3(0.0, 1.0, 1.0));
  float h = hash(p + vec3(1.0, 1.0, 1.0));
  float k1 = b - a;
  float k2 = c - a;
  float k3 = e - a;
  float k4 = a - b - c + d;
  float k5 = a - c - e + g;
  float k6 = a - b - e + f;
  float k7 = -a + b + c - d + e - f - g + h;
  float v = a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x
    + k7 * u.x * u.y * u.z;
  vec3 grad = du * vec3(
    k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
    k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
    k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y);
  return vec4(v * 2.0 - 1.0, grad * 2.0);
}

void main () {
  // The pixel in CSS px from the region's top left, y down.
  vec2 p = vec2(gl_FragCoord.x * uScale, uSize.y - gl_FragCoord.y * uScale);
  float fade = smoothstep(0.0, uFade, min(p.y, uSize.y - p.y));
  if (fade <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Where the pixel is carried from: the wake's and the ripples' pushes, each
  // f(r) times the offset from its centre, nothing at the centre itself so the
  // field never folds, and the Jacobian of the sum (symmetric: xx, xy, yy),
  // f on the diagonal plus 2 df/d(r^2) d d^T.
  vec2 W = vec2(0.0);
  vec3 J = vec3(0.0);
  if (uWakeCount > 0.0 && all(greaterThan(p, uWakeBox.xy)) && all(lessThan(p, uWakeBox.zw))) {
    float R2 = uReach.x * uReach.x;
    // A lens: the push grows from the centre and falls off to the reach, peaking at the push itself.
    float gain = LENS / uReach.x;
    for (int i = 0; i < WAKE_MAX; i++) {
      if (float(i) >= uWakeCount) break;
      vec4 s = uWake[i];
      vec2 d = p - s.xy;
      float r2 = dot(d, d);
      if (r2 >= R2) continue;
      float q = r2 / R2;
      float f = s.z * gain * (1.0 - q) * (1.0 - q);
      float dfdr2 = s.z * gain * -2.0 * (1.0 - q) / R2;
      W += f * d;
      J += vec3(f + 2.0 * dfdr2 * d.x * d.x, 2.0 * dfdr2 * d.x * d.y, f + 2.0 * dfdr2 * d.y * d.y);
    }
  }
  float ring = 0.0;
  for (int i = 0; i < RIPPLE_MAX; i++) {
    if (float(i) >= uRippleCount) break;
    vec4 rp = uRipple[i];
    vec2 d = p - rp.xy;
    float r2 = dot(d, d);
    float r = sqrt(r2);
    float w = uRippleShape.y;
    float s = (r - rp.z * uRippleShape.x) / w;
    if (abs(s) > 3.0) continue;
    float life = 1.0 - rp.z / uRippleShape.z;
    float g = life * exp(-s * s);
    float amp = rp.w * g;
    // Softened by the ring's width, so the crest pushes its whole amount and the centre nothing.
    float inv = inversesqrt(r2 + w * w);
    float f = amp * inv;
    float dfdr2 = -amp * s / (w * max(r, 0.001)) * inv - 0.5 * amp * inv * inv * inv;
    W += f * d;
    J += vec3(f + 2.0 * dfdr2 * d.x * d.x, 2.0 * dfdr2 * d.x * d.y, f + 2.0 * dfdr2 * d.y * d.y);
    ring = max(ring, g);
  }

  // The field in the lines' frame, from the region's middle: along and across.
  vec2 q = p - W - uSize * 0.5;
  vec2 aAxis = vec2(uAxis.x, uAxis.y) * uAxis.z;
  vec2 cAxis = vec2(-uAxis.y, uAxis.x);
  float along = dot(q, aAxis);
  float across = dot(q, cAxis);

  // The drift across the lines: two octaves, and its slope along and across.
  vec3 n = vec3(along * uNoise.y, across * uNoise.y * uNoise.z, uNoise.w);
  vec4 o1 = noised(n);
  vec4 o2 = noised(n * 2.3 + vec3(7.3, 3.1, 11.0));
  float drift = uNoise.x * (o1.x + 0.35 * o2.x);
  float dAlong = uNoise.x * uNoise.y * (o1.y + 0.35 * 2.3 * o2.y);
  float dAcross = uNoise.x * uNoise.y * uNoise.z * (o1.z + 0.35 * 2.3 * o2.z);

  // The line coordinate, its gradient in the pixel's frame, and so the distance to the nearest line in device px.
  float v = across - drift;
  vec2 gq = cAxis * (1.0 - dAcross) - aAxis * dAlong;
  vec2 gp = vec2((1.0 - J.x) * gq.x - J.y * gq.y, -J.y * gq.x + (1.0 - J.z) * gq.y);
  float k = floor(v / uLine.x + 0.5);
  float dist = abs(v - k * uLine.x) * inversesqrt(max(dot(gp, gp), 1e-6)) / uScale;
  float cover = clamp(uLine.y + 0.5 - dist, 0.0, 1.0);
  if (cover <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Each line's own lot: where its dashes start and how far behind the intro's head it is.
  float lot = hash(vec3(k, 1.7, 2.9));
  if (uDash.w > 0.5) {
    float pos = mod(along + uDash.z + lot * uDash.x, uDash.x);
    cover *= clamp(min(pos, uDash.x * uDash.y - pos) / uScale + 0.5, 0.0, 1.0);
  }
  float head = uIntro.x - lot * uIntro.y;
  cover *= 1.0 - smoothstep(head - uIntro.w, head, along + uIntro.z);

  // The accent where the push is strongest, and on a ripple's crest; a pushed line lays a little more ink.
  float pushed = length(W) / max(uReach.y, 1.0);
  float accent = max(smoothstep(0.08, 0.9, pushed), ring * 0.9);
  float alpha = min(1.0, cover * fade * uLine.z * (1.0 + 0.8 * accent));
  vec3 rgb = mix(uColor, uAccent, accent * 0.95);
  gl_FragColor = vec4(rgb * alpha, alpha);
}`;

const UNIFORMS = [
  'uSize',
  'uScale',
  'uAxis',
  'uLine',
  'uNoise',
  'uColor',
  'uAccent',
  'uWake',
  'uWakeCount',
  'uWakeBox',
  'uReach',
  'uRipple',
  'uRippleCount',
  'uRippleShape',
  'uDash',
  'uIntro',
  'uFade',
] as const;

type FlowUniform = (typeof UNIFORMS)[number];

/** Stands in for an infinite head: every line is whole. */
const NO_INTRO = 1e9;

class Renderer implements FlowRenderer {
  private readonly program: WebGLProgram;
  private readonly quad: WebGLBuffer;
  private readonly uniforms: Record<FlowUniform, WebGLUniformLocation | null>;

  constructor(private readonly gl: FlowGLContext) {
    const quad = gl.createBuffer();
    if (!quad) throw new Error('flow-lines: no buffer');
    this.quad = quad;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const vertex = this.shader(gl.VERTEX_SHADER, VERTEX);
    const fragment = this.shader(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!program) throw new Error('flow-lines: no program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`flow-lines: program failed: ${log ?? ''}`);
    }
    this.program = program;
    const uniforms = {} as Record<FlowUniform, WebGLUniformLocation | null>;
    for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
    this.uniforms = uniforms;
  }

  render(frame: FlowFrame): void {
    const { gl, uniforms } = this;
    gl.useProgram(this.program);
    gl.uniform2f(uniforms.uSize, frame.regionWidth, frame.regionHeight);
    gl.uniform1f(uniforms.uScale, frame.scale);
    gl.uniform3f(uniforms.uAxis, frame.cos, frame.sin, frame.mirror);
    gl.uniform3f(uniforms.uLine, frame.spacing, frame.halfWidth, frame.ink);
    gl.uniform4f(uniforms.uNoise, frame.amplitude, frame.frequency, frame.across, frame.time);
    gl.uniform3f(uniforms.uColor, frame.color[0], frame.color[1], frame.color[2]);
    gl.uniform3f(uniforms.uAccent, frame.accent[0], frame.accent[1], frame.accent[2]);
    gl.uniform4fv(uniforms.uWake, frame.wake);
    gl.uniform1f(uniforms.uWakeCount, frame.wakeCount);
    gl.uniform4f(uniforms.uWakeBox, frame.wakeBox[0], frame.wakeBox[1], frame.wakeBox[2], frame.wakeBox[3]);
    gl.uniform2f(uniforms.uReach, frame.reach, frame.push);
    gl.uniform4fv(uniforms.uRipple, frame.ripples);
    gl.uniform1f(uniforms.uRippleCount, frame.rippleCount);
    gl.uniform3f(uniforms.uRippleShape, frame.rippleSpeed, frame.rippleWidth, frame.rippleLife);
    gl.uniform4f(uniforms.uDash, frame.dashPeriod, frame.dashDuty, frame.dashOffset, frame.dashed ? 1 : 0);
    const head = Number.isFinite(frame.introHead) ? frame.introHead : NO_INTRO;
    // The field's half length along the lines: the intro measures from the start edge, the shader from the middle.
    const half = (Math.abs(frame.regionWidth * frame.cos) + Math.abs(frame.regionHeight * frame.sin)) / 2;
    gl.uniform4f(uniforms.uIntro, head, frame.introStagger, half, frame.introSoft);
    gl.uniform1f(uniforms.uFade, frame.fade);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, frame.width, frame.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy(): void {
    const { gl } = this;
    gl.deleteBuffer(this.quad);
    gl.deleteProgram(this.program);
  }

  private shader(kind: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(kind);
    if (!shader) throw new Error('flow-lines: no shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`flow-lines: shader failed: ${log ?? ''}`);
    }
    return shader;
  }
}

/**
 * The attributes the canvas's context is asked for: premultiplied alpha,
 * which is what the pass writes, no antialiasing (the shader does its own)
 * and no buffer the pass does not use.
 */
const FLOW_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

/** A renderer on `gl`, or `null` where the shader will not compile or link. */
function createFlowRenderer(gl: FlowGLContext): FlowRenderer | null {
  try {
    return new Renderer(gl);
  } catch {
    return null;
  }
}

export { FLOW_CONTEXT_ATTRIBUTES, UNIFORMS as FLOW_UNIFORMS, NO_INTRO, createFlowRenderer };
export type { FlowFrame, FlowGLContext, FlowRenderer, FlowUniform };
