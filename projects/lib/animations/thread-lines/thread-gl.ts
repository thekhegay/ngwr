/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { COUNT_MAX, PART_STRETCH, PATH_TURNS_MAX, TEXTURE_ROWS } from './thread-model';

/**
 * The one pass `<wr-thread-lines>` draws: a full-screen quad whose fragment
 * shader walks every strand of the bundle and adds up how much of each lies
 * under the pixel. A strand is a curve across the region, defined where it is
 * sampled rather than as geometry: its place across the bundle (its slot)
 * times the bundle's half width at that point along, plus a path of its own
 * that opens with the fray, plus the travelling wave the whole bundle rides,
 * lagged a little by slot so neighbours move almost together, plus the push
 * of the pointer. The pixel's distance to the curve, in device px, is turned
 * into a crisp anti-aliased core and a faint wider glow; the colour is the
 * main one in the middle of the bundle and the accent toward its edges; the
 * sum is laid as straight coverage, so it reads as ink on a light surface
 * and as light on a dark one.
 *
 * The per-strand constants come in as a byte texture written by the model
 * (`threadStrandTexture`), so a frame uploads a handful of uniforms and
 * nothing else. GLSL ES 1.00, which WebGL1 and WebGL2 both accept; the loop
 * bound is the model's `COUNT_MAX`, with a break at the live count.
 */

type ThreadGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/** What one frame needs, every length in CSS px unless said otherwise. */
interface ThreadFrame {
  /** The canvas, in device px. */
  width: number;
  height: number;
  /** CSS px per device px: the inverse of the render ratio. */
  scale: number;
  /** The region's CSS size. */
  regionWidth: number;
  regionHeight: number;
  /** The ribbon's tilt, as its axis's cos and sin, and the ribbon's length along that axis. */
  cos: number;
  sin: number;
  length: number;
  /** -1 under RTL, so the gathered end sits at the inline start; 1 otherwise. */
  mirror: number;
  /** The bundle's half width at the gathered end and how far it opens by the far end, and the fray curve's power. */
  gather: number;
  spread: number;
  power: number;
  /** Where the bundle's centre line sits across the region at the gathered end and at the far one, from the region's middle. */
  centreStart: number;
  centreEnd: number;
  /** How far a strand's own path bends at the far end. */
  path: number;
  /** The travelling wave: its height, the two harmonics' wavenumbers (radians per unit length) and their phases now. */
  amplitude: number;
  wave1: number;
  wave2: number;
  phase1: number;
  phase2: number;
  /** A strand's half thickness in device px, and how many strands are live. */
  thickness: number;
  count: number;
  /** The main and the accent colour, 0..1 sRGB. */
  color: Float32Array;
  accent: Float32Array;
  /** How much of the core's colour a strand lays, and how much glow it has at its edge. */
  core: number;
  glow: number;
  /** Where the parting is centred along and across the ribbon, how far it pushes at its heart and how far it reaches. */
  pointerAlong: number;
  pointerAcross: number;
  push: number;
  radius: number;
}

interface ThreadRenderer {
  /** The strands' constants, `count` texels wide, as `threadStrandTexture` lays them. */
  strands(data: Uint8Array, count: number): void;
  /** Draws the frame onto the canvas. */
  render(frame: ThreadFrame): void;
  /** Frees the program, the quad and the texture. */
  destroy(): void;
}

