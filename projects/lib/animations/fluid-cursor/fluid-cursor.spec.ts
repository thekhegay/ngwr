import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MAX_PIXELS } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFluidCursor } from './fluid-cursor';
import { FLUID_PASSES, type FluidPass, createFluidSim } from './fluid-gl';
import {
  CYCLE_PX,
  FLOOR,
  PEAK,
  QUALITY,
  SPEED_MAX,
  SPLASH_RAYS,
  SPLASH_SPEED,
  SPLASH_SPIN,
  SPLASH_STEPS,
  SPLATS_MAX,
  SPLAT_GAP,
  fluidDecay,
  fluidDyeScale,
  fluidGrid,
  fluidInk,
  fluidPaletteColor,
  fluidRainbowColor,
  fluidRestMs,
  fluidSplash,
  fluidSplats,
  fluidVelocity,
} from './fluid-model';

@Component({
  imports: [WrFluidCursor],
  template: `<footer class="wrap">
    <wr-fluid-cursor [trail]="trail()" [clickSplash]="clickSplash()" [quality]="quality()" />
    <p>ngwr</p>
  </footer>`,
})
class Host {
  readonly trail = signal(3);
  readonly clickSplash = signal(true);
  readonly quality = signal<'low' | 'medium' | 'high'>('medium');
}

/**
 * jsdom has no WebGL. This one accepts every call, hands out distinct
 * objects for what is created and records the programs used and the
 * resources made and freed, which is what the specs read.
 */
class FakeGL {
  static readonly FRAMEBUFFER_COMPLETE = 0x8cd5;
  readonly FRAMEBUFFER_COMPLETE = FakeGL.FRAMEBUFFER_COMPLETE;
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
  readonly LINEAR = 14;
  readonly CLAMP_TO_EDGE = 15;
  readonly FRAMEBUFFER = 16;
  readonly COLOR_ATTACHMENT0 = 17;
  readonly COLOR_BUFFER_BIT = 18;
  readonly FLOAT = 19;
  readonly TRIANGLE_STRIP = 20;
  readonly RGBA = 21;
  readonly RGBA16F = 22;
  readonly HALF_FLOAT = 23;

  readonly programs: object[] = [];
  readonly used: object[] = [];
  readonly textures = { created: 0, deleted: 0 };
  readonly framebuffers = { created: 0, deleted: 0 };
  readonly buffers = { created: 0, deleted: 0 };
  readonly deletedPrograms: object[] = [];
  readonly draws: { target: object | null; width: number; height: number }[] = [];
  readonly extensions = new Set([
    'OES_texture_half_float',
    'OES_texture_half_float_linear',
    'EXT_color_buffer_half_float',
    'WEBGL_lose_context',
  ]);
  readonly lost = vi.fn();
  complete = true;
  private target: object | null = null;
  private viewportSize = { width: 0, height: 0 };

