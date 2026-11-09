import { Directionality } from '@angular/cdk/bidi';
import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MAX_DPR, MAX_FRAME_MS } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THREAD_CONTEXT_ATTRIBUTES, THREAD_UNIFORMS, createThreadRenderer } from './thread-gl';
import { PART_RADIUS, WrThreadLines } from './thread-lines';
import {
  COUNT_MAX,
  FOLLOW_RATE,
  FRAY_POWER,
  GAIN_MIN,
  GATHER,
  GATHER_MIN,
  JITTER,
  PART_STRETCH,
  PATH_TURNS_MAX,
  PATH_TURNS_MIN,
  PIXELS,
  REST_FRAME_MS,
  SPREAD,
  SPRING_DAMPING,
  SPRING_RATE,
  SPRING_SUBSTEP,
  STRAND_STRIDE,
  TEXTURE_ROWS,
  WAVE_LAG,
  WAVE_SCATTER,
  threadCount,
  threadFrameMs,
  threadHalfWidth,
  threadInk,
  threadLength,
  threadParting,
  threadRatio,
  threadSpringStep,
  threadSpringStill,
  threadStrandTexture,
  threadStrands,
  threadWidths,
} from './thread-model';

@Component({
  imports: [WrThreadLines],
  template: `<section class="wrap">
    <wr-thread-lines [count]="count()" [parting]="parting()" />
    <p>Opt-in</p>
  </section>`,
})
class Host {
  readonly count = signal(72);
  readonly parting = signal(1);
}

/**
 * jsdom has no WebGL. This one accepts every call, hands out distinct objects
 * for what is created and records the uniforms set, the textures uploaded
 * and the draws, which is what the specs read.
 */
class FakeGL {
  readonly ARRAY_BUFFER = 1;
  readonly STATIC_DRAW = 2;
  readonly BLEND = 3;
  readonly DEPTH_TEST = 4;
  readonly VERTEX_SHADER = 5;
  readonly FRAGMENT_SHADER = 6;
  readonly COMPILE_STATUS = 7;
  readonly LINK_STATUS = 8;
  readonly TEXTURE_2D = 9;
  readonly TEXTURE0 = 100;
  readonly TEXTURE_MIN_FILTER = 10;
  readonly TEXTURE_MAG_FILTER = 11;
  readonly TEXTURE_WRAP_S = 12;
  readonly TEXTURE_WRAP_T = 13;
  readonly NEAREST = 14;
  readonly CLAMP_TO_EDGE = 15;
  readonly FRAMEBUFFER = 16;
  readonly COLOR_BUFFER_BIT = 18;
  readonly FLOAT = 19;
  readonly TRIANGLE_STRIP = 20;
  readonly RGBA = 21;
  readonly UNSIGNED_BYTE = 22;
  readonly UNPACK_ALIGNMENT = 23;

  readonly programs: object[] = [];
  readonly deletedPrograms: object[] = [];
  readonly textures = { created: 0, deleted: 0 };
  readonly buffers = { created: 0, deleted: 0 };
  readonly uploads: { width: number; height: number; data: ArrayBufferView | null }[] = [];
  readonly draws: { width: number; height: number }[] = [];
  readonly uniforms: Record<string, number[]> = {};
  readonly lost = vi.fn();
  compiles = true;
  private viewportSize = { width: 0, height: 0 };

