/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The stable-fluids solver `<wr-fluid-cursor>` runs on the GPU: a velocity
 * field on a small grid and a dye field on a finer one, each a pair of
 * half-float textures drawn into by turns, and one full-screen pass per
 * step of the method. A step is: the curl of the velocity, the vorticity
 * confinement that feeds it back as swirl, the divergence, a damped Jacobi
 * solve for the pressure, the pressure gradient taken off, then the velocity
 * and the dye carried along the flow (semi-Lagrangian: each texel reads
 * where it came from) and decayed. The pointer enters as splats, a Gaussian
 * of momentum and of dye. The display pass maps the dye to colour and
 * coverage and is the only one that draws to the canvas.
 *
 * Every number in here is in grid units: a velocity is in velocity-grid
 * texels per second, so the advection of both fields displaces by `velocity
 * * dt * velocityTexel` in texture space, which is isotropic because both
 * grids keep the region's aspect ratio. A splat's point is in texture
 * space, its radius in CSS px, and the shader measures the distance in CSS px
 * through the region's size, so a splat is round whatever the grid.
 *
 * Written against WebGL2 with `EXT_color_buffer_float`, or WebGL1 with the
 * half-float texture, linear-filtering and half-float render-target
 * extensions; the shaders are GLSL ES 1.00, which both accept. Where neither
 * is there, `createFluidSim` returns `null` and the component draws nothing.
 */

type FluidGLContext = WebGLRenderingContext | WebGL2RenderingContext;

/** The passes, in the order their programs are compiled. */
const FLUID_PASSES = [
  'advect',
  'curl',
  'vorticity',
  'divergence',
  'scale',
  'pressure',
  'gradient',
  'splat',
  'display',
] as const;

type FluidPass = (typeof FLUID_PASSES)[number];

/** What one step of the solver needs beyond the time. */
interface FluidStepParams {
  /** The dye's and the velocity's decay rates, per second. */
  readonly dyeDecay: number;
  readonly velocityDecay: number;
  /** The vorticity confinement strength. */
  readonly swirl: number;
  /** Jacobi iterations of the pressure solve. */
  readonly iterations: number;
}

/** How the display pass paints the dye. */
interface FluidDisplayParams {
  /** Whether the surface is light, so the dye covers it as ink; on a dark one it is lit a little more. */
  readonly ink: boolean;
  /** Whether the dye is shaded by its own gradient, 0 or 1. */
  readonly shading: number;
}

interface FluidSim {
  /** Sizes or resizes the grids; the fields start empty. */
  resize(simWidth: number, simHeight: number, dyeWidth: number, dyeHeight: number): void;
  /** Tells the solver the region's CSS size, which the splat radius is measured in. */
  size(width: number, height: number): void;
  /**
   * Adds a Gaussian of momentum `vx`, `vy` (velocity texels per second) and of
   * dye `r`, `g`, `b` at the point `x`, `y` (texture space, origin bottom
   * left), `radius` CSS px to its 1/e edge.
   */
  splat(x: number, y: number, vx: number, vy: number, r: number, g: number, b: number, radius: number): void;
  /** Moves the fields `dt` seconds on. */
  step(dt: number, params: FluidStepParams): void;
  /** Paints the dye onto the canvas, `width` by `height` device px. */
  render(width: number, height: number, params: FluidDisplayParams): void;
  /** Empties every field and the canvas. */
  clear(): void;
  /** Frees every program, texture and framebuffer. */
  destroy(): void;
}

interface Target {
  readonly texture: WebGLTexture;
  readonly framebuffer: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
  readonly texelX: number;
  readonly texelY: number;
}

interface Pair {
  read: Target;
  write: Target;
}

interface Program {
  readonly program: WebGLProgram;
  readonly uniforms: Record<string, WebGLUniformLocation | null>;
}

interface Formats {
  readonly internalFormat: number;
  readonly format: number;
  readonly type: number;
}

