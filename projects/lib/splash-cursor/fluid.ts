/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 *
 * WebGL fluid simulation behind `<wr-splash-cursor>`. Port of the engine
 * used by reactbits.dev's SplashCursor (itself based on Pavel Dobryakov's
 * WebGL-Fluid-Simulation, MIT).
 *
 * Framework-free on purpose: `createFluidSimulation(canvas, config)` boots
 * the sim and returns a teardown, or `null` when WebGL isn't available.
 */

/* eslint-disable no-bitwise -- GL bitmasks + string hashing are inherently bitwise */

interface WrFluidConfig {
  readonly simResolution: number;
  readonly dyeResolution: number;
  readonly densityDissipation: number;
  readonly velocityDissipation: number;
  readonly pressure: number;
  readonly pressureIterations: number;
  readonly curl: number;
  readonly splatRadius: number;
  readonly splatForce: number;
  readonly shading: boolean;
  readonly colorUpdateSpeed: number;
  /** Cycle splat colours through the rainbow; `false` uses `color`. */
  readonly rainbow: boolean;
  /** Fixed splat colour (hex) when `rainbow` is off. */
  readonly color: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface TexFormat {
  readonly internalFormat: number;
  readonly format: number;
}

interface GlExt {
  readonly formatRGBA: TexFormat;
  readonly formatRG: TexFormat;
  readonly formatR: TexFormat;
  readonly halfFloatTexType: number;
  readonly supportLinearFiltering: boolean;
}

interface FBO {
  readonly texture: WebGLTexture;
  readonly fbo: WebGLFramebuffer;
  readonly width: number;
  readonly height: number;
  readonly texelSizeX: number;
  readonly texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

interface Pointer {
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  moved: boolean;
  color: RGB;
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type Uniforms = Record<string, WebGLUniformLocation | null>;

function createFluidSimulation(canvas: HTMLCanvasElement, config: WrFluidConfig): (() => void) | null {
  const ctx = getWebGLContext(canvas);
  if (!ctx) return null;
  const { gl, ext } = ctx;

  let dyeResolution = config.dyeResolution;
  let shading = config.shading;
  if (!ext.supportLinearFiltering) {
    dyeResolution = 256;
    shading = false;
  }

  let active = true;
  let rafId = 0;

  const pointer: Pointer = {
    texcoordX: 0,
    texcoordY: 0,
    prevTexcoordX: 0,
    prevTexcoordY: 0,
    deltaX: 0,
    deltaY: 0,
    moved: false,
    color: { r: 0, g: 0, b: 0 },
  };

  // ──────── Shader plumbing ────────

  function compile(type: number, source: string, keywords?: readonly string[]): WebGLShader {
    const prefixed = keywords ? keywords.map(k => `#define ${k}\n`).join('') + source : source;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, prefixed);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      // eslint-disable-next-line no-console -- GPU shader failures are otherwise invisible
      console.error('wr-splash-cursor shader error:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function link(vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      // eslint-disable-next-line no-console -- GPU link failures are otherwise invisible
      console.error('wr-splash-cursor program error:', gl.getProgramInfoLog(program));
    }
    return program;
  }

  function uniformsOf(program: WebGLProgram): Uniforms {
    const out: Uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)!.name;
      out[name] = gl.getUniformLocation(program, name);
    }
    return out;
  }

  class ShaderProgram {
    readonly program: WebGLProgram;
    readonly uniforms: Uniforms;

    constructor(vertex: WebGLShader, fragment: WebGLShader) {
      this.program = link(vertex, fragment);
      this.uniforms = uniformsOf(this.program);
    }

    bind(): void {
      gl.useProgram(this.program);
    }
  }

  /** Display shader with `#define`-keyword program variants. */
  class DisplayMaterial {
    private readonly programs = new Map<number, WebGLProgram>();
    private activeProgram: WebGLProgram | null = null;
    uniforms: Uniforms = {};

