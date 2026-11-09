import { Directionality } from '@angular/cdk/bidi';
import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAurora } from './aurora';
import { AURORA_CONTEXT_ATTRIBUTES, AURORA_UNIFORMS, type AuroraFrame, createAuroraRenderer } from './aurora-gl';
import {
  BORDER_AT,
  EDGE_SOFT,
  FOLLOW_LIFT,
  FOLLOW_RATE,
  FOLLOW_REACH,
  FOLLOW_SETTLE,
  FRAME_MS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  INTRO_REACH_START,
  INTRO_S,
  LAYERS_MAX,
  PIXELS,
  PROFILE_FLOOR,
  RATIO_MAX,
  RATIO_MIN,
  RAY_GAIN,
  SIDE_MAX,
  SIDE_MIN,
  SIDE_SHARE,
  WAVE,
  auroraApproach,
  auroraColorAt,
  auroraDriftLive,
  auroraEdgeSign,
  auroraFactor,
  auroraFollowTarget,
  auroraHeight,
  auroraHueArc,
  auroraIntensity,
  auroraIntro,
  auroraLayers,
  auroraLight,
  auroraOklabToSrgb,
  auroraProfile,
  auroraRatio,
  auroraRay,
  auroraShare,
  auroraSideFade,
  auroraSrgbToOklab,
  auroraStop,
  auroraStopToSrgb,
  auroraWave,
} from './aurora-model';

@Component({
  imports: [WrAurora],
  template: `<section class="wrap">
    <wr-aurora [edge]="edge()" [height]="height()" [speed]="speed()" [follow]="follow()" [intro]="intro()" />
    <p>Why ngwr</p>
  </section>`,
})
class Host {
  readonly edge = signal<'top' | 'bottom'>('top');
  readonly height = signal(0.5);
  readonly speed = signal(1);
  readonly follow = signal(true);
  readonly intro = signal(false);
}