const VERTEX = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 uTexelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexelSize.x, 0.0);
  vR = vUv + vec2(uTexelSize.x, 0.0);
  vT = vUv + vec2(0.0, uTexelSize.y);
  vB = vUv - vec2(0.0, uTexelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const HEADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
`;

/** Each texel reads the field where it was `dt` ago, and the field decays. */
const ADVECT = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexel;
uniform float uDt;
uniform float uDecay;
void main () {
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  vec2 from = vUv - uDt * velocity * uVelocityTexel;
  gl_FragColor = texture2D(uSource, from) * exp(-uDecay * uDt);
}`;

/** The vorticity: the curl of a plane field, one scalar. */
const CURL = `${HEADER}
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
}`;

/**
 * Vorticity confinement: a push along the normalised gradient of the
 * vorticity's magnitude, turned by the vorticity's sign, so the eddies the
 * grid smooths away are fed back instead.
 */
const VORTICITY = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uSwirl;
uniform float uDt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(L) - abs(R));
  force /= length(force) + 0.0001;
  force *= uSwirl * C;
  vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDt;
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

/** The divergence, with the region's edge as a wall: the velocity beyond it is the mirror of the one inside. */
const DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

/** A field scaled: the pressure is damped between frames, so the solve starts warm but not stale. */
const SCALE = `${HEADER}
uniform sampler2D uSource;
uniform float uScale;
void main () {
  gl_FragColor = uScale * texture2D(uSource, vUv);
}`;

/** One Jacobi iteration of the pressure Poisson equation. */
const PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

/** The pressure gradient taken off the velocity, which leaves it divergence-free. */
const GRADIENT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

/** A Gaussian of `uColor` added at `uPoint`, its radius in CSS px, so it is round on any grid. */
const SPLAT = `${HEADER}
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
uniform vec2 uSize;
void main () {
  vec2 p = (vUv - uPoint) * uSize;
  float g = exp(-dot(p, p) / (uRadius * uRadius));
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + uColor * g, 1.0);
}`;

/**
 * The dye to the canvas. The densest channel is the ink's density: its
 * coverage is a soft saturation of that, and its colour the dye's channels
 * normalised, so a thick ink is the full colour and a thin one a tint of it,
 * never a darker or a lighter one. On a dark surface the coverage rises
 * faster, so a thin strand still shows. Shading lights the density's
 * gradient from the top left, a slight relief.
 */
const DISPLAY = `${HEADER}
uniform sampler2D uDye;
uniform float uInk;
uniform float uShading;
float density (vec2 uv) {
  vec3 c = texture2D(uDye, uv).rgb;
  return max(c.r, max(c.g, c.b));
}
void main () {
  vec3 c = texture2D(uDye, vUv).rgb;
  float d = max(c.r, max(c.g, c.b));
  vec3 chroma = c / max(d, 0.0001);
  // Ink on a light ground covers at most most of it, so the text over it reads; on a dark ground the
  // thin end is pulled down, so a trail goes out crisply instead of hanging as haze.
  float alpha = mix(0.95 * pow(1.0 - exp(-d * 4.5), 2.0), 0.85 * (1.0 - exp(-d * 2.2)), uInk);
  if (uShading > 0.0) {
    float dx = density(vR) - density(vL);
    float dy = density(vT) - density(vB);
    vec3 n = normalize(vec3(-dx, -dy, 0.35));
    float light = clamp(dot(n, normalize(vec3(-0.6, 0.8, 0.9))), 0.0, 1.0);
    chroma *= mix(1.0, mix(0.86 + 0.28 * light, 0.72 + 0.5 * light, uInk), uShading);
  }
  gl_FragColor = vec4(chroma, alpha);
}`;

const SOURCES: Readonly<Record<FluidPass, string>> = {
  advect: ADVECT,
  curl: CURL,
  vorticity: VORTICITY,
  divergence: DIVERGENCE,
  scale: SCALE,
  pressure: PRESSURE,
  gradient: GRADIENT,
  splat: SPLAT,
  display: DISPLAY,
};

/** How much of the pressure survives into the next frame's solve. */
const PRESSURE_KEEP = 0.8;

const UNIFORM = /uniform\s+\w+\s+(\w+)\s*;/g;

class Sim implements FluidSim {
  private readonly programs: Readonly<Record<FluidPass, Program>>;
  private readonly quad: WebGLBuffer;
  private velocity: Pair | null = null;
  private dye: Pair | null = null;
  private pressure: Pair | null = null;
  private curl: Target | null = null;
  private divergence: Target | null = null;
  private cssWidth = 1;
  private cssHeight = 1;

