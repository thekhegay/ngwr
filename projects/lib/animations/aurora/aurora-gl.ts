/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import {
  BORDER,
  BORDER_AT,
  BORDER_WIDTH,
  EDGE_SOFT,
  FOLD_FLOOR,
  GLOW_LIFT,
  LAYERS_MAX,
  PROFILE_FLOOR,
  RAY_FALL,
  RAY_GAIN,
  RAY_SHORT,
  VEIL,
  VEIL_POWER,
  WASH_CHROMA_MAX,
  WASH_DETAIL,
  WASH_FOLD_FLOOR,
  WASH_RAY,
  WASH_RISE,
  WASH_SOFT,
} from './aurora-model';

/**
 * The one pass `<wr-aurora>` draws: a full-screen quad whose fragment shader
 * lights, for its pixel, up to three curtains hanging from one edge of the
 * region. A curtain's free edge is a slow wave, three octaves of smooth
 * noise across the width; the pixel's place between the anchored edge and
 * that wave gives it the vertical profile (dim at the root, brightest just
 * short of the free edge, soft past it), fine noise across the width makes
 * the rays, leaning with the wave and shimmering on a clock of their own,
 * and the colour is the three stops interpolated in OKLCh at the pixel's
 * place across the width, the hue drifting with the wave. The curtains sit
 * at depths: the farther one is broader, slower, dimmer and moves less with
 * the pointer. They are composited back to front inside the shader.
 *
 * Two ways to lay the result, mixed by `uLook.z`. On a light surface the
 * curtain is a wash, a pale pastel: the stop's hue at one high lightness and
 * a fraction of its chroma, laid at an alpha that follows a softer shape
 * than the curtain's (no bright border, a wave with less fine detail, a long
 * dissolve past the free edge, the rays a whisper), so it dissolves into the
 * surface with no edge and never falls to grey. On a dark one it is light:
 * the colour scaled by the brightness in the colour channels with half that
 * in alpha, so it adds to the surface rather than covering it, the brightest
 * spots lifted toward white. The output is premultiplied either way. GLSL
 * ES 1.00, which WebGL1 and WebGL2 both accept.
 */

type AuroraGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/** What one frame needs, every length in CSS px unless said otherwise. */
interface AuroraFrame {
  /** The canvas, in device px. */
  width: number;
  height: number;
  /** CSS px per device px: the inverse of the render ratio. */
  scale: number;
  /** The region's CSS size. */
  regionWidth: number;
  regionHeight: number;
  /** One hangs from the top, minus one from the bottom; and minus one under RTL, so the stops run from the inline start. */
  edge: number;
  mirror: number;
  /** The curtain's reach as a share of the region, the wave as a share of that, and the wave's and the rays' frequency across the width. */
  reach: number;
  wave: number;
  waveFrequency: number;
  rayFrequency: number;
  /** The clocks: the wave's, the rays' and the hue's, in noise cells. */
  waveTime: number;
  rayTime: number;
  hueTime: number;
  /** How many curtains, one to three. */
  layers: number;
  /** The rays' strength, the glow multiplier, one for a wash on a light surface and nought for light on a dark one, and how far in from each side the curtain fades. */
  rays: number;
  glow: number;
  light: number;
  sideFade: number;
  /** The intro's fade and reach, both shares; and the drift toward the pointer, across as a share of the width and the stretch as a share of the reach. */
  introFade: number;
  introReach: number;
  driftAcross: number;
  driftStretch: number;
  /** The three stops in OKLCh: lightness, chroma, hue in radians. */
  stops: readonly Float32Array[];
  /** The wash: its peak alpha, the lightness it lays every stop at and the share of a stop's chroma it keeps; the light: its peak strength. */
  washAlpha: number;
  washLightness: number;
  washChroma: number;
  glowPeak: number;
}