  getExtension(name: string): unknown {
    return name === 'WEBGL_lose_context' ? { loseContext: this.lost } : null;
  }
  createBuffer(): object {
    this.buffers.created++;
    return {};
  }
  deleteBuffer(): void {
    this.buffers.deleted++;
  }
  createShader(): object {
    return {};
  }
  createProgram(): object {
    const program = {};
    this.programs.push(program);
    return program;
  }
  deleteProgram(program: object): void {
    this.deletedPrograms.push(program);
  }
  createTexture(): object {
    this.textures.created++;
    return {};
  }
  deleteTexture(): void {
    this.textures.deleted++;
  }
  texImage2D(
    _target: number,
    _level: number,
    _internal: number,
    width: number,
    height: number,
    _border: number,
    _format: number,
    _type: number,
    data: ArrayBufferView | null
  ): void {
    this.uploads.push({ width, height, data });
  }
  viewport(_x: number, _y: number, width: number, height: number): void {
    this.viewportSize = { width, height };
  }
  drawArrays(): void {
    this.draws.push({ ...this.viewportSize });
  }
  getShaderParameter(): boolean {
    return this.compiles;
  }
  getProgramParameter(): boolean {
    return true;
  }
  getUniformLocation(_: object, name: string): object {
    return { name };
  }
  getShaderInfoLog(): string {
    return '';
  }
  getProgramInfoLog(): string {
    return '';
  }
  isContextLost(): boolean {
    return false;
  }
  private readonly set = (location: unknown, ...values: number[]): void => {
    this.uniforms[(location as { name: string }).name] = values;
  };
  readonly uniform1f = this.set;
  readonly uniform1i = this.set;
  readonly uniform2f = this.set;
  readonly uniform3f = this.set;
  readonly uniform4f = this.set;
  // The rest is accepted and forgotten.
  readonly bindBuffer = noop;
  readonly bufferData = noop;
  readonly disable = noop;
  readonly shaderSource = noop;
  readonly compileShader = noop;
  readonly attachShader = noop;
  readonly bindAttribLocation = noop;
  readonly linkProgram = noop;
  readonly deleteShader = noop;
  readonly useProgram = noop;
  readonly activeTexture = noop;
  readonly bindTexture = noop;
  readonly texParameteri = noop;
  readonly pixelStorei = noop;
  readonly bindFramebuffer = noop;
  readonly clearColor = noop;
  readonly clear = noop;
  readonly enableVertexAttribArray = noop;
  readonly vertexAttribPointer = noop;
}

const noop = (): void => undefined;

const asGL = (fake: FakeGL): WebGLRenderingContext => fake as unknown as WebGLRenderingContext;