  constructor(
    private readonly gl: FluidGLContext,
    private readonly formats: Formats
  ) {
    const quad = gl.createBuffer();
    if (!quad) throw new Error('fluid: no buffer');
    this.quad = quad;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    const vertex = this.shader(gl.VERTEX_SHADER, VERTEX);
    const programs = {} as Record<FluidPass, Program>;
    for (const pass of FLUID_PASSES) programs[pass] = this.program(vertex, SOURCES[pass]);
    gl.deleteShader(vertex);
    this.programs = programs;
  }

  resize(simWidth: number, simHeight: number, dyeWidth: number, dyeHeight: number): void {
    this.release();
    this.velocity = this.pair(simWidth, simHeight);
    this.pressure = this.pair(simWidth, simHeight);
    this.curl = this.target(simWidth, simHeight);
    this.divergence = this.target(simWidth, simHeight);
    this.dye = this.pair(dyeWidth, dyeHeight);
  }

  size(width: number, height: number): void {
    this.cssWidth = Math.max(1, width);
    this.cssHeight = Math.max(1, height);
  }

  splat(x: number, y: number, vx: number, vy: number, r: number, g: number, b: number, radius: number): void {
    const { gl, velocity, dye } = this;
    if (!velocity || !dye) return;
    const { program, uniforms } = this.programs.splat;
    gl.useProgram(program);
    gl.uniform2f(uniforms['uPoint'], x, y);
    gl.uniform1f(uniforms['uRadius'], radius);
    gl.uniform2f(uniforms['uSize'], this.cssWidth, this.cssHeight);

    gl.uniform2f(uniforms['uTexelSize'], velocity.read.texelX, velocity.read.texelY);
    gl.uniform3f(uniforms['uColor'], vx, vy, 0);
    this.bind(uniforms['uTarget'], velocity.read, 0);
    this.blit(velocity.write);
    swap(velocity);

    gl.uniform2f(uniforms['uTexelSize'], dye.read.texelX, dye.read.texelY);
    gl.uniform3f(uniforms['uColor'], r, g, b);
    this.bind(uniforms['uTarget'], dye.read, 0);
    this.blit(dye.write);
    swap(dye);
  }

  step(dt: number, params: FluidStepParams): void {
    const { gl, velocity, dye, pressure, curl, divergence } = this;
    if (!velocity || !dye || !pressure || !curl || !divergence) return;
    const texel = (loc: WebGLUniformLocation | null): void =>
      gl.uniform2f(loc, velocity.read.texelX, velocity.read.texelY);

    let p = this.programs.curl;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    this.bind(p.uniforms['uVelocity'], velocity.read, 0);
    this.blit(curl);

    p = this.programs.vorticity;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    gl.uniform1f(p.uniforms['uSwirl'], params.swirl);
    gl.uniform1f(p.uniforms['uDt'], dt);
    this.bind(p.uniforms['uVelocity'], velocity.read, 0);
    this.bind(p.uniforms['uCurl'], curl, 1);
    this.blit(velocity.write);
    swap(velocity);

    p = this.programs.divergence;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    this.bind(p.uniforms['uVelocity'], velocity.read, 0);
    this.blit(divergence);

    p = this.programs.scale;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    gl.uniform1f(p.uniforms['uScale'], PRESSURE_KEEP);
    this.bind(p.uniforms['uSource'], pressure.read, 0);
    this.blit(pressure.write);
    swap(pressure);

    p = this.programs.pressure;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    this.bind(p.uniforms['uDivergence'], divergence, 1);
    for (let i = 0; i < params.iterations; i++) {
      this.bind(p.uniforms['uPressure'], pressure.read, 0);
      this.blit(pressure.write);
      swap(pressure);
    }

    p = this.programs.gradient;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    this.bind(p.uniforms['uPressure'], pressure.read, 0);
    this.bind(p.uniforms['uVelocity'], velocity.read, 1);
    this.blit(velocity.write);
    swap(velocity);

    p = this.programs.advect;
    gl.useProgram(p.program);
    texel(p.uniforms['uTexelSize']);
    texel(p.uniforms['uVelocityTexel']);
    gl.uniform1f(p.uniforms['uDt'], dt);
    gl.uniform1f(p.uniforms['uDecay'], params.velocityDecay);
    this.bind(p.uniforms['uVelocity'], velocity.read, 0);
    this.bind(p.uniforms['uSource'], velocity.read, 1);
    this.blit(velocity.write);
    swap(velocity);

    gl.uniform2f(p.uniforms['uTexelSize'], dye.read.texelX, dye.read.texelY);
    gl.uniform1f(p.uniforms['uDecay'], params.dyeDecay);
    this.bind(p.uniforms['uVelocity'], velocity.read, 0);
    this.bind(p.uniforms['uSource'], dye.read, 1);
    this.blit(dye.write);
    swap(dye);
  }