interface AuroraRenderer {
  /** Draws the frame onto the canvas. */
  render(frame: AuroraFrame): void;
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
const int LAYERS_MAX = ${LAYERS_MAX};
const float EDGE_SOFT = ${EDGE_SOFT.toFixed(4)};
const float PROFILE_FLOOR = ${PROFILE_FLOOR.toFixed(4)};
const float VEIL = ${VEIL.toFixed(4)};
const float VEIL_POWER = ${VEIL_POWER.toFixed(4)};
const float BORDER = ${BORDER.toFixed(4)};
const float BORDER_AT = ${BORDER_AT.toFixed(4)};
const float BORDER_WIDTH = ${BORDER_WIDTH.toFixed(4)};
const float FOLD_FLOOR = ${FOLD_FLOOR.toFixed(4)};
const float RAY_GAIN = ${RAY_GAIN.toFixed(4)};
const float RAY_FALL = ${RAY_FALL.toFixed(4)};
const float RAY_SHORT = ${RAY_SHORT.toFixed(4)};
const float GLOW_LIFT = ${GLOW_LIFT.toFixed(4)};
const float WASH_RISE = ${WASH_RISE.toFixed(4)};
const float WASH_SOFT = ${WASH_SOFT.toFixed(4)};
const float WASH_FOLD_FLOOR = ${WASH_FOLD_FLOOR.toFixed(4)};
const float WASH_RAY = ${WASH_RAY.toFixed(4)};
const float WASH_DETAIL = ${WASH_DETAIL.toFixed(4)};
const float WASH_CHROMA_MAX = ${WASH_CHROMA_MAX.toFixed(4)};
const float PI = 3.14159265;
const float TAU = 6.28318531;
uniform vec2 uSize;
uniform float uScale;
uniform vec2 uAxis;
uniform vec4 uShape;
uniform vec4 uMotion;
uniform vec4 uLook;
uniform vec4 uState;
uniform vec3 uStops[3];
uniform vec4 uTone;

float hash (vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 19.19);
  return fract((q.x + q.y) * q.z);
}