  getExtension(name: string): unknown {
    if (!this.extensions.has(name)) return null;
    if (name === 'WEBGL_lose_context') return { loseContext: this.lost };
    return { HALF_FLOAT_OES: 0x8d61 };
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
  useProgram(program: object): void {
    this.used.push(program);
  }
  createTexture(): object {
    this.textures.created++;
    return {};
  }
  deleteTexture(): void {
    this.textures.deleted++;
  }
  createFramebuffer(): object {
    this.framebuffers.created++;
    return {};
  }
  deleteFramebuffer(): void {
    this.framebuffers.deleted++;
  }
  bindFramebuffer(_: number, target: object | null): void {
    this.target = target;
  }
  viewport(_x: number, _y: number, width: number, height: number): void {
    this.viewportSize = { width, height };
  }
  drawArrays(): void {
    this.draws.push({ target: this.target, ...this.viewportSize });
  }
  checkFramebufferStatus(): number {
    return this.complete ? FakeGL.FRAMEBUFFER_COMPLETE : 0;
  }
  getShaderParameter(): boolean {
    return true;
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
  readonly activeTexture = noop;
  readonly bindTexture = noop;
  readonly texParameteri = noop;
  readonly texImage2D = noop;
  readonly framebufferTexture2D = noop;
  readonly clearColor = noop;
  readonly clear = noop;
  readonly uniform1f = noop;
  readonly uniform1i = noop;
  readonly uniform2f = noop;
  readonly uniform3f: (location: unknown, r: number, g: number, b: number) => void = noop;
  readonly enableVertexAttribArray = noop;
  readonly vertexAttribPointer = noop;

  /** The passes used so far, by name; a second solver on the same context compiles the same nine again. */
  passes(): FluidPass[] {
    return this.used.map(program => FLUID_PASSES[this.programs.indexOf(program) % FLUID_PASSES.length]);
  }
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

const count = (passes: FluidPass[], pass: FluidPass): number => passes.filter(p => p === pass).length;

describe('fluidGrid', () => {
  it('puts the short side at the asked size and keeps the aspect ratio', () => {
    expect(fluidGrid(1200, 300, 128, MAX_PIXELS)).toEqual({ width: 512, height: 128 });
    expect(fluidGrid(300, 1200, 128, MAX_PIXELS)).toEqual({ width: 128, height: 512 });
    expect(fluidGrid(500, 500, 64, MAX_PIXELS)).toEqual({ width: 64, height: 64 });
  });

  it('shrinks both sides to the pixel budget and never under two', () => {
    const grid = fluidGrid(4000, 400, 1024, 1_000_000);
    expect(grid.width * grid.height).toBeLessThanOrEqual(1_000_000 * 1.01);
    expect(grid.width / grid.height).toBeCloseTo(10, 0);
    expect(fluidGrid(0, 100, 128, MAX_PIXELS)).toEqual({ width: 2, height: 2 });
    expect(fluidGrid(10, 10000, 2, MAX_PIXELS).width).toBe(2);
  });
});

describe('fluidDecay and fluidRestMs', () => {
  it('decays a unit to the floor in the given seconds', () => {
    const rate = fluidDecay(3);
    expect(Math.exp(-rate * 3)).toBeCloseTo(FLOOR, 6);
    expect(fluidDecay(0)).toBe(0);
    expect(fluidDecay(-1)).toBe(0);
  });

  it('rests for the trail plus the time a peak needs to come down, and never for no trail', () => {
    const ms = fluidRestMs(3);
    expect(ms).toBeGreaterThan(3000);
    expect(Math.exp(-fluidDecay(3) * (ms / 1000)) * PEAK).toBeLessThanOrEqual(FLOOR * 1.001);
    expect(fluidRestMs(0)).toBe(0);
    expect(fluidRestMs(NaN)).toBe(0);
  });
});

describe('fluidVelocity', () => {
  const out = new Float32Array(2);

  it('reads the pointer speed in px per second', () => {
    fluidVelocity(40, -20, 20, out);
    expect(out[0]).toBeCloseTo(2000, 3);
    expect(out[1]).toBeCloseTo(-1000, 3);
  });

  it('clamps a jump and reads a move with no time as one ms', () => {
    fluidVelocity(300, 400, 0, out);
    expect(Math.hypot(out[0], out[1])).toBeCloseTo(SPEED_MAX, 2);
    expect(out[0] / out[1]).toBeCloseTo(0.75, 5);
  });
});

describe('fluidSplats and fluidDyeScale', () => {
  it('lays one splat per gap along a move, one when still and never more than the cap', () => {
    expect(fluidSplats(0, 24)).toBe(1);
    expect(fluidSplats(10, 24)).toBe(1);
    expect(fluidSplats(24 * SPLAT_GAP * 3, 24)).toBe(3);
    expect(fluidSplats(5000, 24)).toBe(SPLATS_MAX);
    expect(fluidSplats(100, 0)).toBe(1);
  });

  it('shares the dye of a move among its splats by the gap each covers, so ink per px is constant', () => {
    expect(fluidDyeScale(0, 1, 24)).toBe(0);
    expect(fluidDyeScale(7.2, 1, 24)).toBeCloseTo(0.5, 5);
    expect(fluidDyeScale(14.4, 1, 24)).toBeCloseTo(1, 5);
    expect(fluidDyeScale(14.4 * 3, 3, 24)).toBeCloseTo(1, 5);
    expect(fluidDyeScale(5000, SPLATS_MAX, 24)).toBe(1);
    expect(fluidDyeScale(5, 1, 0)).toBe(1);
  });
});

describe('fluidPaletteColor', () => {
  const out = new Float32Array(3);
  const red = [1, 0, 0] as const;
  const blue = [0, 0, 1] as const;

  it('returns each entry at its own phase and cycles round', () => {
    fluidPaletteColor(0, [red, blue], out);
    expect(Array.from(out)).toEqual([1, 0, 0]);
    fluidPaletteColor(0.5, [red, blue], out);
    expect(Array.from(out)).toEqual([0, 0, 1]);
    fluidPaletteColor(1, [red, blue], out);
    expect(Array.from(out)).toEqual([1, 0, 0]);
    fluidPaletteColor(-0.5, [red, blue], out);
    expect(Array.from(out)).toEqual([0, 0, 1]);
  });

  it('keeps a blend as bright as its ends, so two inks do not meet in grey', () => {
    fluidPaletteColor(0.25, [red, blue], out);
    expect(out[0]).toBeCloseTo(1, 5);
    expect(out[2]).toBeCloseTo(1, 5);
    expect(out[1]).toBe(0);
    fluidPaletteColor(
      0.25,
      [
        [0.5, 0, 0],
        [0, 0, 0.5],
      ],
      out
    );
    expect(Math.max(out[0], out[1], out[2])).toBeCloseTo(0.5, 5);
  });

  it('is black for an empty palette', () => {
    fluidPaletteColor(0.3, [], out);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });
});

describe('fluidRainbowColor', () => {
  const out = new Float32Array(3);

  it('runs the hue circle, always with one channel at full', () => {
    fluidRainbowColor(0, out);
    expect(out[0]).toBe(1);
    expect(out[1]).toBeCloseTo(0.1, 5);
    fluidRainbowColor(1 / 3, out);
    expect(out[1]).toBe(1);
    fluidRainbowColor(2 / 3, out);
    expect(out[2]).toBe(1);
    for (const phase of [0.1, 0.37, 0.55, 0.9, 1.3, -0.2]) {
      fluidRainbowColor(phase, out);
      expect(Math.max(out[0], out[1], out[2])).toBe(1);
      expect(Math.min(out[0], out[1], out[2])).toBeCloseTo(0.1, 5);
    }
  });
});

describe('fluidInk', () => {
  it('lays ink on a light surface and lights it on a dark one', () => {
    expect(fluidInk([1, 1, 1])).toBe(true);
    expect(fluidInk([0.96, 0.97, 0.98])).toBe(true);
    expect(fluidInk([0.07, 0.08, 0.1])).toBe(false);
    expect(fluidInk([0, 0, 0])).toBe(false);
  });
});

describe('fluidSplash', () => {
  it('fans the rays evenly round the point at the splash speed, turned by the seed', () => {
    const out = new Float32Array(SPLASH_RAYS * 2);
    const speed = SPLASH_SPEED * Math.hypot(1, SPLASH_SPIN);
    expect(fluidSplash(1, 0, out)).toBe(SPLASH_RAYS);
    for (let i = 0; i < SPLASH_RAYS; i++) {
      expect(Math.hypot(out[i * 2], out[i * 2 + 1])).toBeCloseTo(speed, 2);
    }
    // The first ray points along x, leaning sideways by the spin.
    expect(out[0]).toBeCloseTo(SPLASH_SPEED, 2);
    expect(out[1]).toBeCloseTo(SPLASH_SPEED * SPLASH_SPIN, 2);
    const turned = new Float32Array(SPLASH_RAYS * 2);
    fluidSplash(2, 0.5, turned);
    expect(Math.hypot(turned[0], turned[1])).toBeCloseTo(speed * 2, 1);
    expect(turned[0]).not.toBeCloseTo(SPLASH_SPEED * 2, 0);
  });
});

describe('createFluidSim', () => {
  it('compiles one program per pass, in order, and frees them all with the fields on destroy', () => {
    const gl = new FakeGL();
    const sim = createFluidSim(asGL(gl))!;

    expect(sim).not.toBeNull();
    expect(gl.programs).toHaveLength(FLUID_PASSES.length);
    sim.resize(64, 32, 256, 128);
    // Velocity, pressure and dye as pairs, curl and divergence single: eight targets.
    expect(gl.textures.created - gl.textures.deleted).toBe(8);

    sim.destroy();
    expect(gl.textures.deleted).toBe(gl.textures.created);
    expect(gl.framebuffers.deleted).toBe(gl.framebuffers.created);
    expect(gl.buffers.deleted).toBe(gl.buffers.created);
    expect(gl.deletedPrograms).toHaveLength(FLUID_PASSES.length);
  });

  it('runs a step as curl, vorticity, divergence, a damped pressure solve, the gradient and two advections', () => {
    const gl = new FakeGL();
    const sim = createFluidSim(asGL(gl))!;
    sim.resize(64, 32, 256, 128);
    gl.used.length = 0;
    gl.draws.length = 0;

    sim.step(1 / 60, { dyeDecay: 1, velocityDecay: 0.5, swirl: 20, iterations: 5 });

    expect(gl.passes()).toEqual(['curl', 'vorticity', 'divergence', 'scale', 'pressure', 'gradient', 'advect']);
    // One draw per pass, the solve's five, and the advection twice: into the velocity and into the dye.
    expect(gl.draws).toHaveLength(5 + 5 + 2);
    expect(gl.draws[gl.draws.length - 1]).toMatchObject({ width: 256, height: 128 });
    expect(gl.draws[gl.draws.length - 2]).toMatchObject({ width: 64, height: 32 });
  });

  it('splats into the velocity then the dye, and paints the dye to the canvas alone', () => {
    const gl = new FakeGL();
    const sim = createFluidSim(asGL(gl))!;
    sim.resize(64, 32, 256, 128);
    gl.used.length = 0;
    gl.draws.length = 0;

    sim.splat(0.5, 0.5, 10, 0, 1, 0, 0, 24);
    expect(gl.passes()).toEqual(['splat']);
    expect(gl.draws.map(d => d.width)).toEqual([64, 256]);

    gl.draws.length = 0;
    sim.render(800, 400, { ink: true, shading: 1 });
    expect(count(gl.passes(), 'display')).toBe(1);
    expect(gl.draws).toEqual([{ target: null, width: 800, height: 400 }]);
  });

  it('is null without the half-float extensions, and when a target does not complete', () => {
    const bare = new FakeGL();
    bare.extensions.delete('OES_texture_half_float_linear');
    expect(createFluidSim(asGL(bare))).toBeNull();
    expect(bare.programs).toHaveLength(0);

    const broken = new FakeGL();
    broken.complete = false;
    expect(createFluidSim(asGL(broken))).toBeNull();
    expect(broken.textures.deleted).toBe(broken.textures.created);
    expect(broken.deletedPrograms).toHaveLength(FLUID_PASSES.length);
  });
});

describe('WrFluidCursor', () => {
  let gl: FakeGL;
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  let frames: FrameRequestCallback[];
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;
  let thrown: unknown[];

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
    fixture.nativeElement.querySelector<HTMLElement>('wr-fluid-cursor')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.wr-fluid-cursor__canvas')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    const queued = frames;
    frames = [];
    queued.forEach(frame => frame(now));
  };

  /** How many of the component's own frames are queued: Angular's scheduler asks for frames too, once a signal moves. */
  const pending = (): number => frames.filter(frame => frame.name === 'frame').length;

  /** Sizes the host as the browser would: the size notification, then its frame, which is then forgotten. */
  const layout = (width: number, height: number): void => {
    StubResizeObserver.instances[0].fire(width, height);
    tick(0);
    raf.mockClear();
  };

  const inView = (): void => StubIntersectionObserver.instances[0].fire(true);

  const move = (target: HTMLElement, x: number, y: number, pointerType = 'mouse'): void => {
    target.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y, pointerType }));
  };