  render(width: number, height: number, params: FluidDisplayParams): void {
    const { gl, dye } = this;
    if (!dye) return;
    const { program, uniforms } = this.programs.display;
    gl.useProgram(program);
    gl.uniform2f(uniforms['uTexelSize'], dye.read.texelX, dye.read.texelY);
    gl.uniform1f(uniforms['uInk'], params.ink ? 1 : 0);
    gl.uniform1f(uniforms['uShading'], params.shading);
    this.bind(uniforms['uDye'], dye.read, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.draw();
  }

  clear(): void {
    const { gl } = this;
    gl.clearColor(0, 0, 0, 0);
    for (const target of this.targets()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  destroy(): void {
    const { gl } = this;
    this.release();
    for (const pass of FLUID_PASSES) gl.deleteProgram(this.programs[pass].program);
    gl.deleteBuffer(this.quad);
  }

  // Resources

  private release(): void {
    const { gl } = this;
    for (const target of this.targets()) {
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }
    this.velocity = this.dye = this.pressure = null;
    this.curl = this.divergence = null;
  }

  private targets(): Target[] {
    const out: Target[] = [];
    for (const pair of [this.velocity, this.dye, this.pressure]) if (pair) out.push(pair.read, pair.write);
    for (const one of [this.curl, this.divergence]) if (one) out.push(one);
    return out;
  }

  private pair(width: number, height: number): Pair {
    return { read: this.target(width, height), write: this.target(width, height) };
  }

  private target(width: number, height: number): Target {
    const { gl, formats } = this;
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error('fluid: no texture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, formats.internalFormat, width, height, 0, formats.format, formats.type, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer, width, height, texelX: 1 / width, texelY: 1 / height };
  }

  // Drawing

  private bind(location: WebGLUniformLocation | null, target: Target, unit: number): void {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.uniform1i(location, unit);
  }

  private blit(target: Target): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    this.draw();
  }

  private draw(): void {
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Programs

  private shader(kind: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(kind);
    if (!shader) throw new Error('fluid: no shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`fluid: shader failed: ${log ?? ''}`);
    }
    return shader;
  }

  private program(vertex: WebGLShader, source: string): Program {
    const { gl } = this;
    const fragment = this.shader(gl.FRAGMENT_SHADER, source);
    const program = gl.createProgram();
    if (!program) throw new Error('fluid: no program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`fluid: program failed: ${log ?? ''}`);
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const text of [VERTEX, source]) {
      for (const match of text.matchAll(UNIFORM)) uniforms[match[1]] = gl.getUniformLocation(program, match[1]);
    }
    return { program, uniforms };
  }
}

function swap(pair: Pair): void {
  const read = pair.read;
  pair.read = pair.write;
  pair.write = read;
}

/** The half-float render-target formats the context offers, or `null` where it offers none. */
function formats(gl: FluidGLContext): Formats | null {
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (gl2) {
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null;
    return { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
  }
  const half = gl.getExtension('OES_texture_half_float');
  if (!half || !gl.getExtension('OES_texture_half_float_linear')) return null;
  gl.getExtension('EXT_color_buffer_half_float');
  return { internalFormat: gl.RGBA, format: gl.RGBA, type: half.HALF_FLOAT_OES };
}

/**
 * The attributes the canvas's context is asked for: straight alpha, so the
 * display pass writes a colour and a coverage and the page composites them,
 * and no buffer the solver does not use.
 */
const FLUID_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

/**
 * A solver on `gl`, or `null` where the context cannot render into half-float
 * textures: the formats are probed first, then a trial target is checked for
 * completeness, since an extension listed is not a target that works.
 */
function createFluidSim(gl: FluidGLContext): FluidSim | null {
  const found = formats(gl);
  if (!found) return null;
  let sim: Sim;
  try {
    sim = new Sim(gl, found);
    sim.resize(2, 2, 2, 2);
  } catch {
    return null;
  }
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) {
    sim.destroy();
    return null;
  }
  return sim;
}

export { FLUID_PASSES, FLUID_CONTEXT_ATTRIBUTES, createFluidSim };
export type { FluidGLContext, FluidPass, FluidStepParams, FluidDisplayParams, FluidSim };