const VERTEX = `
attribute vec2 aPosition;
void main () {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/**
 * The one fragment pass. `u` runs 0 at the gathered end to 1 at the far
 * edge; `across` is the pixel's offset from the ribbon's axis. Every strand
 * is evaluated at the pixel's `u`, the distance to it taken across the
 * ribbon, and the coverage summed; the output is premultiplied.
 */
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
const int COUNT_MAX = ${COUNT_MAX};
const float TWO_PI = 6.283185307;
const float TURNS_MAX = ${PATH_TURNS_MAX.toFixed(3)};
const float STRETCH = ${PART_STRETCH.toFixed(3)};
uniform vec2 uSize;
uniform float uScale;
uniform vec3 uAxis;
uniform float uMirror;
uniform vec3 uWidths;
uniform vec2 uCentre;
uniform float uPath;
uniform vec3 uWave;
uniform vec2 uPhase;
uniform float uThickness;
uniform float uCount;
uniform sampler2D uStrands;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec2 uInk;
uniform vec4 uPointer;

void main () {
  // The pixel in CSS px from the region's middle, y down, then in the ribbon's frame.
  vec2 p = vec2(gl_FragCoord.x * uScale, uSize.y - gl_FragCoord.y * uScale) - uSize * 0.5;
  float along = (p.x * uAxis.x + p.y * uAxis.y) * uMirror;
  float across = -p.x * uAxis.y + p.y * uAxis.x;
  float u = along / uAxis.z + 0.5;
  float t = clamp(u, 0.0, 1.0);
  // Faded in slowly from the gathered end, where the strands pile into one, and out at the far edge.
  float taper = smoothstep(0.0, 0.3, u) * (1.0 - smoothstep(0.78, 1.0, u));
  if (taper <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // The bundle's shape here, and how fast it changes along the ribbon (the d* terms, per CSS px).
  float inside = (u > 0.0 && u < 1.0) ? 1.0 / uAxis.z : 0.0;
  float fray = pow(t, uWidths.z);
  float dfray = uWidths.z * pow(t, uWidths.z - 1.0) * inside;
  float width = uWidths.x + uWidths.y * fray;
  float dwidth = uWidths.y * dfray;
  float ease = t * t * (3.0 - 2.0 * t);
  float dease = 6.0 * t * (1.0 - t) * inside;
  float centre = mix(uCentre.x, uCentre.y, ease);
  float dcentre = (uCentre.y - uCentre.x) * dease;
  // The cord barely moves; the frayed end rides the whole wave.
  float swing = uWave.x * mix(0.3, 1.0, ease);
  float dswing = uWave.x * 0.7 * dease;
  float s1 = sin(uWave.y * u - uPhase.x);
  float c1 = cos(uWave.y * u - uPhase.x);
  float s2 = sin(uWave.z * u - uPhase.y);
  float c2 = cos(uWave.z * u - uPhase.y);
  float k1 = uWave.y / uAxis.z;
  float k2 = uWave.z / uAxis.z;

  // Nothing of the bundle can reach this pixel: the strands' furthest reach, the glow's and the push's.
  float reach = width + abs(uPath) * fray + swing * 1.45 + abs(uPointer.z) + 25.0 * uScale;
  if (abs(across - centre) > reach) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Where the strands lie closer than two lines' width they are thinned, so the cord is a cord and not a bar.
  float crowd = clamp(width / (uCount * uThickness * uScale * 2.0), 0.05, 1.0);
  float weight = taper * crowd;
  float radius2 = uPointer.w * uPointer.w;
  float soft2 = radius2 * 0.02;
  float du = along - uPointer.x;
  float dq = 2.0 * du / (STRETCH * STRETCH * radius2);

  float texel = 1.0 / uCount;
  float sumA = 0.0;
  vec3 sumC = vec3(0.0);
  for (int i = 0; i < COUNT_MAX; i++) {
    if (float(i) >= uCount) break;
    float x = (float(i) + 0.5) * texel;
    vec4 a = texture2D(uStrands, vec2(x, 0.25));
    vec4 b = texture2D(uStrands, vec2(x, 0.75));
    float slot = (a.r * 65280.0 + a.g * 255.0) / 65535.0 * 2.0 - 1.0;
    float turns = a.a * TURNS_MAX;
    float lc = b.g * 2.0 - 1.0;
    float ls = b.b * 2.0 - 1.0;
    // The wave at this strand's lag, and the second harmonic at twice it, by the angle sums; and its slope.
    float lc2 = 2.0 * lc * lc - 1.0;
    float ls2 = 2.0 * lc * ls;
    float wave = (s1 * lc + c1 * ls) + 0.45 * (s2 * lc2 + c2 * ls2);
    float dwave = k1 * (c1 * lc - s1 * ls) + 0.45 * k2 * (c2 * lc2 - s2 * ls2);
    float own = sin(turns * u + b.r * TWO_PI);
    float y = centre + slot * width + own * fray * uPath + wave * swing;
    float slope = dcentre + slot * dwidth + own * dfray * uPath + dwave * swing + wave * dswing;

    // The pointer: a squared bell, drawn out along the ribbon, pushing the strand away across it.
    float dv = y - uPointer.y;
    float q = (dv * dv + du * du / (STRETCH * STRETCH)) / radius2;
    float bell = max(0.0, 1.0 - q);
    float inv = inversesqrt(dv * dv + soft2);
    float push = bell * bell * uPointer.z * dv * inv;
    y += push;
    // The push steepens a strand where it rises along the ribbon, and stretches its slope across it.
    float dpush = -2.0 * bell * dq * uPointer.z * dv * inv;
    float gain = bell * uPointer.z * inv * (bell * soft2 * inv * inv - 4.0 * dv * dv / radius2);
    slope = slope * (1.0 + gain) + dpush;

    // The distance to the strand, in device px, measured square to it rather than straight across.
    float dist = abs(across - y) * inversesqrt(1.0 + slope * slope) / uScale;
    float core = clamp(uThickness + 0.5 - dist, 0.0, 1.0);
    float glow = exp(-dist * 0.22);
    float w = weight * a.b * (1.0 - 0.55 * slot * slot);
    float cover = w * (core * uInk.x + glow * uInk.y);
    sumA += cover;
    sumC += cover * mix(uColor, uAccent, 0.9 * smoothstep(0.3, 1.0, abs(slot)));
  }
  float alpha = 1.0 - exp(-sumA);
  vec3 rgb = sumC / max(sumA, 0.0001);
  gl_FragColor = vec4(rgb * alpha, alpha);
}`;