    constructor(
      private readonly vertex: WebGLShader,
      private readonly fragmentSource: string
    ) {}

    setKeywords(keywords: readonly string[]): void {
      let hash = 0;
      for (const k of keywords) hash += hashCode(k);
      let program = this.programs.get(hash);
      if (!program) {
        program = link(this.vertex, compile(gl.FRAGMENT_SHADER, this.fragmentSource, keywords));
        this.programs.set(hash, program);
      }
      if (program === this.activeProgram) return;
      this.uniforms = uniformsOf(program);
      this.activeProgram = program;
    }

    bind(): void {
      gl.useProgram(this.activeProgram);
    }
  }

  // ──────── Shaders ────────

  const baseVertexShader = compile(
    gl.VERTEX_SHADER,
    `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `
  );

  const copyShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
  `
  );

  const clearShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `
  );

  const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);

            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
        #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
  `;

  const splatShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
  `
  );

  const advectionShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
        #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
        #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
        #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }
  `,
    ext.supportLinearFiltering ? undefined : ['MANUAL_FILTERING']
  );

  const divergenceShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
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

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `
  );

  const curlShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
  `
  );

  const vorticityShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `
  );

  const pressureShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `
  );

  const gradientSubtractShader = compile(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `
  );

  // ──────── Fullscreen blit ────────

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  function blit(target: FBO | null, clear = false): void {
    if (target === null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // ──────── Framebuffers ────────

  function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number): number {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ): DoubleFBO {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value: FBO) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value: FBO) {
        fbo2 = value;
      },
      swap(): void {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  function resizeFBO(
    target: FBO,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ): FBO {
    const newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms['uTexture'], target.attach(0));
    blit(newFBO);
    return newFBO;
  }

  function resizeDoubleFBO(
    target: DoubleFBO,
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ): DoubleFBO {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1 / w;
    target.texelSizeY = 1 / h;
    return target;
  }

  // ──────── Programs + state ────────

  const copyProgram = new ShaderProgram(baseVertexShader, copyShader);
  const clearProgram = new ShaderProgram(baseVertexShader, clearShader);
  const splatProgram = new ShaderProgram(baseVertexShader, splatShader);
  const advectionProgram = new ShaderProgram(baseVertexShader, advectionShader);
  const divergenceProgram = new ShaderProgram(baseVertexShader, divergenceShader);
  const curlProgram = new ShaderProgram(baseVertexShader, curlShader);
  const vorticityProgram = new ShaderProgram(baseVertexShader, vorticityShader);
  const pressureProgram = new ShaderProgram(baseVertexShader, pressureShader);
  const gradientSubtractProgram = new ShaderProgram(baseVertexShader, gradientSubtractShader);
  const displayMaterial = new DisplayMaterial(baseVertexShader, displayShaderSource);

  let dye!: DoubleFBO;
  let velocity!: DoubleFBO;
  let divergence!: FBO;
  let curl!: FBO;
  let pressure!: DoubleFBO;

  function initFramebuffers(): void {
    const simRes = getResolution(config.simResolution);
    const dyeRes = getResolution(dyeResolution);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);

    dye = dye
      ? resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering)
      : createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    velocity = velocity
      ? resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering)
      : createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  displayMaterial.setKeywords(shading ? ['SHADING'] : []);
  initFramebuffers();
  let lastUpdateTime = Date.now();
  let colorUpdateTimer = 0;

  // ──────── Frame loop ────────

  function updateFrame(): void {
    if (!active) return;
    const dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render();
    rafId = requestAnimationFrame(updateFrame);
  }

  function calcDeltaTime(): number {
    const now = Date.now();
    const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
    lastUpdateTime = now;
    return dt;
  }

  function resizeCanvas(): boolean {
    const width = scaleByPixelRatio(canvas.clientWidth);
    const height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  function updateColors(dt: number): void {
    colorUpdateTimer += dt * config.colorUpdateSpeed;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
      pointer.color = generateColor();
    }
  }

  function applyInputs(): void {
    if (pointer.moved) {
      pointer.moved = false;
      splatPointer();
    }
  }

  function step(dt: number): void {
    gl.disable(gl.BLEND);
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms['uVelocity'], velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms['uVelocity'], velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms['uCurl'], curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms['curl'], config.curl);
    gl.uniform1f(vorticityProgram.uniforms['dt'], dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms['uVelocity'], velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms['uTexture'], pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms['value'], config.pressure);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms['uDivergence'], divergence.attach(0));
    for (let i = 0; i < config.pressureIterations; i++) {
      gl.uniform1i(pressureProgram.uniforms['uPressure'], pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradientSubtractProgram.bind();
    gl.uniform2f(gradientSubtractProgram.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientSubtractProgram.uniforms['uPressure'], pressure.read.attach(0));
    gl.uniform1i(gradientSubtractProgram.uniforms['uVelocity'], velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering) {
      gl.uniform2f(advectionProgram.uniforms['dyeTexelSize'], velocity.texelSizeX, velocity.texelSizeY);
    }
    const velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms['uVelocity'], velocityId);
    gl.uniform1i(advectionProgram.uniforms['uSource'], velocityId);
    gl.uniform1f(advectionProgram.uniforms['dt'], dt);
    gl.uniform1f(advectionProgram.uniforms['dissipation'], config.velocityDissipation);
    blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering) {
      gl.uniform2f(advectionProgram.uniforms['dyeTexelSize'], dye.texelSizeX, dye.texelSizeY);
    }
    gl.uniform1i(advectionProgram.uniforms['uVelocity'], velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms['uSource'], dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms['dissipation'], config.densityDissipation);
    blit(dye.write);
    dye.swap();
  }

  function render(): void {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    displayMaterial.bind();
    if (shading) {
      gl.uniform2f(displayMaterial.uniforms['texelSize'], 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    }
    gl.uniform1i(displayMaterial.uniforms['uTexture'], dye.read.attach(0));
    blit(null);
  }

  // ──────── Splats ────────

  function splatPointer(): void {
    const dx = pointer.deltaX * config.splatForce;
    const dy = pointer.deltaY * config.splatForce;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  function clickSplat(): void {
    const color = generateColor();
    color.r *= 10;
    color.g *= 10;
    color.b *= 10;
    const dx = 10 * (Math.random() - 0.5);
    const dy = 30 * (Math.random() - 0.5);
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
  }

  function splat(x: number, y: number, dx: number, dy: number, color: RGB): void {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms['uTarget'], velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms['aspectRatio'], canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms['point'], x, y);
    gl.uniform3f(splatProgram.uniforms['color'], dx, dy, 0);
    gl.uniform1f(splatProgram.uniforms['radius'], correctRadius(config.splatRadius / 100));
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms['uTarget'], dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms['color'], color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function correctRadius(radius: number): number {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio > 1 ? radius * aspectRatio : radius;
  }

  // ──────── Pointer ────────

  function pointerDown(posX: number, posY: number): void {
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  }

  function pointerMove(posX: number, posY: number, color: RGB): void {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  function correctDeltaX(delta: number): number {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio < 1 ? delta * aspectRatio : delta;
  }

  function correctDeltaY(delta: number): number {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio > 1 ? delta / aspectRatio : delta;
  }

  // ──────── Colours ────────

  function hexToRGB(hex: string): RGB {
    let val = hex.replace('#', '');
    if (val.length === 3) val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
    return {
      r: (Number.parseInt(val.slice(0, 2), 16) / 255) * 0.15,
      g: (Number.parseInt(val.slice(2, 4), 16) / 255) * 0.15,
      b: (Number.parseInt(val.slice(4, 6), 16) / 255) * 0.15,
    };
  }

  function generateColor(): RGB {
    if (!config.rainbow) return hexToRGB(config.color);
    const c = hsvToRgb(Math.random(), 1, 1);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }

  function hsvToRgb(h: number, s: number, v: number): RGB {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        return { r: v, g: t, b: p };
      case 1:
        return { r: q, g: v, b: p };
      case 2:
        return { r: p, g: v, b: t };
      case 3:
        return { r: p, g: q, b: v };
      case 4:
        return { r: t, g: p, b: v };
      default:
        return { r: v, g: p, b: q };
    }
  }

  function wrap(value: number, min: number, max: number): number {
    const range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  }

  function getResolution(resolution: number): { width: number; height: number } {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  }

  function scaleByPixelRatio(input: number): number {
    return Math.floor(input * (window.devicePixelRatio || 1));
  }

  function hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // ──────── Events + boot ────────

  let firstMoveHandled = false;

  const onMouseDown = (e: MouseEvent): void => {
    pointerDown(scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY));
    clickSplat();
  };

  const onMouseMove = (e: MouseEvent): void => {
    const posX = scaleByPixelRatio(e.clientX);
    const posY = scaleByPixelRatio(e.clientY);
    const color = firstMoveHandled ? pointer.color : generateColor();
    firstMoveHandled = true;
    pointerMove(posX, posY, color);
  };

  const onTouchStart = (e: TouchEvent): void => {
    const t = e.targetTouches[0];
    if (t) pointerDown(scaleByPixelRatio(t.clientX), scaleByPixelRatio(t.clientY));
  };

  const onTouchMove = (e: TouchEvent): void => {
    const t = e.targetTouches[0];
    if (t) pointerMove(scaleByPixelRatio(t.clientX), scaleByPixelRatio(t.clientY), pointer.color);
  };

  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  updateFrame();

  return () => {
    active = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

// ──────── WebGL context bootstrap ────────

function getWebGLContext(canvas: HTMLCanvasElement): { gl: GL; ext: GlExt } | null {
  const params: WebGLContextAttributes = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };

  const gl2 = canvas.getContext('webgl2', params);
  const gl = gl2 ?? canvas.getContext('webgl', params);
  if (!gl) return null;
  const isWebGL2 = !!gl2;

  let halfFloat: OES_texture_half_float | null = null;
  let supportLinearFiltering: boolean;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
  }
  gl.clearColor(0, 0, 0, 1);

  const halfFloatTexType = isWebGL2
    ? (gl as WebGL2RenderingContext).HALF_FLOAT
    : (halfFloat?.HALF_FLOAT_OES ?? gl.UNSIGNED_BYTE);

  let formatRGBA: TexFormat | null;
  let formatRG: TexFormat | null;
  let formatR: TexFormat | null;
  if (isWebGL2) {
    const g2 = gl as WebGL2RenderingContext;
    formatRGBA = getSupportedFormat(g2, g2.RGBA16F, g2.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(g2, g2.RG16F, g2.RG, halfFloatTexType);
    formatR = getSupportedFormat(g2, g2.R16F, g2.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = formatRGBA;
    formatR = formatRGBA;
  }
  if (!formatRGBA || !formatRG || !formatR) return null;

  return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
}

function getSupportedFormat(gl: GL, internalFormat: number, format: number, type: number): TexFormat | null {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    const g2 = gl as WebGL2RenderingContext;
    switch (internalFormat) {
      case g2.R16F:
        return getSupportedFormat(gl, g2.RG16F, g2.RG, type);
      case g2.RG16F:
        return getSupportedFormat(gl, g2.RGBA16F, g2.RGBA, type);
      default:
        return null;
    }
  }
  return { internalFormat, format };
}

function supportRenderTextureFormat(gl: GL, internalFormat: number, format: number, type: number): boolean {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}

export { createFluidSimulation };
export type { WrFluidConfig };