class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    StubResizeObserver.instances.push(this);
  }
  fire(width: number, height: number): void {
    const entry = { contentRect: { width, height } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIntersectionObserver.instances.push(this);
  }
  fire(isIntersecting: boolean): void {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const pointer = (type: string, init: PointerEventInit): PointerEvent => {
  // jsdom has no PointerEvent constructor; a MouseEvent with the type set does.
  const event = new MouseEvent(type, { bubbles: true, ...init }) as PointerEvent;
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
};

/** Runs the spring from rest to `target` in `steps` frames of `dt`, returning every value. */
const run = (target: number, steps: number, dt: number, rate: number, damping: number): number[] => {
  const spring = { value: 0, speed: 0 };
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    threadSpringStep(spring, target, dt, rate, damping);
    out.push(spring.value);
  }
  return out;
};

describe('threadCount', () => {
  it('rounds, floors at one and caps at the shader bound', () => {
    expect(threadCount(72)).toBe(72);
    expect(threadCount(71.6)).toBe(72);
    expect(threadCount(0)).toBe(1);
    expect(threadCount(-5)).toBe(1);
    expect(threadCount(NaN)).toBe(1);
    expect(threadCount(500)).toBe(COUNT_MAX);
  });
});

describe('threadStrands', () => {
  it('lays the strands across the bundle in order, evenly with a little jitter, from -1 to 1', () => {
    const strands = threadStrands(72);
    expect(strands).toHaveLength(72 * STRAND_STRIDE);
    const gap = 2 / 72;
    for (let i = 0; i < 72; i++) {
      const slot = strands[i * STRAND_STRIDE];
      const even = ((i + 0.5) / 72) * 2 - 1;
      expect(Math.abs(slot - even)).toBeLessThanOrEqual(gap * JITTER + 1e-6);
      expect(slot).toBeGreaterThan(-1);
      expect(slot).toBeLessThan(1);
      if (i > 0) expect(slot).toBeGreaterThan(strands[(i - 1) * STRAND_STRIDE]);
    }
  });

  it('gives each strand a gain, a path of its own and a wave lag that follows its slot', () => {
    const strands = threadStrands(64);
    for (let i = 0; i < 64; i++) {
      const base = i * STRAND_STRIDE;
      const slot = strands[base];
      expect(strands[base + 1]).toBeGreaterThanOrEqual(GAIN_MIN);
      expect(strands[base + 1]).toBeLessThanOrEqual(1);
      expect(strands[base + 2]).toBeGreaterThanOrEqual(PATH_TURNS_MIN);
      expect(strands[base + 2]).toBeLessThanOrEqual(PATH_TURNS_MAX);
      expect(strands[base + 3]).toBeGreaterThanOrEqual(0);
      expect(strands[base + 3]).toBeLessThan(Math.PI * 2);
      const lag = Math.atan2(strands[base + 5], strands[base + 4]);
      expect(Math.abs(lag - WAVE_LAG * slot)).toBeLessThanOrEqual(WAVE_SCATTER + 1e-5);
      expect(Math.hypot(strands[base + 4], strands[base + 5])).toBeCloseTo(1, 5);
    }
  });

  it('is the same bundle every time, another for another seed, and never more than the cap', () => {
    expect(threadStrands(40)).toEqual(threadStrands(40));
    expect(threadStrands(40, 7)).not.toEqual(threadStrands(40));
    expect(threadStrands(1000)).toHaveLength(COUNT_MAX * STRAND_STRIDE);
  });
});

describe('threadStrandTexture', () => {
  it('packs each strand into two texels, the slot in sixteen bits, the rest in bytes', () => {
    const strands = threadStrands(24);
    const texture = threadStrandTexture(strands);
    expect(texture).toHaveLength(24 * TEXTURE_ROWS * 4);
    for (let i = 0; i < 24; i++) {
      const base = i * STRAND_STRIDE;
      const slot = ((texture[i * 4] * 256 + texture[i * 4 + 1]) / 65535) * 2 - 1;
      expect(slot).toBeCloseTo(strands[base], 3);
      expect(texture[i * 4 + 2] / 255).toBeCloseTo(strands[base + 1], 2);
      expect((texture[i * 4 + 3] / 255) * PATH_TURNS_MAX).toBeCloseTo(strands[base + 2], 1);
      const row1 = (24 + i) * 4;
      expect((texture[row1] / 255) * Math.PI * 2).toBeCloseTo(strands[base + 3], 1);
      expect((texture[row1 + 1] / 255) * 2 - 1).toBeCloseTo(strands[base + 4], 2);
      expect((texture[row1 + 2] / 255) * 2 - 1).toBeCloseTo(strands[base + 5], 2);
      expect(texture[row1 + 3]).toBe(255);
    }
  });
});

describe('threadWidths and threadHalfWidth', () => {
  it('is a cord at the start, never tighter than the floor, and opens with the fray by the end', () => {
    const widths = threadWidths(400, 1);
    expect(widths.gather).toBeCloseTo(GATHER * 400, 6);
    expect(widths.spread).toBeCloseTo(SPREAD * 400, 6);
    expect(threadWidths(100, 1).gather).toBe(GATHER_MIN);
    expect(threadWidths(400, 0).spread).toBe(0);
    expect(threadWidths(400, -2).spread).toBe(0);
    expect(threadWidths(400, 2).spread).toBeCloseTo(SPREAD * 800, 6);
  });

  it('opens late along the fray curve and clamps outside the length', () => {
    const widths = threadWidths(400, 1);
    expect(threadHalfWidth(0, widths)).toBe(widths.gather);
    expect(threadHalfWidth(1, widths)).toBeCloseTo(widths.gather + widths.spread, 6);
    expect(threadHalfWidth(0.5, widths)).toBeCloseTo(widths.gather + widths.spread * 0.5 ** FRAY_POWER, 6);
    expect(threadHalfWidth(0.5, widths)).toBeLessThan(widths.gather + widths.spread / 2);
    expect(threadHalfWidth(-1, widths)).toBe(widths.gather);
    expect(threadHalfWidth(3, widths)).toBeCloseTo(widths.gather + widths.spread, 6);
  });
});

describe('threadLength', () => {
  it('is the width when flat, and the turned box when tilted, either way', () => {
    expect(threadLength(1200, 400, 0)).toBe(1200);
    const tilted = threadLength(1200, 400, (-6 * Math.PI) / 180);
    expect(tilted).toBeCloseTo(1200 * Math.cos((6 * Math.PI) / 180) + 400 * Math.sin((6 * Math.PI) / 180), 6);
    expect(threadLength(1200, 400, (6 * Math.PI) / 180)).toBeCloseTo(tilted, 9);
    expect(threadLength(1200, 400, Math.PI / 2)).toBeCloseTo(400, 6);
  });
});

describe('threadParting', () => {
  it('is whole at the pointer, falls smoothly to nothing at the radius, and reaches further along than across', () => {
    expect(threadParting(0, 0, 110)).toBe(1);
    expect(threadParting(110, 0, 110)).toBe(0);
    expect(threadParting(200, 0, 110)).toBe(0);
    expect(threadParting(0, 110, 110)).toBeGreaterThan(0);
    expect(threadParting(0, 110 * PART_STRETCH, 110)).toBe(0);
    let last = 1;
    for (let d = 5; d < 110; d += 5) {
      const value = threadParting(d, 0, 110);
      expect(value).toBeLessThan(last);
      expect(value).toBeGreaterThan(0);
      last = value;
    }
    expect(threadParting(55, 0, 110)).toBeCloseTo(0.75 * 0.75, 6);
  });

  it('is nothing for no radius', () => {
    expect(threadParting(0, 0, 0)).toBe(0);
    expect(threadParting(1, 1, -5)).toBe(0);
  });
});

describe('threadSpringStep', () => {
  it('reaches the target and settles exactly there', () => {
    const values = run(1, 600, 1 / 60, SPRING_RATE, SPRING_DAMPING);
    expect(values[values.length - 1]).toBe(1);
    expect(values[5]).toBeGreaterThan(0);
    expect(values[5]).toBeLessThan(1);
    const spring = { value: 1, speed: 0 };
    for (let i = 0; i < 600; i++) threadSpringStep(spring, 0, 1 / 60, SPRING_RATE, SPRING_DAMPING);
    expect(threadSpringStill(spring)).toBe(true);
  });

  it('swings a little past the target under the parting damping, and never when critically damped', () => {
    const under = run(1, 300, 1 / 60, SPRING_RATE, SPRING_DAMPING);
    expect(Math.max(...under)).toBeGreaterThan(1.01);
    expect(Math.max(...under)).toBeLessThan(1.12);
    const critical = run(1, 300, 1 / 60, SPRING_RATE, 1);
    expect(Math.max(...critical)).toBeLessThanOrEqual(1);
  });

  it('takes the same path on a fast and a slow screen, near enough', () => {
    const fast = run(1, 60, 1 / 120, SPRING_RATE, SPRING_DAMPING);
    const slow = run(1, 30, 1 / 60, SPRING_RATE, SPRING_DAMPING);
    expect(fast[59]).toBeCloseTo(slow[29], 1);
  });

  it('stays put under long frames: the follow spring at the frame clamp lands on the pointer, never flung past it', () => {
    const dt = MAX_FRAME_MS / 1000;
    expect(FOLLOW_RATE * dt).toBeGreaterThan(SPRING_SUBSTEP);
    const spring = { value: 0, speed: 0 };
    for (let i = 0; i < 40; i++) {
      threadSpringStep(spring, 400, dt, FOLLOW_RATE, 1);
      expect(spring.value).toBeGreaterThanOrEqual(0);
      expect(spring.value).toBeLessThanOrEqual(400.5);
    }
    expect(spring.value).toBe(400);
    const smooth = run(400, 40, dt, FOLLOW_RATE, 1);
    const fine = run(400, 400, dt / 10, FOLLOW_RATE, 1);
    expect(smooth[9]).toBeCloseTo(fine[99], -1);
  });
});

describe('threadRatio', () => {
  it('follows the device ratio up to the cap and the budget, never under one', () => {
    expect(threadRatio(800, 400, 1)).toBe(1);
    expect(threadRatio(800, 400, 2)).toBe(2);
    expect(threadRatio(800, 400, 3)).toBe(MAX_DPR);
    expect(threadRatio(1920, 900, 2)).toBeCloseTo(Math.sqrt(PIXELS / (1920 * 900)), 6);
    expect(threadRatio(4000, 3000, 2)).toBe(1);
    expect(threadRatio(0, 0, 2)).toBe(2);
  });
});

describe('threadFrameMs', () => {
  it('holds thirty frames a second at rest and lifts the cap while the parting is live', () => {
    expect(threadFrameMs(false)).toBe(REST_FRAME_MS);
    expect(REST_FRAME_MS).toBeCloseTo(1000 / 30, 6);
    expect(threadFrameMs(true)).toBe(0);
  });
});

describe('threadInk', () => {
  it('lays ink on a light surface and lights the strands on a dark one', () => {
    expect(threadInk([1, 1, 1])).toBe(true);
    expect(threadInk([0.96, 0.97, 0.98])).toBe(true);
    expect(threadInk([0.07, 0.08, 0.1])).toBe(false);
    expect(threadInk([0, 0, 0])).toBe(false);
  });
});

describe('createThreadRenderer', () => {
  it('compiles one program, uploads the strands as a two-row texture and frees it all on destroy', () => {
    const gl = new FakeGL();
    const renderer = createThreadRenderer(asGL(gl))!;
    expect(renderer).not.toBeNull();
    expect(gl.programs).toHaveLength(1);
    expect(gl.textures.created).toBe(1);

    const data = threadStrandTexture(threadStrands(40));
    renderer.strands(data, 40);
    expect(gl.uploads).toEqual([{ width: 40, height: TEXTURE_ROWS, data }]);

    renderer.destroy();
    expect(gl.textures.deleted).toBe(1);
    expect(gl.buffers.deleted).toBe(gl.buffers.created);
    expect(gl.deletedPrograms).toHaveLength(1);
  });

  it('draws one quad per frame onto the canvas, with every uniform set', () => {
    const gl = new FakeGL();
    const renderer = createThreadRenderer(asGL(gl))!;
    renderer.render({
      width: 800,
      height: 300,
      scale: 1,
      regionWidth: 800,
      regionHeight: 300,
      cos: 1,
      sin: 0,
      length: 800,
      mirror: 1,
      gather: 4,
      spread: 120,
      power: FRAY_POWER,
      centreStart: -30,
      centreEnd: 6,
      path: 30,
      amplitude: 16,
      wave1: 8,
      wave2: 19,
      phase1: 0.5,
      phase2: 1.5,
      thickness: 0.5,
      count: 72,
      color: new Float32Array([0.1, 0.1, 0.1]),
      accent: new Float32Array([0.2, 0.4, 0.9]),
      core: 0.9,
      glow: 0.05,
      pointerAlong: 10,
      pointerAcross: -5,
      push: 40,
      radius: 110,
    });

    expect(gl.draws).toEqual([{ width: 800, height: 300 }]);
    expect(Object.keys(gl.uniforms).sort()).toEqual([...THREAD_UNIFORMS].sort());
    expect(gl.uniforms['uCount']).toEqual([72]);
    expect(gl.uniforms['uPointer']).toEqual([10, -5, 40, 110]);
    expect(gl.uniforms['uInk']).toEqual([0.9, 0.05]);
  });

  it('is null where a shader does not compile', () => {
    const gl = new FakeGL();
    gl.compiles = false;
    expect(createThreadRenderer(asGL(gl))).toBeNull();
    expect(gl.deletedPrograms).toHaveLength(0);
  });
});

describe('WrThreadLines', () => {
  let gl: FakeGL;
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  let frames: FrameRequestCallback[];
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;
  let thrown: unknown[];
  /** The frames' clock: `performance.now()` reads the last tick, as the two share one clock in a browser. */
  let clock: number;

  const render = async (
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...(providers as never[]),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    // Stubbed after the first render, so Angular's own scheduling does not count.
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    return fixture;
  };

  const wrap = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('.wrap')!;
  const host = (fixture: { nativeElement: HTMLElement }): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>('wr-thread-lines')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.wr-thread-lines__canvas')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    clock = now;
    const queued = frames;
    frames = [];
    queued.forEach(frame => frame(now));
  };

  /** How many of the component's own frames are queued: Angular's scheduler asks for frames too, once a signal moves. */
  const pending = (): number => frames.filter(frame => frame.name === 'frameLoop').length;

  /** Sizes the host as the browser would: the size notification, then its frame. */
  const layout = (width: number, height: number): void => {
    StubResizeObserver.instances[0].fire(width, height);
    tick(0);
  };

  const inView = (): void => StubIntersectionObserver.instances[0].fire(true);

  const move = (target: HTMLElement, x: number, y: number, pointerType = 'mouse'): void => {
    target.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y, pointerType }));
  };

  beforeEach(() => {
    thrown = [];
    clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    gl = new FakeGL();
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(((kind: string) =>
        kind === 'webgl' ? gl : null) as unknown as HTMLCanvasElement['getContext']);
    frames = [];
    raf = vi.fn((frame: FrameRequestCallback) => frames.push(frame));
    caf = vi.fn();
    StubResizeObserver.instances = [];
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    expect(thrown).toEqual([]);
  });

  it('renders the empty canvas on the server, absolutely positioned by the sheet, and asks for nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas(fixture)).not.toBeNull();
    expect(canvas(fixture).getAttribute('width')).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('is decorative: hidden from assistive tech, no text, nothing focusable, before the content', async () => {
    const fixture = await render();
    const el = host(fixture);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('Opt-in');
  });

  it('watches the host for size and view, and asks for a context only once it is sized and on screen', async () => {
    const fixture = await render();
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));

    layout(800, 300);
    expect(getContext).not.toHaveBeenCalled();
    expect(pending()).toBe(0);

    inView();
    expect(pending()).toBe(1);
    tick(40);
    expect(getContext).toHaveBeenCalledWith('webgl2', THREAD_CONTEXT_ATTRIBUTES);
    expect(getContext).toHaveBeenCalledWith('webgl', THREAD_CONTEXT_ATTRIBUTES);
    expect(gl.programs).toHaveLength(1);
    expect(gl.draws).toHaveLength(1);
  });

  it('sizes the canvas to the host under the pixel budget and uploads the strands once per count', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    // jsdom's device ratio is one, so the canvas is the host's size.
    expect(canvas(fixture).width).toBe(800);
    expect(canvas(fixture).height).toBe(300);
    expect(gl.draws[0]).toEqual({ width: 800, height: 300 });
    expect(gl.uploads).toHaveLength(1);
    expect(gl.uploads[0].width).toBe(72);
    expect(gl.uniforms['uCount']).toEqual([72]);
    expect(gl.uniforms['uSize']).toEqual([800, 300]);

    tick(50);
    tick(100);
    expect(gl.uploads).toHaveLength(1);

    fixture.componentInstance.count.set(40);
    fixture.detectChanges();
    await fixture.whenStable();
    tick(150);
    expect(gl.uploads).toHaveLength(2);
    expect(gl.uploads[1].width).toBe(40);
    expect(gl.uniforms['uCount']).toEqual([40]);
  });

  it('keeps the loop going and draws at most thirty frames a second at rest', async () => {
    await render();
    layout(800, 300);
    inView();
    expect(pending()).toBe(1);

    // Too soon after the loop started: the frame is skipped whole, and the loop asks for the next.
    tick(16);
    expect(gl.draws).toHaveLength(0);
    expect(pending()).toBe(1);
    tick(40);
    expect(gl.draws).toHaveLength(1);
    tick(56);
    expect(gl.draws).toHaveLength(1);
    tick(74);
    expect(gl.draws).toHaveLength(2);
    // The wave moved on between the two drawn frames.
    tick(108);
    expect(gl.draws).toHaveLength(3);
    expect(gl.uniforms['uPhase'][0]).toBeGreaterThan(0);
  });

  it('parts the strands around the mouse, at the screen rate, and closes them again after it leaves', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uPointer'][2]).toBe(0);

    move(wrap(fixture), 400, 150);
    tick(56);
    tick(72);
    // Every frame drawn now: the parting is live.
    expect(gl.draws).toHaveLength(3);
    const push = gl.uniforms['uPointer'][2];
    expect(push).toBeGreaterThan(0);
    expect(gl.uniforms['uPointer'][3]).toBe(PART_RADIUS);
    // The centre is where the pointer is, in the ribbon's frame: near the middle of the host.
    expect(Math.abs(gl.uniforms['uPointer'][0])).toBeLessThan(5);
    expect(Math.abs(gl.uniforms['uPointer'][1])).toBeLessThan(5);

    let now = 72;
    for (let i = 0; i < 30; i++) tick((now += 16));
    expect(gl.uniforms['uPointer'][2]).toBeGreaterThan(push);

    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    for (let i = 0; i < 200; i++) tick((now += 16));
    expect(gl.uniforms['uPointer'][2]).toBe(0);
    // Back to the rest cap: a frame 16ms on is skipped.
    const drawn = gl.draws.length;
    tick(now + 16);
    expect(gl.draws).toHaveLength(drawn);
  });

  it('ignores a finger, and parts nothing when the parting is turned off', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    move(wrap(fixture), 400, 150, 'touch');
    tick(50);
    tick(84);
    expect(gl.uniforms['uPointer'][2]).toBe(0);

    fixture.componentInstance.parting.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    move(wrap(fixture), 400, 150);
    tick(120);
    tick(154);
    expect(gl.uniforms['uPointer'][2]).toBe(0);
  });

  it('listens on the parent, passively, and never on the host or its canvas', async () => {
    const fixture = await render();
    const add = vi.spyOn(wrap(fixture), 'addEventListener');
    const addHost = vi.spyOn(host(fixture), 'addEventListener');
    layout(800, 300);
    inView();
    tick(40);
    expect(addHost).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    // The listeners went on at mount, before the spy: a move still reaches them.
    move(wrap(fixture), 100, 100);
    tick(56);
    expect(gl.uniforms['uPointer'][2]).toBeGreaterThan(0);
  });

  it('runs no loop off screen or with the page hidden, and picks up when they come back', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(800, 300);
    expect(pending()).toBe(0);

    inView();
    expect(pending()).toBe(1);
    tick(40);

    page.pageVisible.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caf).toHaveBeenCalled();
    tick(56);
    expect(pending()).toBe(0);

    page.pageVisible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending()).toBe(1);

    StubIntersectionObserver.instances[0].fire(false);
    tick(72);
    expect(pending()).toBe(0);
  });

  it('draws one still frame under reduced motion, with the strands closed, and stops a running loop when it is turned on', async () => {
    const page = stub(true);
    const fixture = await render([platform(page)]);
    layout(800, 300);
    inView();

    expect(pending()).toBe(0);
    expect(gl.draws).toHaveLength(1);
    expect(gl.uniforms['uPointer'][2]).toBe(0);
    move(wrap(fixture), 400, 150);
    expect(gl.draws).toHaveLength(1);

    page.prefersReducedMotion.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending()).toBe(1);
    tick(40);
    tick(56);
    expect(gl.uniforms['uPointer'][2]).toBeGreaterThan(0);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caf).toHaveBeenCalled();
    tick(72);
    expect(pending()).toBe(0);
    expect(gl.uniforms['uPointer'][2]).toBe(0);
  });

  it('mirrors the ribbon under RTL', async () => {
    const dir = { valueSignal: signal<'ltr' | 'rtl'>('ltr'), value: 'ltr' };
    const fixture = await render([platform(stub()), { provide: Directionality, useValue: dir }]);
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uMirror']).toEqual([1]);

    dir.valueSignal.set('rtl');
    fixture.detectChanges();
    await fixture.whenStable();
    tick(90);
    expect(gl.uniforms['uMirror']).toEqual([-1]);
  });

  it('drops the renderer when the context is lost and rebuilds it when it is restored', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas(fixture).dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    tick(56);
    expect(pending()).toBe(0);

    const uploads = gl.uploads.length;
    canvas(fixture).dispatchEvent(new Event('webglcontextrestored'));
    expect(gl.programs).toHaveLength(2);
    // The still frame on the new renderer uploads the strands again, and the loop is back.
    expect(gl.uploads).toHaveLength(uploads + 1);
    expect(pending()).toBe(1);
    const draws = gl.draws.length;
    tick(100);
    expect(gl.draws).toHaveLength(draws + 1);
  });

  it('survives a browser that gives no context, and asks only once', async () => {
    getContext.mockImplementation(() => null);
    await render();
    layout(800, 300);
    inView();
    tick(40);
    tick(50);
    tick(84);

    expect(getContext).toHaveBeenCalledTimes(2);
    expect(gl.draws).toHaveLength(0);
  });

  it('frees the program, the texture and the context, and stops listening, on destroy', async () => {
    const fixture = await render();
    const remove = vi.spyOn(wrap(fixture), 'removeEventListener');
    layout(800, 300);
    inView();
    tick(40);

    fixture.destroy();

    expect(caf).toHaveBeenCalled();
    expect(gl.textures.deleted).toBe(gl.textures.created);
    expect(gl.buffers.deleted).toBe(gl.buffers.created);
    expect(gl.deletedPrograms).toHaveLength(1);
    expect(gl.lost).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(remove.mock.calls.map(c => c[0]).sort()).toEqual(['pointerleave', 'pointermove']);
  });
});