// Value noise in -1..1, quintic-smoothed.
float noise (vec2 x) {
  vec2 p = floor(x);
  vec2 w = fract(x);
  vec2 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  float a = hash(p);
  float b = hash(p + vec2(1.0, 0.0));
  float c = hash(p + vec2(0.0, 1.0));
  float d = hash(p + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

float toGamma (float c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

// OKLCh to sRGB, clipped to the gamut.
vec3 oklchToSrgb (vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  vec3 lin = clamp(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), 0.0, 1.0);
  return vec3(toGamma(lin.r), toGamma(lin.g), toGamma(lin.b));
}

// The stops at u across: the first at nought, the second midway, the third at one, the hue on the shorter arc.
vec3 stopAt (float u) {
  float x = clamp(u, 0.0, 1.0);
  vec3 a = x < 0.5 ? uStops[0] : uStops[1];
  vec3 b = x < 0.5 ? uStops[1] : uStops[2];
  float t = x < 0.5 ? x * 2.0 : x * 2.0 - 1.0;
  t = t * t * (3.0 - 2.0 * t);
  float dh = mod(b.z - a.z + PI, TAU) - PI;
  return vec3(mix(a.x, b.x, t), mix(a.y, b.y, t), a.z + dh * t);
}

void main () {
  // The pixel in CSS px, x from the inline start, y from the anchored edge.
  vec2 p = vec2(gl_FragCoord.x * uScale, uSize.y - gl_FragCoord.y * uScale);
  if (uAxis.x < 0.0) p.y = uSize.y - p.y;
  float u = p.x / uSize.x;
  if (uAxis.y < 0.0) u = 1.0 - u;
  float side = smoothstep(0.0, 1.0, min(p.x, uSize.x - p.x) / uLook.w);
  if (side <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec4 acc = vec4(0.0);
  for (int i = LAYERS_MAX - 1; i >= 0; i--) {
    if (float(i) >= uMotion.w) continue;
    // The curtain's depth: nought in front, one at the back, which is broader, slower, dimmer and moves less.
    float depth = float(i) / max(uMotion.w - 1.0, 1.0);
    float broad = 1.0 + 0.7 * depth;
    float dim = 1.0 - 0.45 * depth;
    float seed = float(i) * 17.0;
    float ux = u - uState.z * (1.0 - 0.6 * depth);

    // The free edge: three octaves across the width, on the wave's clock.
    float wt = uMotion.x / broad + seed;
    float nx = ux * uShape.z / broad;
    float n1 = noise(vec2(nx, wt));
    float n2 = noise(vec2(nx * 2.3 + 5.1, wt * 1.4 + 2.0));
    float n3 = noise(vec2(nx * 4.7 + 11.0, wt * 1.9 + 7.0));
    float w = clamp((n1 + 0.6 * n2 + 0.3 * n3) / 1.4, -1.0, 1.0);
    float stretch = uSize.y * uShape.x * (1.0 + 0.12 * depth) * uState.y * (1.0 + uState.w);
    float reach = uSize.y * uShape.x * (1.0 + uShape.y * w) * (1.0 + 0.12 * depth) * uState.y * (1.0 + uState.w);
    reach = min(max(reach, 1.0), uSize.y);
    float v = p.y / reach;
    // The wash has a wave of its own, with less of the finer octaves: a broad, slow edge. Kept apart from the
    // curtain's, so the light's arithmetic is what it was.
    float wl = clamp((n1 + WASH_DETAIL * (0.6 * n2 + 0.3 * n3)) / (1.0 + 0.9 * WASH_DETAIL), -1.0, 1.0);
    float vl = p.y / min(max(stretch * (1.0 + uShape.y * wl), 1.0), uSize.y);
    if (v > 1.0 + EDGE_SOFT && (uLook.z <= 0.0 || vl > 1.0 + WASH_SOFT)) continue;
    float vc = clamp(v, 0.0, 1.0);

    // The vertical profile: a veil, faint at the root and growing toward the free edge, a bright border
    // just short of that edge, and both soft past it.
    float veil = mix(PROFILE_FLOOR, VEIL, pow(vc, VEIL_POWER));
    float b = (v - BORDER_AT) / BORDER_WIDTH;
    float border = BORDER * exp(-b * b);
    float fade = 1.0 - smoothstep(1.0 - EDGE_SOFT, 1.0 + EDGE_SOFT * 0.6, v);

    // The folds: the curtain is bright in knots along its length and dimmer between them, on the wave's clock.
    float knot = smoothstep(-0.9, 0.9, noise(vec2(nx * 1.3 + 7.7, wt * 0.9 + 3.3)));
    float fold = mix(FOLD_FLOOR, 1.0, knot);

    // The rays: columns across the width, each with a brightness and a length of its own, leaning with the
    // wave toward the root, shimmering on their own clock; a ray is whole at the free edge and fades toward
    // the root, the shorter the faster. At a unit rays half the veil goes, the border is beaded and the rays
    // rise over it.
    float rx = (ux + 0.04 * w * (1.0 - vc)) * uShape.w / broad + seed;
    float c = 0.5 + 0.5 * (0.65 * noise(vec2(rx, uMotion.y + seed)) + 0.35 * noise(vec2(rx * 2.3 + 3.0, uMotion.y * 1.6 + 1.0)));
    c = smoothstep(0.25, 0.95, c);
    float len = mix(RAY_SHORT, 1.0, 0.5 + 0.5 * noise(vec2(rx * 0.21 + 9.0, uMotion.y * 0.35 + seed)));
    float ray = c * exp(-(1.0 - vc) * RAY_FALL / len);
    float bead = mix(1.0, 0.6 + 0.4 * c, uLook.x);
    float shape = min(1.0, veil * (1.0 - 0.5 * uLook.x) + border * bead + uLook.x * RAY_GAIN * ray);
    float I = shape * fade * fold * dim * side * uState.x * uLook.y;

    // The wash's shape: one broad bump, whole from WASH_RISE, dissolving long past the free edge, the folds
    // shallow and the rays a whisper over it.
    float washShape = smoothstep(0.0, WASH_RISE, vl) * (1.0 - smoothstep(WASH_RISE - 0.1, 1.0 + WASH_SOFT, vl));
    washShape *= mix(WASH_FOLD_FLOOR, 1.0, knot) * (1.0 + uLook.x * WASH_RAY * (ray - 0.5));
    float W = washShape * dim * side * uState.x * uLook.y;
    if (mix(I, W, uLook.z) <= 0.0) continue;

    // The colour: the stops across the width, the hue carried a little by the wave and the clock.
    vec3 lch = stopAt(ux + 0.1 * mix(w, wl, uLook.z) + 0.15 * depth + 0.04 * sin(uMotion.z + seed));

    // A wash on a light surface: the stop's hue at one high lightness and a share of its chroma, at an alpha
    // that follows the wash's shape.
    float a = min(1.0, W * uTone.x);
    vec3 washRgb = oklchToSrgb(vec3(uTone.y, min(lch.y * uTone.z, WASH_CHROMA_MAX), lch.z));
    vec4 wash = vec4(washRgb * a, a);

    // Light on a dark surface: the colour by the glow, half as much alpha, the brightest spots lifted toward white.
    float k = min(1.0, I * uTone.w);
    vec3 glowRgb = oklchToSrgb(vec3(lch.x + GLOW_LIFT * k * k, lch.y, lch.z));
    vec4 glow = vec4(glowRgb * k, k * 0.5);

    vec4 layer = mix(glow, wash, uLook.z);
    acc = layer + acc * (1.0 - layer.a);
  }
  gl_FragColor = acc;
}`;

const UNIFORMS = ['uSize', 'uScale', 'uAxis', 'uShape', 'uMotion', 'uLook', 'uState', 'uStops', 'uTone'] as const;

type AuroraUniform = (typeof UNIFORMS)[number];

class Renderer implements AuroraRenderer {
  private readonly program: WebGLProgram;
  private readonly quad: WebGLBuffer;
  private readonly uniforms: Record<AuroraUniform, WebGLUniformLocation | null>;
  private readonly stops = new Float32Array(9);

  constructor(private readonly gl: AuroraGLContext) {
    const quad = gl.createBuffer();
    if (!quad) throw new Error('aurora: no buffer');
    this.quad = quad;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const vertex = this.shader(gl.VERTEX_SHADER, VERTEX);
    const fragment = this.shader(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!program) throw new Error('aurora: no program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`aurora: program failed: ${log ?? ''}`);
    }
    this.program = program;
    const uniforms = {} as Record<AuroraUniform, WebGLUniformLocation | null>;
    for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
    this.uniforms = uniforms;
  }

  render(frame: AuroraFrame): void {
    const { gl, uniforms, stops } = this;
    gl.useProgram(this.program);
    gl.uniform2f(uniforms.uSize, frame.regionWidth, frame.regionHeight);
    gl.uniform1f(uniforms.uScale, frame.scale);
    gl.uniform2f(uniforms.uAxis, frame.edge, frame.mirror);
    gl.uniform4f(uniforms.uShape, frame.reach, frame.wave, frame.waveFrequency, frame.rayFrequency);
    gl.uniform4f(uniforms.uMotion, frame.waveTime, frame.rayTime, frame.hueTime, frame.layers);
    gl.uniform4f(uniforms.uLook, frame.rays, frame.glow, frame.light, frame.sideFade);
    gl.uniform4f(uniforms.uState, frame.introFade, frame.introReach, frame.driftAcross, frame.driftStretch);
    for (let i = 0; i < 3; i++) stops.set(frame.stops[i], i * 3);
    gl.uniform3fv(uniforms.uStops, stops);
    gl.uniform4f(uniforms.uTone, frame.washAlpha, frame.washLightness, frame.washChroma, frame.glowPeak);

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
    if (!shader) throw new Error('aurora: no shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`aurora: shader failed: ${log ?? ''}`);
    }
    return shader;
  }
}

/**
 * The attributes the canvas's context is asked for: premultiplied alpha,
 * which is what the pass writes, no antialiasing (the drawing is soft and
 * upscaled) and no buffer the pass does not use.
 */
const AURORA_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

/** A renderer on `gl`, or `null` where the shader will not compile or link. */
function createAuroraRenderer(gl: AuroraGLContext): AuroraRenderer | null {
  try {
    return new Renderer(gl);
  } catch {
    return null;
  }
}

export { AURORA_CONTEXT_ATTRIBUTES, UNIFORMS as AURORA_UNIFORMS, createAuroraRenderer };
export type { AuroraFrame, AuroraGLContext, AuroraRenderer, AuroraUniform };