/**
 * jsdom has no WebGL. This one accepts every call, hands out distinct objects
 * for what is created and records the uniforms set and the draws, which is
 * what the specs read.
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
  readonly FRAMEBUFFER = 16;
  readonly COLOR_BUFFER_BIT = 18;
  readonly FLOAT = 19;
  readonly TRIANGLE_STRIP = 20;

  readonly programs: object[] = [];
  readonly deletedPrograms: object[] = [];
  readonly buffers = { created: 0, deleted: 0 };
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
  private readonly set = (location: unknown, ...values: (number | ArrayLike<number>)[]): void => {
    this.uniforms[(location as { name: string }).name] = values.flatMap(v =>
      typeof v === 'number' ? [v] : Array.from(v)
    );
  };
  readonly uniform1f = this.set;
  readonly uniform2f = this.set;
  readonly uniform3f = this.set;
  readonly uniform4f = this.set;
  readonly uniform3fv = this.set;
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

const near = (a: ArrayLike<number>, b: ArrayLike<number>, digits = 2): void => {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) expect(a[i]).toBeCloseTo(b[i], digits);
};

// The model

describe('auroraHeight, auroraLayers, auroraShare, auroraFactor', () => {
  it('keeps the height within its bounds and falls back when it is not a number', () => {
    expect(auroraHeight(0.5)).toBe(0.5);
    expect(auroraHeight(0)).toBe(HEIGHT_MIN);
    expect(auroraHeight(3)).toBe(HEIGHT_MAX);
    expect(auroraHeight(NaN)).toBe(0.5);
  });

  it('rounds the layers to a whole number from one to the shader bound', () => {
    expect(auroraLayers(2.4)).toBe(2);
    expect(auroraLayers(0)).toBe(1);
    expect(auroraLayers(9)).toBe(LAYERS_MAX);
    expect(auroraLayers(NaN)).toBe(2);
  });

  it('holds a share within nought and one and a factor at or over its floor', () => {
    expect(auroraShare(0.3, 0.6)).toBe(0.3);
    expect(auroraShare(-1, 0.6)).toBe(0);
    expect(auroraShare(2, 0.6)).toBe(1);
    expect(auroraShare(NaN, 0.6)).toBe(0.6);
    expect(auroraFactor(1.5, 1)).toBe(1.5);
    expect(auroraFactor(-2, 1)).toBe(0);
    expect(auroraFactor(0.05, 1, 0.2)).toBe(0.2);
    expect(auroraFactor(Infinity, 1)).toBe(1);
  });

  it('scales the wave with the amplitude and signs the edge', () => {
    expect(auroraWave(1)).toBe(WAVE);
    expect(auroraWave(0)).toBe(0);
    expect(auroraWave(2)).toBeCloseTo(2 * WAVE);
    expect(auroraEdgeSign('top')).toBe(1);
    expect(auroraEdgeSign('bottom')).toBe(-1);
  });
});

describe('auroraProfile', () => {
  it('is faint at the root, brightest just short of the free edge and nothing past it', () => {
    expect(auroraProfile(0)).toBeCloseTo(PROFILE_FLOOR, 2);
    const samples = Array.from({ length: 121 }, (_, i) => i / 100);
    const values = samples.map(auroraProfile);
    const peakAt = samples[values.indexOf(Math.max(...values))];
    expect(peakAt).toBeGreaterThan(0.8);
    expect(peakAt).toBeLessThanOrEqual(BORDER_AT + 0.05);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    expect(auroraProfile(1 + EDGE_SOFT)).toBe(0);
    // Monotonic up to the border, so the text near the anchored edge sits over the dimmest part.
    for (let i = 1; i <= 80; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
  });
});

describe('auroraRay and auroraIntensity', () => {
  it('is whole at the free edge and fades toward the root, the shorter ray the faster', () => {
    expect(auroraRay(1, 1, 1)).toBe(1);
    expect(auroraRay(0.5, 1, 1)).toBe(0.5);
    expect(auroraRay(1, 1, 0.5)).toBeLessThan(auroraRay(1, 1, 0.8));
    expect(auroraRay(1, 0, 0.5)).toBeLessThan(auroraRay(1, 1, 0.5));
    expect(auroraRay(0, 1, 1)).toBe(0);
  });

  it('is the smooth profile with no rays, adds the rays over it under a unit `rays`, and never passes one', () => {
    expect(auroraIntensity(0.9, 1, 1, 0)).toBeCloseTo(auroraProfile(0.9), 6);
    expect(auroraIntensity(0.6, 1, 1, 1)).toBeGreaterThan(auroraIntensity(0.6, 0, 1, 1));
    expect(auroraIntensity(0.6, 1, 1, 1)).toBeLessThanOrEqual(1);
    // Half the veil goes where the ray is dark, so the rays read as rays and not as a brighter veil.
    expect(auroraIntensity(0.5, 0, 1, 1)).toBeLessThan(auroraIntensity(0.5, 0, 1, 0));
    expect(RAY_GAIN).toBeGreaterThan(0);
    expect(auroraIntensity(1 + EDGE_SOFT, 1, 1, 1)).toBe(0);
  });
});

describe('auroraIntro and auroraApproach', () => {
  it('eases the fade and the reach in from the start share and is whole once over', () => {
    expect(auroraIntro(0)).toEqual([0, INTRO_REACH_START]);
    const [fade, reach] = auroraIntro(INTRO_S / 2);
    expect(fade).toBeGreaterThan(0.5);
    expect(fade).toBeLessThan(1);
    expect(reach).toBeGreaterThan(INTRO_REACH_START);
    expect(reach).toBeLessThan(1);
    expect(auroraIntro(INTRO_S)).toEqual([1, 1]);
    expect(auroraIntro(99)).toEqual([1, 1]);
  });

  it('approaches the target the same way on a fast and a slow screen and never passes it', () => {
    let fast = 0;
    for (let i = 0; i < 60; i++) fast = auroraApproach(fast, 1, 1 / 60);
    const slow = auroraApproach(0, 1, 1);
    expect(fast).toBeCloseTo(slow, 6);
    expect(slow).toBeCloseTo(1 - Math.exp(-FOLLOW_RATE), 6);
    expect(slow).toBeLessThan(1);
    expect(auroraApproach(1, 0, 10)).toBeGreaterThanOrEqual(0);
  });
});

describe('auroraFollowTarget and auroraDriftLive', () => {
  it('drifts toward the pointer across, within the reach, and stretches toward a pointer past the free edge', () => {
    expect(auroraFollowTarget(NaN, NaN, 800, 300, 0.5)).toEqual([0, 0]);
    expect(auroraFollowTarget(400, 150, 800, 300, 0.5)).toEqual([0, 0]);
    const [right, down] = auroraFollowTarget(800, 300, 800, 300, 0.5);
    expect(right).toBeCloseTo(FOLLOW_REACH);
    expect(down).toBeCloseTo(FOLLOW_LIFT);
    const [left, up] = auroraFollowTarget(0, 0, 800, 300, 0.5);
    expect(left).toBeCloseTo(-FOLLOW_REACH);
    expect(up).toBeCloseTo(-FOLLOW_LIFT);
    expect(auroraFollowTarget(100, 100, 0, 0, 0.5)).toEqual([0, 0]);
  });

  it('is live until both parts are within the settle of their target', () => {
    expect(auroraDriftLive(0, 0, [0, 0])).toBe(false);
    expect(auroraDriftLive(0.01, 0, [0, 0])).toBe(true);
    expect(auroraDriftLive(0, FOLLOW_SETTLE * 2, [0, 0])).toBe(true);
    expect(auroraDriftLive(FOLLOW_SETTLE / 2, 0, [0, 0])).toBe(false);
  });
});

describe('auroraRatio, auroraSideFade, auroraLight', () => {
  it('draws at half resolution at most, lower under the pixel budget, never under the floor', () => {
    expect(auroraRatio(800, 300)).toBe(RATIO_MAX);
    const wide = auroraRatio(4000, 1200);
    expect(wide).toBeLessThan(RATIO_MAX);
    expect(wide).toBeCloseTo(Math.sqrt(PIXELS / (4000 * 1200)), 6);
    expect(auroraRatio(40000, 40000)).toBe(RATIO_MIN);
    expect(FRAME_MS).toBeCloseTo(1000 / 30, 6);
  });

  it('fades the sides over a share of the width within its bounds', () => {
    expect(auroraSideFade(1000)).toBeCloseTo(SIDE_SHARE * 1000);
    expect(auroraSideFade(10)).toBe(SIDE_MIN);
    expect(auroraSideFade(100000)).toBe(SIDE_MAX);
  });

  it('lays a wash on a light surface and light on a dark one', () => {
    expect(auroraLight([1, 1, 1])).toBe(true);
    expect(auroraLight([0.04, 0.07, 0.13])).toBe(false);
  });
});

describe('the colour stops', () => {
  it('round-trips sRGB through OKLab and OKLCh', () => {
    for (const rgb of [
      [1, 1, 1],
      [0, 0, 0],
      [0, 0.533, 0],
      [0.224, 0.412, 0.886],
      [0.863, 0.192, 0.216],
    ]) {
      near(auroraOklabToSrgb(auroraSrgbToOklab(rgb)), rgb, 3);
      near(auroraStopToSrgb(auroraStop(rgb)), rgb, 3);
    }
    const [L, C] = auroraStop([1, 1, 1]);
    expect(L).toBeCloseTo(1, 2);
    expect(C).toBeCloseTo(0, 2);
    expect(auroraStop([0, 0, 0])[0]).toBeCloseTo(0, 3);
  });

  it('turns the hue along the shorter arc', () => {
    expect(auroraHueArc(0, 1)).toBeCloseTo(1);
    expect(auroraHueArc(1, 0)).toBeCloseTo(-1);
    expect(auroraHueArc(0.2, Math.PI * 2 - 0.2)).toBeCloseTo(-0.4);
    expect(auroraHueArc(Math.PI * 2 - 0.2, 0.2)).toBeCloseTo(0.4);
    expect(Math.abs(auroraHueArc(0, Math.PI))).toBeCloseTo(Math.PI);
  });

  it('keeps the colour between two stops as saturated as the stops, which an sRGB mix of two hues does not', () => {
    const green = auroraStop([0, 0.533, 0]);
    const blue = auroraStop([0.224, 0.412, 0.886]);
    const violet = auroraStop([0.541, 0.31, 0.812]);
    const stops = [green, blue, violet];
    const midGreenBlue = auroraColorAt(stops, 0.25);
    const midBlueViolet = auroraColorAt(stops, 0.75);
    expect(midGreenBlue[1]).toBeGreaterThanOrEqual(Math.min(green[1], blue[1]) * 0.95);
    expect(midBlueViolet[1]).toBeGreaterThanOrEqual(Math.min(blue[1], violet[1]) * 0.95);
    // The hue is halfway between the two, on the short way round: through teal, not through red.
    expect(midGreenBlue[2]).toBeCloseTo(green[2] + auroraHueArc(green[2], blue[2]) / 2, 6);
    expect(Math.abs(auroraHueArc(green[2], blue[2]))).toBeLessThan(Math.PI);
    // The sRGB midpoint of the same two is greyer: its chroma is well under either stop's.
    const srgbMid = auroraStop([0.112, 0.4725, 0.443]);
    expect(srgbMid[1]).toBeLessThan(Math.min(green[1], blue[1]) * 0.85);
  });

  it('holds each stop at its place and clamps outside the width', () => {
    const stops = [auroraStop([0, 0.533, 0]), auroraStop([0.224, 0.412, 0.886]), auroraStop([0.541, 0.31, 0.812])];
    near(auroraColorAt(stops, 0), stops[0], 6);
    near(auroraColorAt(stops, 0.5), stops[1], 6);
    near(auroraColorAt(stops, 1), stops[2], 6);
    near(auroraColorAt(stops, -1), stops[0], 6);
    near(auroraColorAt(stops, 2), stops[2], 6);
  });
});

// The renderer

const frameOf = (over: Partial<AuroraFrame> = {}): AuroraFrame => ({
  width: 400,
  height: 150,
  scale: 2,
  regionWidth: 800,
  regionHeight: 300,
  edge: 1,
  mirror: 1,
  reach: 0.5,
  wave: WAVE,
  waveFrequency: 2.2,
  rayFrequency: 26,
  waveTime: 0.3,
  rayTime: 1.2,
  hueTime: 0.4,
  layers: 2,
  rays: 0.6,
  glow: 1,
  light: 1,
  sideFade: 176,
  introFade: 1,
  introReach: 1,
  driftAcross: 0,
  driftStretch: 0,
  stops: [new Float32Array([0.5, 0.2, 2.5]), new Float32Array([0.55, 0.2, 4.6]), new Float32Array([0.5, 0.2, 5.4])],
  washAlpha: 0.7,
  washLift: 0.06,
  washChroma: 1.12,
  glowPeak: 1,
  ...over,
});

describe('createAuroraRenderer', () => {
  it('compiles one program and one quad and frees both on destroy', () => {
    const gl = new FakeGL();
    const renderer = createAuroraRenderer(asGL(gl))!;
    expect(renderer).not.toBeNull();
    expect(gl.programs).toHaveLength(1);
    expect(gl.buffers.created).toBe(1);

    renderer.destroy();
    expect(gl.buffers.deleted).toBe(1);
    expect(gl.deletedPrograms).toHaveLength(1);
  });

  it('draws one quad per frame onto the canvas, with every uniform set', () => {
    const gl = new FakeGL();
    const renderer = createAuroraRenderer(asGL(gl))!;
    renderer.render(frameOf({ edge: -1, mirror: -1, layers: 3 }));

    expect(gl.draws).toEqual([{ width: 400, height: 150 }]);
    expect(Object.keys(gl.uniforms).sort()).toEqual([...AURORA_UNIFORMS].sort());
    expect(gl.uniforms['uSize']).toEqual([800, 300]);
    expect(gl.uniforms['uScale']).toEqual([2]);
    expect(gl.uniforms['uAxis']).toEqual([-1, -1]);
    expect(gl.uniforms['uShape']).toEqual([0.5, WAVE, 2.2, 26]);
    expect(gl.uniforms['uMotion'].slice(0, 3).map(v => Math.round(v * 10) / 10)).toEqual([0.3, 1.2, 0.4]);
    expect(gl.uniforms['uMotion'][3]).toBe(3);
    expect(gl.uniforms['uLook']).toEqual([0.6, 1, 1, 176]);
    expect(gl.uniforms['uState']).toEqual([1, 1, 0, 0]);
    expect(gl.uniforms['uStops']).toHaveLength(9);
    expect(gl.uniforms['uStops'][5]).toBeCloseTo(4.6, 5);
    expect(gl.uniforms['uTone'].map(v => Math.round(v * 100) / 100)).toEqual([0.7, 0.06, 1.12, 1]);
  });

  it('is null where a shader does not compile', () => {
    const gl = new FakeGL();
    gl.compiles = false;
    expect(createAuroraRenderer(asGL(gl))).toBeNull();
    expect(gl.deletedPrograms).toHaveLength(0);
  });
});

// The component

describe('WrAurora', () => {
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
    fixture.nativeElement.querySelector<HTMLElement>('wr-aurora')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.wr-aurora__canvas')!;

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
    expect(el.className).toBe('wr-aurora');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.getAttribute('style')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('Why ngwr');
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
    expect(getContext).toHaveBeenCalledWith('webgl2', AURORA_CONTEXT_ATTRIBUTES);
    expect(getContext).toHaveBeenCalledWith('webgl', AURORA_CONTEXT_ATTRIBUTES);
    expect(gl.programs).toHaveLength(1);
    expect(gl.draws).toHaveLength(1);
  });

  it('draws the canvas at half the host and tells the shader the region, the edge and the stops', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    expect(canvas(fixture).width).toBe(400);
    expect(canvas(fixture).height).toBe(150);
    expect(gl.draws[0]).toEqual({ width: 400, height: 150 });
    expect(gl.uniforms['uSize']).toEqual([800, 300]);
    expect(gl.uniforms['uScale']).toEqual([2]);
    expect(gl.uniforms['uAxis']).toEqual([1, 1]);
    expect(gl.uniforms['uShape'][0]).toBe(0.5);
    expect(gl.uniforms['uMotion'][3]).toBe(2);
    expect(gl.uniforms['uStops']).toHaveLength(9);
    expect(gl.uniforms['uState']).toEqual([1, 1, 0, 0]);
    // jsdom resolves no colour, so the fallbacks stand in: lightness in 0..1, a hue in radians.
    expect(gl.uniforms['uStops'][0]).toBeGreaterThan(0);
    expect(gl.uniforms['uStops'][0]).toBeLessThan(1);

    fixture.componentInstance.edge.set('bottom');
    fixture.componentInstance.height.set(0.8);
    fixture.detectChanges();
    await fixture.whenStable();
    tick(90);
    expect(gl.uniforms['uAxis']).toEqual([-1, 1]);
    expect(gl.uniforms['uShape'][0]).toBe(0.8);
  });

  it('keeps the loop going and draws at most thirty frames a second', async () => {
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
    tick(108);
    expect(gl.draws).toHaveLength(3);
    // The clocks moved on between the drawn frames.
    expect(gl.uniforms['uMotion'][0]).toBeGreaterThan(0);
    expect(gl.uniforms['uMotion'][1]).toBeGreaterThan(gl.uniforms['uMotion'][0]);
  });

  it('drifts toward the mouse over the parent and eases back after it leaves', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uState'][2]).toBe(0);

    move(wrap(fixture), 800, 300);
    let now = 40;
    for (let i = 0; i < 90; i++) tick((now += 34));
    const across = gl.uniforms['uState'][2];
    const stretch = gl.uniforms['uState'][3];
    expect(across).toBeGreaterThan(FOLLOW_REACH * 0.9);
    expect(across).toBeLessThanOrEqual(FOLLOW_REACH);
    expect(stretch).toBeGreaterThan(FOLLOW_LIFT * 0.9);

    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    for (let i = 0; i < 200; i++) tick((now += 34));
    expect(gl.uniforms['uState'][2]).toBe(0);
    expect(gl.uniforms['uState'][3]).toBe(0);
  });

  it('ignores a finger, and drifts nowhere with `follow` off', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();
    tick(40);

    move(wrap(fixture), 800, 300, 'touch');
    let now = 40;
    for (let i = 0; i < 30; i++) tick((now += 34));
    expect(gl.uniforms['uState'][2]).toBe(0);

    fixture.componentInstance.follow.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    move(wrap(fixture), 800, 300);
    for (let i = 0; i < 30; i++) tick((now += 34));
    expect(gl.uniforms['uState'][2]).toBe(0);
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
    move(wrap(fixture), 800, 150);
    tick(74);
    tick(108);
    expect(gl.uniforms['uState'][2]).toBeGreaterThan(0);
  });

  it('rests with `speed` at none once the drift has settled, and wakes for the pointer', async () => {
    const fixture = await render();
    fixture.componentInstance.speed.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    layout(800, 300);
    inView();
    // One still frame, no loop.
    expect(pending()).toBe(0);
    expect(gl.draws).toHaveLength(1);

    move(wrap(fixture), 800, 300);
    expect(pending()).toBe(1);
    let now = 0;
    for (let i = 0; i < 400; i++) tick((now += 34));
    expect(pending()).toBe(0);
    expect(gl.uniforms['uState'][2]).toBeCloseTo(FOLLOW_REACH, 6);
  });

  it('runs the intro from the first drawn frame and is whole once it is over', async () => {
    const fixture = await render();
    fixture.componentInstance.intro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uState'][0]).toBe(0);
    expect(gl.uniforms['uState'][1]).toBe(INTRO_REACH_START);

    // Halfway through, at the frame rate: a long gap is clamped, so the clock is ticked as a screen would.
    let now = 40;
    while (now < 40 + INTRO_S * 500) tick((now += 34));
    expect(gl.uniforms['uState'][0]).toBeGreaterThan(0.5);
    expect(gl.uniforms['uState'][0]).toBeLessThan(1);
    expect(gl.uniforms['uState'][1]).toBeLessThan(1);
    for (let i = 0; i < 100; i++) tick((now += 34));
    expect(gl.uniforms['uState'][0]).toBe(1);
    expect(gl.uniforms['uState'][1]).toBe(1);
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

  it('draws one still frame under reduced motion, at rest, and stops a running loop when it is turned on', async () => {
    const page = stub(true);
    const fixture = await render([platform(page)]);
    fixture.componentInstance.intro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    layout(800, 300);
    inView();

    expect(pending()).toBe(0);
    expect(gl.draws).toHaveLength(1);
    // No intro and no drift in the still frame.
    expect(gl.uniforms['uState']).toEqual([1, 1, 0, 0]);
    move(wrap(fixture), 800, 300);
    expect(gl.draws).toHaveLength(1);

    page.prefersReducedMotion.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pending()).toBe(1);
    tick(40);
    tick(74);
    expect(gl.uniforms['uState'][0]).toBeLessThan(1);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(caf).toHaveBeenCalled();
    tick(108);
    expect(pending()).toBe(0);
    expect(gl.uniforms['uState']).toEqual([1, 1, 0, 0]);
  });

  it('runs the stops from the inline start under RTL', async () => {
    const dir = { valueSignal: signal<'ltr' | 'rtl'>('ltr'), value: 'ltr' };
    const fixture = await render([platform(stub()), { provide: Directionality, useValue: dir }]);
    layout(800, 300);
    inView();
    tick(40);
    expect(gl.uniforms['uAxis']).toEqual([1, 1]);

    dir.valueSignal.set('rtl');
    fixture.detectChanges();
    await fixture.whenStable();
    tick(90);
    expect(gl.uniforms['uAxis']).toEqual([1, -1]);
  });

  it('never mounts under forced colours, where the stylesheet draws nothing', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(forced-colors: active)',
        addEventListener: noop,
        removeEventListener: noop,
      }))
    );
    await render();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    expect(getContext).not.toHaveBeenCalled();
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

    canvas(fixture).dispatchEvent(new Event('webglcontextrestored'));
    expect(gl.programs).toHaveLength(2);
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
    tick(74);
    tick(108);

    expect(getContext).toHaveBeenCalledTimes(2);
    expect(gl.draws).toHaveLength(0);
  });

  it('frees the program, the quad and the context, and stops listening, on destroy', async () => {
    const fixture = await render();
    const remove = vi.spyOn(wrap(fixture), 'removeEventListener');
    layout(800, 300);
    inView();
    tick(40);

    fixture.destroy();

    expect(caf).toHaveBeenCalled();
    expect(gl.buffers.deleted).toBe(gl.buffers.created);
    expect(gl.deletedPrograms).toHaveLength(1);
    expect(gl.lost).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(remove.mock.calls.map(c => c[0]).sort()).toEqual(['pointerleave', 'pointermove']);
  });
});