  const down = (target: HTMLElement, x: number, y: number, button = 0): void => {
    target.dispatchEvent(pointer('pointerdown', { clientX: x, clientY: y, button }));
  };

  /** Fires frames 16ms apart until the component stops asking, or `max` of them; returns how many ran. */
  const settle = (max: number): number => {
    let n = 0;
    while (pending() > 0 && n < max) {
      n++;
      tick(n * 16);
    }
    return n;
  };

  beforeEach(() => {
    thrown = [];
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
    expect(el.nextElementSibling?.textContent).toBe('ngwr');
  });

  it('watches the host for size and view but asks for no context until the pointer moves', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(getContext).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();

    move(wrap(fixture), 100, 100);
    expect(getContext).toHaveBeenCalledWith('webgl2', expect.objectContaining({ premultipliedAlpha: false }));
    expect(getContext).toHaveBeenCalledWith('webgl', expect.anything());
    expect(gl.programs).toHaveLength(FLUID_PASSES.length);
  });

  it('sizes the grids from the host and the quality, the dye no finer than the canvas', async () => {
    const fixture = await render();
    layout(800, 200);
    inView();
    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 140, 100);

    const widths = new Set(gl.draws.map(d => d.width));
    const sim = fluidGrid(800, 200, QUALITY.medium.sim, MAX_PIXELS);
    expect(widths).toContain(sim.width);
    // jsdom's device ratio is one, so the canvas is 800 by 200 and caps the dye's short side at 200.
    expect(widths).toContain(800);
    expect(widths).toContain(fluidGrid(800, 200, 200, MAX_PIXELS).width);
    expect(canvas(fixture).width).toBe(800);
    expect(canvas(fixture).height).toBe(200);
  });

  it('lays splats along a stroke, one per gap, and starts the loop', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    gl.used.length = 0;
    move(wrap(fixture), 200, 100);

    expect(count(gl.passes(), 'splat')).toBe(fluidSplats(100, 24));
    expect(raf).toHaveBeenCalledTimes(1);

    gl.used.length = 0;
    gl.draws.length = 0;
    tick(16);
    expect(gl.passes()).toEqual([
      'curl',
      'vorticity',
      'divergence',
      'scale',
      'pressure',
      'gradient',
      'advect',
      'display',
    ]);
    expect(gl.draws).toHaveLength(5 + QUALITY.medium.iterations + 2 + 1);
  });

  it('keeps stepping after the pointer stops for the time the trail takes, then clears and stops on its own', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);

    const ran = settle(1000);
    const expected = fluidRestMs(3) / 16;
    expect(ran).toBeGreaterThan(expected - 2);
    expect(ran).toBeLessThan(expected + 3);
    expect(pending()).toBe(0);
    expect(caf).not.toHaveBeenCalled();

    // The fields are sure to be under the floor: cleared, so nothing faint lingers, and resumed on the next move.
    gl.used.length = 0;
    move(wrap(fixture), 320, 120);
    move(wrap(fixture), 360, 140);
    expect(count(gl.passes(), 'splat')).toBeGreaterThan(0);
    expect(pending()).toBe(1);
  });

  it('rests sooner for a shorter trail', async () => {
    const fixture = await render();
    fixture.componentInstance.trail.set(1);
    fixture.detectChanges();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);

    const ran = settle(1000);
    expect(ran).toBeLessThan(fluidRestMs(1) / 16 + 3);
    expect(ran).toBeGreaterThan(fluidRestMs(1) / 16 - 2);
  });

  it('starts a fresh stroke after the pointer leaves, with no splats across the gap', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    gl.used.length = 0;
    move(wrap(fixture), 700, 100);

    expect(count(gl.passes(), 'splat')).toBe(0);
  });

  it('draws for a finger and a pen alike, through passive listeners on the parent', async () => {
    const fixture = await render();
    const add = vi.spyOn(wrap(fixture), 'addEventListener');
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100, 'touch');
    gl.used.length = 0;
    move(wrap(fixture), 160, 100, 'touch');
    const touch = count(gl.passes(), 'splat');
    gl.used.length = 0;
    move(wrap(fixture), 220, 100, 'pen');

    expect(touch).toBe(fluidSplats(60, 24));
    expect(count(gl.passes(), 'splat')).toBe(fluidSplats(60, 24));
    // The host and its canvas take nothing: `pointer-events: none` in the sheet, and no listener of their own.
    expect(add).not.toHaveBeenCalled();
  });

  it('splashes arms of splats on a primary click, and none when turned off or for another button', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    down(wrap(fixture), 400, 150);
    expect(count(gl.passes(), 'splat')).toBe(SPLASH_RAYS * SPLASH_STEPS);
    expect(pending()).toBe(1);

    gl.used.length = 0;
    down(wrap(fixture), 400, 150, 2);
    expect(count(gl.passes(), 'splat')).toBe(0);

    fixture.componentInstance.clickSplash.set(false);
    fixture.detectChanges();
    down(wrap(fixture), 400, 150);
    expect(count(gl.passes(), 'splat')).toBe(0);
  });

  it('cycles the palette along the stroke: the colour changes with the distance travelled', async () => {
    const fixture = await render();
    const colors: number[][] = [];
    vi.spyOn(gl, 'uniform3f').mockImplementation((loc: unknown, r: number, g: number, b: number) => {
      if ((loc as { name: string }).name === 'uColor' && !(r === 0 && g === 0 && b === 0)) colors.push([r, g, b]);
    });
    layout(2000, 300);
    inView();

    move(wrap(fixture), 0, 100);
    // Dye splats carry the colour; velocity splats carry the speed, so only every other `uColor` is a colour.
    for (let x = 100; x <= CYCLE_PX / 2; x += 100) move(wrap(fixture), x, 100);

    const dye = colors.filter((_, i) => i % 2 === 1);
    expect(dye.length).toBeGreaterThan(4);
    const first = dye[0];
    const last = dye[dye.length - 1];
    expect(Math.hypot(first[0] - last[0], first[1] - last[1], first[2] - last[2])).toBeGreaterThan(0.1);
  });

  it('runs no loop off screen or with the page hidden, and picks up when they come back', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(800, 300);

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);
    expect(raf).not.toHaveBeenCalled();

    inView();
    expect(raf).toHaveBeenCalledTimes(1);
    tick(16);

    page.pageVisible.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caf).toHaveBeenCalled();
    tick(32);
    expect(pending()).toBe(0);

    page.pageVisible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending()).toBe(1);
  });

  it('asks for no context under reduced motion, and clears a live trail when it is turned on', async () => {
    const page = stub(true);
    const fixture = await render([platform(page)]);
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);
    expect(getContext).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();

    page.prefersReducedMotion.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    move(wrap(fixture), 320, 120);
    move(wrap(fixture), 360, 140);
    expect(getContext).toHaveBeenCalled();
    expect(pending()).toBe(1);
    tick(16);

    const clear = vi.spyOn(gl, 'clear');
    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(clear).toHaveBeenCalled();
    tick(32);
    expect(pending()).toBe(0);
  });

  it('drops the solver when the context is lost and rebuilds it when it is restored', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);
    const before = gl.programs.length;

    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas(fixture).dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    tick(16);
    expect(pending()).toBe(0);

    canvas(fixture).dispatchEvent(new Event('webglcontextrestored'));
    expect(gl.programs.length).toBe(before * 2);
    gl.used.length = 0;
    move(wrap(fixture), 320, 120);
    expect(count(gl.passes(), 'splat')).toBeGreaterThan(0);
  });

  it('re-sizes the grids when the quality changes', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    move(wrap(fixture), 100, 100);
    const created = gl.textures.created;

    fixture.componentInstance.quality.set('high');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(gl.textures.created).toBe(created + 8);
    expect(gl.textures.deleted).toBeGreaterThanOrEqual(8);
    gl.draws.length = 0;
    move(wrap(fixture), 140, 100);
    expect(gl.draws[0].width).toBe(fluidGrid(800, 300, QUALITY.high.sim, MAX_PIXELS).width);
  });

  it('survives a browser that gives no context, and asks only once', async () => {
    getContext.mockImplementation(() => null);
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);
    move(wrap(fixture), 400, 120);

    expect(getContext).toHaveBeenCalledTimes(2);
    expect(raf).not.toHaveBeenCalled();
  });

  it('frees the programs, the fields and the context, and stops listening, on destroy', async () => {
    const fixture = await render();
    const remove = vi.spyOn(wrap(fixture), 'removeEventListener');
    layout(800, 300);
    inView();
    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);

    fixture.destroy();

    expect(caf).toHaveBeenCalled();
    expect(gl.textures.deleted).toBe(gl.textures.created);
    expect(gl.framebuffers.deleted).toBe(gl.framebuffers.created);
    expect(gl.deletedPrograms).toHaveLength(FLUID_PASSES.length);
    expect(gl.lost).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(remove.mock.calls.map(c => c[0]).sort()).toEqual(['pointerdown', 'pointerleave', 'pointermove']);
  });
});