const UNIFORMS = [
  'uSize',
  'uScale',
  'uAxis',
  'uMirror',
  'uWidths',
  'uCentre',
  'uPath',
  'uWave',
  'uPhase',
  'uThickness',
  'uCount',
  'uStrands',
  'uColor',
  'uAccent',
  'uInk',
  'uPointer',
] as const;

type ThreadUniform = (typeof UNIFORMS)[number];

class Renderer implements ThreadRenderer {
  private readonly program: WebGLProgram;
  private readonly quad: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly uniforms: Record<ThreadUniform, WebGLUniformLocation | null>;

  constructor(private readonly gl: ThreadGLContext) {
    const quad = gl.createBuffer();
    const texture = gl.createTexture();
    if (!quad || !texture) throw new Error('thread-lines: no buffer');
    this.quad = quad;
    this.texture = texture;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const vertex = this.shader(gl.VERTEX_SHADER, VERTEX);
    const fragment = this.shader(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!program) throw new Error('thread-lines: no program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`thread-lines: program failed: ${log ?? ''}`);
    }
    this.program = program;
    const uniforms = {} as Record<ThreadUniform, WebGLUniformLocation | null>;
    for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
    this.uniforms = uniforms;
  }

  strands(data: Uint8Array, count: number): void {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, count, TEXTURE_ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  render(frame: ThreadFrame): void {
    const { gl, uniforms } = this;
    gl.useProgram(this.program);
    gl.uniform2f(uniforms.uSize, frame.regionWidth, frame.regionHeight);
    gl.uniform1f(uniforms.uScale, frame.scale);
    gl.uniform3f(uniforms.uAxis, frame.cos, frame.sin, frame.length);
    gl.uniform1f(uniforms.uMirror, frame.mirror);
    gl.uniform3f(uniforms.uWidths, frame.gather, frame.spread, frame.power);
    gl.uniform2f(uniforms.uCentre, frame.centreStart, frame.centreEnd);
    gl.uniform1f(uniforms.uPath, frame.path);
    gl.uniform3f(uniforms.uWave, frame.amplitude, frame.wave1, frame.wave2);
    gl.uniform2f(uniforms.uPhase, frame.phase1, frame.phase2);
    gl.uniform1f(uniforms.uThickness, frame.thickness);
    gl.uniform1f(uniforms.uCount, frame.count);
    gl.uniform3f(uniforms.uColor, frame.color[0], frame.color[1], frame.color[2]);
    gl.uniform3f(uniforms.uAccent, frame.accent[0], frame.accent[1], frame.accent[2]);
    gl.uniform2f(uniforms.uInk, frame.core, frame.glow);
    gl.uniform4f(uniforms.uPointer, frame.pointerAlong, frame.pointerAcross, frame.push, frame.radius);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(uniforms.uStrands, 0);

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
    gl.deleteTexture(this.texture);
    gl.deleteBuffer(this.quad);
    gl.deleteProgram(this.program);
  }

  private shader(kind: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(kind);
    if (!shader) throw new Error('thread-lines: no shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`thread-lines: shader failed: ${log ?? ''}`);
    }
    return shader;
  }
}

/**
 * The attributes the canvas's context is asked for: premultiplied alpha,
 * which is what the pass writes, no antialiasing (the shader does its own)
 * and no buffer the pass does not use.
 */
const THREAD_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

/** A renderer on `gl`, or `null` where the shader will not compile or link. */
function createThreadRenderer(gl: ThreadGLContext): ThreadRenderer | null {
  try {
    return new Renderer(gl);
  } catch {
    return null;
  }
}

export { THREAD_CONTEXT_ATTRIBUTES, UNIFORMS as THREAD_UNIFORMS, createThreadRenderer };
export type { ThreadFrame, ThreadGLContext, ThreadRenderer, ThreadUniform };
