import { Component, ErrorHandler, PLATFORM_ID, type Type, ViewEncapsulation, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrIridescence } from './iridescence';

@Component({
  imports: [WrIridescence],
  template: `
    <div class="stage">
      <wr-iridescence [color]="color()" [speed]="speed()" [amplitude]="amplitude()" [followPointer]="followPointer()" />
      <p class="copy">Copy in front of the silk</p>
    </div>
  `,
})
class Host {
  readonly color = signal<string | null>(null);
  readonly speed = signal(1);
  readonly amplitude = signal(1);
  readonly followPointer = signal(true);
}

/** The silk as the first child of a shadow root, where it has no parent element. */
@Component({
  selector: 'wr-iridescence-shadow-host',
  imports: [WrIridescence],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `<wr-iridescence [speed]="0" />
    <p class="copy">Copy in front of the silk</p>`,
})
class ShadowHost {}

const TAU = Math.PI * 2;

/** What the component turns its phases at, in radians per second at `speed` 1. */
const RATE = [0.187, 0.283, 0.441];

/** A 60 Hz frame, in seconds: what the first frame of a run advances by. */
const FRAME_S = 1 / 60;

/** The pointer's offset with the pointer on an edge of the box, at `amplitude` 1. */
const REACH = 0.1;

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Folded silk on a WebGL2 canvas. jsdom refuses the context, which is the first state
 * this spec is for: `getContext('webgl2')` returning null is a real browser answer, and
 * the component has to put its canvas up and stop rather than throw. What makes that
 * readable is `.wr-iridescence--painted`, whose absence is the stand-in staying in charge.
 *
 * Everything else mounts `withContext()`: a WebGL2 that records instead of drawing. A
 * draw, in this spec, is one `drawArrays`, and it keeps the four uniforms as they stood
 * at that moment, so every assertion about motion is about what reached the shader. The
 * uniform location IS the uniform's name, so a call that addressed the wrong one files
 * its value under the wrong name and the assertion reading the right one goes red.
 *
 * Frames are held by id and run by hand with a timestamp: whether one is pending is the
 * difference between a loop and none, and a cancel really withdraws it, which matters
 * because Angular's scheduler races rAF against a `setTimeout` and cancels its own.
 *
 * `boot()` runs from `afterNextRender`, and what it throws never reaches `detectChanges()`
 * or `whenStable()`: Angular reports it to the `ErrorHandler` and the fixture carries on,
 * and `wr-aurora`'s first spec passed with a `throw` on the first line of its boot for
 * exactly that reason. Every mount installs a recorder, and `afterEach` reads it.
 */

/** The uniforms as one `drawArrays` saw them. */
interface Draw {
  readonly uResolution: readonly number[];
  readonly uPhase: readonly number[];
  readonly uPointer: readonly number[];
  readonly uColor: readonly number[];
}

/** What the stub answers, and what it was asked. */
interface Recorded {
  compiles: boolean;
  links: boolean;
  lost: boolean;
  options: unknown;
  sources: string[];
  programs: object[];
  buffers: object[];
  deleted: object[];
  released: number;
  /** Whether the lost event the release fires found a listener still on the canvas. */
  heardOwnRelease: boolean;
}

/** Everything `boot()` threw: where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** One entry per `drawArrays`. */
let drawn: Draw[];
/** Frames the page asked for and has not withdrawn, by id. */
let frames: Map<number, FrameRequestCallback>;
let lastFrameId: number;
/** The stub's state. */
let gpu: Recorded;
/** `disconnect()` calls on the resize observer, and the callback it was given. */
let disconnects: number;
let observed: ResizeObserverCallback | null;

/**
 * A WebGL2 that records. `getContext` hands the same stub to every canvas; a call this
 * does not name travels into a no-op. jsdom has no `ResizeObserver` either, so the spec
 * supplies the smallest one it can deliver an entry through and disconnect.
 */
const withContext = (answers: Partial<Pick<Recorded, 'compiles' | 'links' | 'lost'>> = {}): void => {
  gpu = {
    compiles: true,
    links: true,
    lost: false,
    options: undefined,
    sources: [],
    programs: [],
    buffers: [],
    deleted: [],
    released: 0,
    heardOwnRelease: false,
    ...answers,
  };
  const uniforms: Record<string, readonly number[]> = {};
  const stub: Record<string, unknown> = {
    createShader: () => ({}),
    shaderSource: (_shader: unknown, source: string) => {
      gpu.sources.push(source);
    },
    getShaderParameter: () => gpu.compiles,
    getShaderInfoLog: () => 'stub: refused',
    createProgram: () => {
      const program = {};
      gpu.programs.push(program);
      return program;
    },
    getProgramParameter: () => gpu.links,
    getProgramInfoLog: () => 'stub: refused',
    createBuffer: () => {
      const buffer = {};
      gpu.buffers.push(buffer);
      return buffer;
    },
    getAttribLocation: () => 0,
    getUniformLocation: (_program: unknown, name: string) => name,
    isContextLost: () => gpu.lost,
    uniform2f: (location: string, x: number, y: number) => {
      uniforms[location] = [x, y];
    },
    uniform3f: (location: string, x: number, y: number, z: number) => {
      uniforms[location] = [x, y, z];
    },
    drawArrays: () => {
      drawn.push({ ...uniforms } as unknown as Draw);
    },
    deleteProgram: (program: object) => {
      gpu.deleted.push(program);
    },
    deleteBuffer: (buffer: object) => {
      gpu.deleted.push(buffer);
    },
    getExtension: (name: string) =>
      name === 'WEBGL_lose_context'
        ? {
            // What a real release does, synchronously here: the canvas hears it.
            loseContext: () => {
              gpu.released++;
              const event = new Event('webglcontextlost', { cancelable: true });
              (getContext.mock.contexts.at(-1) as HTMLCanvasElement).dispatchEvent(event);
              gpu.heardOwnRelease = event.defaultPrevented;
            },
          }
        : null,
  };
  const proxy = new Proxy(stub, { get: (target, key) => target[key as string] ?? ((): void => undefined) });
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
    _type: string,
    options?: unknown
  ) => {
    gpu.options = options;
    return proxy;
  }) as never);

  class Observer {
    constructor(callback: ResizeObserverCallback) {
      observed = callback;
    }
    observe(): void {
      /* the spec delivers entries by hand */
    }
    unobserve(): void {
      /* as above */
    }
    disconnect(): void {
      disconnects++;
    }
  }
  vi.stubGlobal('ResizeObserver', Observer);

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => {
    frames.set(++lastFrameId, frame);
    return lastFrameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    frames.delete(id);
  });
};

/**
 * A laid-out box for every element, since jsdom lays nothing out. `width` × `height` is
 * the layout box (`clientWidth` / `clientHeight`); `rect` is the box as painted, after
 * transforms, which is the same box unless a spec scales it.
 */
const box = (width: number, height: number, rect = { left: 0, top: 0, width, height }): void => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...rect,
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  });
};

/** Deliver a resize observer entry for a `width` × `height` content box. */
const resized = (width: number, height: number): void => {
  observed!([{ contentRect: { width, height } }] as never, {} as never);
};

/** Run every frame the page is holding, once, stamped `time`. */
const runFrame = (time: number): void => {
  const pending = [...frames.values()];
  frames.clear();
  for (const frame of pending) frame(time);
};

/** The uniforms of the last draw. */
const last = (): Draw => drawn[drawn.length - 1];

/** The stubbed intersection observer: `report` is what the component gave it, `null` once disconnected. */
const withIntersection = (): { report: ((entries: { isIntersecting: boolean }[]) => void) | null } => {
  const io: { report: ((entries: { isIntersecting: boolean }[]) => void) | null } = { report: null };
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        io.report = callback;
      }
      observe(): void {
        /* the spec reports by hand */
      }
      disconnect(): void {
        io.report = null;
      }
    }
  );
  return io;
};

describe('WrIridescence', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const canvas = (): HTMLCanvasElement => root().querySelector('canvas')!;
  const silk = (): HTMLElement => root().querySelector<HTMLElement>('wr-iridescence')!;
  const stage = (): HTMLElement => root().querySelector<HTMLElement>('.stage')!;
  const copy = (): HTMLElement => root().querySelector<HTMLElement>('.copy')!;
  const isPainted = (): boolean => silk().classList.contains('wr-iridescence--painted');
  const hook = (): string => silk().style.getPropertyValue('--wr-iridescence-color');
  const pointer = (type: string, target: Element, x = 0, y = 0): void => {
    target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true }));
  };
  const flush = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const set = async (apply: (host: Host) => void): Promise<void> => {
    apply(fixture.componentInstance);
    await flush();
  };

  const mount = async (
    providers: unknown[] = [],
    configure: (host: Host) => void = () => undefined,
    component: Type<unknown> = Host
  ): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...providers,
      ] as never[],
    });
    // Only the shadow-root spec mounts another host, and it reads no input off it.
    fixture = TestBed.createComponent(component) as ComponentFixture<Host>;
    configure(fixture.componentInstance);
    await flush();
  };

  /** Pointer listeners the spied `addEventListener` saw, with the element each went on. */
  const pointerListeners = (spy: {
    readonly mock: { readonly calls: readonly (readonly unknown[])[]; readonly contexts: readonly unknown[] };
  }): { type: string; target: unknown; options: unknown }[] =>
    spy.mock.calls
      .map((call, i) => ({ type: call[0] as string, target: spy.mock.contexts[i], options: call[2] }))
      .filter(entry => entry.type.startsWith('pointer'));

  beforeEach(async () => {
    thrown = [];
    drawn = [];
    frames = new Map();
    lastFrameId = 0;
    disconnects = 0;
    observed = null;
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // Read here so no spec can forget it: a boot that died looks like a quiet pass.
    expect(thrown).toEqual([]);
  });

  describe('with no context, or none it can use', () => {
    it('renders a canvas that is decoration, not content', () => {
      expect(canvas().getAttribute('aria-hidden')).toBe('true');
      expect(silk().hasAttribute('role')).toBe(false);
      expect(silk().hasAttribute('tabindex')).toBe(false);
      expect(silk().querySelector('[tabindex], a, button, input')).toBeNull();
    });

    it('survives a browser with no WebGL2: the canvas is up, the stand-in in charge, nothing thrown', async () => {
      expect(canvas()).not.toBeNull();
      expect(isPainted()).toBe(false);

      await set(host => {
        host.color.set('#ff0000');
        host.speed.set(2);
        host.amplitude.set(2);
        host.followPointer.set(false);
      });
      pointer('pointermove', stage(), 10, 10);

      expect(isPainted()).toBe(false);
    });

    it('asks for the context the design calls for, alpha on so a failure shows the stand-in', async () => {
      withContext();
      box(320, 180);
      await mount();

      expect(vi.spyOn(HTMLCanvasElement.prototype, 'getContext')).toHaveBeenCalledWith('webgl2', expect.anything());
      expect(gpu.options).toEqual({ alpha: true, antialias: false, depth: false, stencil: false });
    });

    it('logs a shader the driver refuses, paints nothing and starts no loop', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      withContext({ compiles: false });
      box(320, 180);
      await mount();

      expect(error).toHaveBeenCalled();
      expect(frames.size).toBe(0);
      expect(drawn).toEqual([]);
      expect(isPainted()).toBe(false);
      expect(gpu.programs).toEqual([]);
      expect(observed, 'and sets nothing else up').toBeNull();
      expect(gpu.released, 'nor keeps a context it will never draw on').toBe(1);
    });

    it('logs a program that will not link, paints nothing and starts no loop', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      withContext({ links: false });
      box(320, 180);
      await mount();

      expect(error).toHaveBeenCalled();
      expect(frames.size).toBe(0);
      expect(drawn).toEqual([]);
      expect(isPainted()).toBe(false);
      expect(gpu.deleted).toHaveLength(1);
      expect(gpu.deleted[0]).toBe(gpu.programs[0]);
      expect(gpu.released).toBe(1);
    });

    it('does not call a context that arrived lost a broken shader, and builds when it comes back', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      withContext({ lost: true, compiles: false, links: false });
      box(320, 180);
      await mount();

      expect(error).not.toHaveBeenCalled();
      expect(frames.size).toBe(0);
      expect(isPainted()).toBe(false);

      gpu.lost = false;
      gpu.compiles = true;
      gpu.links = true;
      canvas().dispatchEvent(new Event('webglcontextrestored'));
      await flush();
      runFrame(1000);
      await flush();

      expect(drawn).toHaveLength(1);
      expect(isPainted()).toBe(true);
    });

    it('renders the canvas on the server and boots nothing', async () => {
      withContext();
      box(320, 180);
      await mount([{ provide: PLATFORM_ID, useValue: 'server' }], host => host.color.set('#00ff00'));

      expect(canvas()).not.toBeNull();
      expect(vi.spyOn(HTMLCanvasElement.prototype, 'getContext')).not.toHaveBeenCalled();
      expect(frames.size).toBe(0);
      expect(observed).toBeNull();
      expect(isPainted()).toBe(false);
      // The prerendered stand-in takes the tint: it is all a visitor sees before hydration.
      expect(hook()).toBe('#00ff00');
    });
  });

  describe('the shader', () => {
    it('hands the driver both sources from their first character, declaring the four uniforms', async () => {
      withContext();
      box(320, 180);
      await mount();

      // A newline before `#version` is a compile error in every driver, and a stub
      // cannot notice it unless it is asked.
      expect(gpu.sources).toHaveLength(2);
      for (const source of gpu.sources) expect(source.startsWith('#version 300 es\n')).toBe(true);
      for (const declaration of ['vec2 uResolution', 'vec3 uPhase', 'vec2 uPointer', 'vec3 uColor']) {
        expect(gpu.sources[1]).toContain(`uniform ${declaration};`);
      }
    });

    it('dithers on the pixel alone: noise tied to a phase would shimmer on a held picture', async () => {
      withContext();
      box(320, 180);
      await mount();

      const dither = gpu.sources[1].split('\n').find(line => line.includes('float dither'))!;
      expect(dither).toContain('gl_FragCoord');
      expect(dither).not.toMatch(/\bph\b|uPhase/);
      expect(gpu.sources[1]).toContain('dither / 255.0');
    });
  });

  describe('painted', () => {
    it('is set by the first real draw, not by the boot', async () => {
      withContext();
      box(320, 180);
      await mount();

      // Booted and looping, with nothing drawn yet.
      expect(frames.size).toBe(1);
      expect(drawn).toEqual([]);
      expect(isPainted()).toBe(false);

      runFrame(1000);
      await flush();

      expect(drawn).toHaveLength(1);
      expect(isPainted()).toBe(true);
    });

    it('stays false on an empty box, and the box arriving draws at once', async () => {
      withContext();
      box(0, 0);
      await mount();
      runFrame(1000);
      runFrame(1016);
      await flush();

      expect(drawn).toEqual([]);
      expect(isPainted()).toBe(false);

      resized(320, 180);
      await flush();

      expect(drawn).toHaveLength(1);
      expect(isPainted()).toBe(true);
    });
  });

  describe('phases', () => {
    const inRange = (phase: readonly number[]): boolean => phase.every(p => p >= 0 && p < TAU);

    /** How far each phase moved between two draws, the short way round. */
    const moved = (from: readonly number[], to: readonly number[]): number[] =>
      to.map((p, i) => {
        const delta = (p - from[i]) % TAU;
        if (delta > Math.PI) return delta - TAU;
        return delta < -Math.PI ? delta + TAU : delta;
      });

    it('counts the first frame of a run as one 60 Hz frame, with nothing to measure from', async () => {
      withContext();
      box(320, 180);
      await mount();

      runFrame(123_456);

      last().uPhase.forEach((phase, i) => expect(phase).toBeCloseTo(RATE[i] * FRAME_S, 10));
    });

    it('steps each phase by its own rate and the time that really passed', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const before = last().uPhase;

      runFrame(1020);

      moved(before, last().uPhase).forEach((delta, i) => expect(delta).toBeCloseTo(RATE[i] * 0.02, 10));
    });

    it('counts a timestamp that did not advance as one 60 Hz frame', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);

      for (const stamp of [1000, 900]) {
        const before = last().uPhase;
        runFrame(stamp);
        moved(before, last().uPhase).forEach((delta, i) => expect(delta).toBeCloseTo(RATE[i] * FRAME_S, 10));
      }
    });

    it('clamps a huge gap to 50 ms, so a tab that wakes does not jump', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const before = last().uPhase;

      runFrame(1000 + 3_600_000);

      moved(before, last().uPhase).forEach((delta, i) => expect(delta).toBeCloseTo(RATE[i] * 0.05, 10));
    });

    it('stays in [0, 2π) across many large frames, and really does wrap', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(40));

      let wraps = 0;
      let previous = [0, 0, 0] as readonly number[];
      for (let i = 0; i < 3000; i++) {
        runFrame(1000 + i * 50);
        expect(inRange(last().uPhase)).toBe(true);
        if (last().uPhase[2] < previous[2]) wraps++;
        previous = last().uPhase;
      }
      expect(wraps).toBeGreaterThan(100);
    });

    it('lands a negative speed in [0, 2π) as well, moving the other way', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(-40));

      runFrame(1000);
      // From 0, one step backwards lands just under a full turn, not under zero.
      last().uPhase.forEach((phase, i) => expect(phase).toBeCloseTo(TAU - RATE[i] * FRAME_S * 40, 10));
      for (let i = 1; i < 3000; i++) {
        runFrame(1000 + i * 50);
        expect(inRange(last().uPhase)).toBe(true);
      }
    });

    it('never lands on 2π itself, which a tiny negative step rounds up to', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(-1e-18));

      runFrame(1000);

      expect(inRange(last().uPhase)).toBe(true);
    });

    it('keeps a phase a number when the speed is not one, and carries on afterwards', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(Infinity));

      runFrame(1000);
      expect(inRange(last().uPhase)).toBe(true);

      await set(host => host.speed.set(1));
      runFrame(1020);
      expect(inRange(last().uPhase)).toBe(true);
      expect(last().uPhase[2]).toBeGreaterThan(0);
    });

    it('holds its precision however long the tab stays open: no clock, so nothing to lose', async () => {
      withContext();
      box(320, 180);
      await mount();
      const week = 7 * 24 * 3600 * 1000;
      runFrame(week);
      const before = last().uPhase;

      runFrame(week + 20);

      // Single precision would round a week's worth of seconds to a quarter of one.
      moved(before, last().uPhase).forEach((delta, i) => expect(delta).toBeCloseTo(RATE[i] * 0.02, 12));
    });

    it('advances twice as far at speed 2 as at speed 1, over frames of equal delta', async () => {
      const step = async (speed: number): Promise<number[]> => {
        drawn = [];
        withContext();
        box(320, 180);
        await mount([], host => host.speed.set(speed));
        runFrame(1000);
        const before = last().uPhase;
        runFrame(1016);
        const delta = moved(before, last().uPhase);
        fixture.destroy();
        vi.restoreAllMocks();
        return delta;
      };

      const once = await step(1);
      const twice = await step(2);

      twice.forEach((delta, i) => expect(delta).toBeCloseTo(once[i] * 2, 10));
    });

    it('changing the speed mid-run moves the phase by one frame, not a jump', async () => {
      withContext();
      box(320, 180);
      await mount();
      // A long run first. A clock times `speed` would land the change here somewhere else
      // entirely, by the whole time so far times the difference.
      let now = 1000;
      for (let i = 0; i < 2000; i++) runFrame((now += 16));
      const before = last().uPhase;

      await set(host => host.speed.set(3));
      runFrame(now + 16);

      moved(before, last().uPhase).forEach((delta, i) => expect(delta).toBeCloseTo(RATE[i] * 0.016 * 3, 10));
      expect(frames.size, 'and the loop was not restarted for it').toBe(1);
    });

    it('holds at speed 0 and reverses below it, from where it was', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      runFrame(1016);
      const held = last().uPhase;

      await set(host => host.speed.set(0));
      await set(host => host.color.set('#ff0000'));
      runFrame(1032);
      expect(last().uPhase).toEqual(held);

      await set(host => host.speed.set(-1));
      runFrame(1048);
      moved(held, last().uPhase).forEach((delta, i) => expect(delta).toBeCloseTo(-RATE[i] * 0.016, 10));
    });
  });

  describe('the loop', () => {
    it('draws every frame while the folds move', async () => {
      withContext();
      box(320, 180);
      await mount();

      runFrame(1000);
      runFrame(1016);
      runFrame(1032);

      expect(drawn).toHaveLength(3);
      expect(frames.size).toBe(1);
    });

    it('keeps running at speed 0 with the pointer followed, and draws nothing that would repeat', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(0));

      runFrame(1000);
      expect(drawn, 'the first frame of a run always draws').toHaveLength(1);

      runFrame(1016);
      runFrame(1032);

      expect(drawn).toHaveLength(1);
      expect(frames.size).toBe(1);
    });

    for (const [name, configure] of [
      ['followPointer off', (host: Host) => host.followPointer.set(false)],
      ['amplitude 0', (host: Host) => host.amplitude.set(0)],
    ] as const) {
      it(`asks for no frames at all at speed 0 with ${name}, and holds one still frame`, async () => {
        withContext();
        box(320, 180);
        await mount([], host => {
          host.speed.set(0);
          configure(host);
        });

        expect(frames.size).toBe(0);
        expect(drawn).toHaveLength(1);
        expect(last().uPhase).toEqual([0, 0, 0]);
        expect(isPainted()).toBe(true);
      });
    }

    it('goes back to the theme on a still frame at speed 0 as well', async () => {
      withContext();
      box(320, 180);
      await mount([], host => {
        host.speed.set(0);
        host.followPointer.set(false);
        host.color.set('#00ff00');
      });
      expect(last().uColor).toEqual([0, 1, 0]);

      await set(host => host.color.set(''));

      expect(hook()).toBe('');
      expect(last().uColor).toEqual([1, 1, 1]);
    });

    it('lets a running loop draw a held picture again when the colour changes', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(0));
      runFrame(1000);
      runFrame(1016);
      expect(drawn).toHaveLength(1);

      await set(host => host.color.set('#ff0000'));
      runFrame(1032);
      expect(drawn).toHaveLength(2);
      expect(last().uColor).toEqual([1, 0, 0]);

      runFrame(1048);
      expect(drawn, 'and only the once').toHaveLength(2);
    });

    it('lets a running loop draw a held picture again when the scheme changes', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.speed.set(0));
      runFrame(1000);
      silk().style.setProperty('--wr-iridescence-color', '#0000ff');
      runFrame(1016);
      expect(drawn, 'a changed hook alone wakes nothing').toHaveLength(1);

      document.documentElement.style.colorScheme = 'dark';
      try {
        await new Promise(resolve => setTimeout(resolve));
        runFrame(1032);

        expect(drawn).toHaveLength(2);
        expect(last().uColor).toEqual([0, 0, 1]);
      } finally {
        document.documentElement.style.removeProperty('color-scheme');
      }
    });

    it('ignores a frame the browser had already handed over when the loop stopped', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const late = [...frames.values()];
      const count = drawn.length;

      await set(host => {
        host.speed.set(0);
        host.followPointer.set(false);
      });
      const still = drawn.length;
      expect(still, 'the still frame takes over').toBe(count + 1);
      expect(frames.size).toBe(0);

      late[0](1016);

      expect(drawn).toHaveLength(still);
      expect(frames.size, 'and it does not start a loop nobody would stop').toBe(0);
    });
  });

  describe('the pointer', () => {
    /** Run frames until the pointer stops moving; fails rather than spin forever. */
    const settle = (from: number): number => {
      let now = from;
      for (let i = 0; i < 2000; i++) {
        const before = drawn.length;
        runFrame((now += 16));
        if (drawn.length === before) return now;
      }
      throw new Error('the pointer never came to rest');
    };

    /** A held picture with the pointer loop running, so only the pointer can cause a draw. */
    const heldSilk = async (configure: (host: Host) => void = () => undefined): Promise<void> => {
      withContext();
      box(400, 200);
      await mount([], host => {
        host.speed.set(0);
        configure(host);
      });
      runFrame(0);
    };

    it('listens on the parent, passively, and never on the host', async () => {
      const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
      withContext();
      box(400, 200);
      await mount();

      const listeners = pointerListeners(add);
      expect(listeners.map(entry => entry.type).sort()).toEqual(['pointercancel', 'pointerleave', 'pointermove']);
      for (const entry of listeners) {
        expect(entry.target).toBe(stage());
        expect(entry.options).toEqual({ passive: true });
      }
    });

    it('hears a pointer over the content in front of the canvas', async () => {
      await heldSilk();

      pointer('pointermove', copy(), 300, 50);
      runFrame(16);

      expect(last().uPointer[0]).toBeGreaterThan(0);
    });

    it('follows the pointer on the shadow host when it sits directly in a shadow root', async () => {
      withContext();
      box(400, 200);
      await mount([], undefined, ShadowHost);
      const shadow = root().shadowRoot!;
      expect(shadow.querySelector('wr-iridescence')!.parentElement).toBeNull();
      runFrame(0);

      shadow
        .querySelector('.copy')!
        .dispatchEvent(new PointerEvent('pointermove', { clientX: 300, clientY: 50, bubbles: true, composed: true }));
      runFrame(16);

      expect(last().uPointer[0]).toBeGreaterThan(0);
    });

    it('takes no listeners with followPointer off, with amplitude 0 or under reduced motion', async () => {
      const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
      withContext();
      box(400, 200);

      await mount([], host => host.followPointer.set(false));
      expect(pointerListeners(add), 'followPointer off').toEqual([]);

      await mount([], host => host.amplitude.set(0));
      expect(pointerListeners(add), 'amplitude 0').toEqual([]);

      await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
      expect(pointerListeners(add), 'reduced motion').toEqual([]);
    });

    it('takes its listeners off when followPointer goes, and the picture eases back to rest', async () => {
      withContext();
      box(400, 200);
      await mount();
      runFrame(0);
      pointer('pointermove', stage(), 400, 0);
      for (let t = 16; t <= 800; t += 16) runFrame(t);
      expect(last().uPointer[0]).toBeCloseTo(REACH, 1);
      const remove = vi.spyOn(stage(), 'removeEventListener');

      await set(host => host.followPointer.set(false));
      for (const type of ['pointermove', 'pointerleave', 'pointercancel']) {
        expect(remove).toHaveBeenCalledWith(type, expect.any(Function));
      }

      // Still moving, so the loop carries on, and there is no jump back.
      runFrame(816);
      expect(last().uPointer[0]).toBeGreaterThan(REACH / 2);
      pointer('pointermove', stage(), 0, 0);
      for (let t = 832; t <= 4000; t += 16) runFrame(t);
      expect(last().uPointer).toEqual([0, 0]);
    });

    it('eases towards the target, then lands on it exactly and stops drawing', async () => {
      await heldSilk();

      // Three quarters across and a quarter down.
      pointer('pointermove', stage(), 300, 50);
      runFrame(16);

      const target = [0.25 * 2 * REACH, 0.25 * 2 * REACH];
      const share = 1 - Math.exp(-16 / 250);
      expect(last().uPointer[0]).toBeCloseTo(target[0] * share, 6);
      expect(last().uPointer[1]).toBeCloseTo(target[1] * share, 6);

      let previous = last().uPointer[0];
      for (let t = 32; t <= 160; t += 16) {
        runFrame(t);
        expect(last().uPointer[0]).toBeGreaterThan(previous);
        expect(last().uPointer[0]).toBeLessThan(target[0]);
        previous = last().uPointer[0];
      }

      settle(160);
      expect(last().uPointer[0]).toBeCloseTo(target[0], 6);
      expect(last().uPointer[1]).toBeCloseTo(target[1], 6);
      expect(last().uPointer[0], 'landed, not asymptotically close').toBe(target[0]);
      expect(last().uPointer[1]).toBe(target[1]);
    });

    it('eases by time, not by frames, so a 120 Hz screen follows at the same pace', async () => {
      await heldSilk();
      pointer('pointermove', stage(), 400, 0);
      runFrame(16);
      runFrame(32);
      const atSixty = last().uPointer[0];

      await heldSilk();
      pointer('pointermove', stage(), 400, 0);
      for (const t of [8, 16, 24, 32]) runFrame(t);

      expect(last().uPointer[0]).toBeCloseTo(atSixty, 10);
    });

    it('flips y into GL: the top of the box is up', async () => {
      await heldSilk();

      pointer('pointermove', stage(), 200, 0);
      settle(0);
      expect(last().uPointer[0]).toBe(0);
      expect(last().uPointer[1]).toBeCloseTo(REACH, 10);

      pointer('pointermove', stage(), 200, 200);
      settle(10_000);
      expect(last().uPointer[1]).toBeCloseTo(-REACH, 10);
    });

    it('rests at the centre: a pointer there offsets nothing', async () => {
      await heldSilk();
      const before = drawn.length;

      pointer('pointermove', stage(), 200, 100);
      runFrame(16);

      expect(drawn).toHaveLength(before);
    });

    it('clamps to the box, wherever on the parent the pointer really is', async () => {
      await heldSilk();

      pointer('pointermove', stage(), 5000, -5000);
      settle(0);

      expect(last().uPointer[0]).toBeCloseTo(REACH, 10);
      expect(last().uPointer[1]).toBeCloseTo(REACH, 10);
    });

    it('maps through the rect, so a transform on an ancestor does not matter', async () => {
      withContext();
      // Laid out at 400 × 200 and scaled to half, off at (100, 50).
      box(400, 200, { left: 100, top: 50, width: 200, height: 100 });
      await mount([], host => host.speed.set(0));
      runFrame(0);

      // Three quarters across and a quarter down of the box as drawn.
      pointer('pointermove', stage(), 250, 75);
      settle(0);

      expect(last().uPointer[0]).toBeCloseTo(0.25 * 2 * REACH, 10);
      expect(last().uPointer[1]).toBeCloseTo(0.25 * 2 * REACH, 10);
    });

    it('survives a box with no rect, without a NaN reaching the shader', async () => {
      withContext();
      box(400, 200, { left: 0, top: 0, width: 0, height: 0 });
      await mount([], host => host.speed.set(0));
      runFrame(0);

      pointer('pointermove', stage(), 300, 50);
      runFrame(16);

      expect(last().uPointer).toEqual([0, 0]);
    });

    it('reads the rect at most once a frame, and not on a frame with no move', async () => {
      await heldSilk();
      const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
      rect.mockClear();

      pointer('pointermove', stage(), 300, 50);
      pointer('pointermove', stage(), 310, 50);
      pointer('pointermove', stage(), 320, 50);
      expect(rect, 'not on the event').not.toHaveBeenCalled();

      runFrame(16);
      expect(rect).toHaveBeenCalledTimes(1);

      runFrame(32);
      expect(rect).toHaveBeenCalledTimes(1);
    });

    for (const type of ['pointerleave', 'pointercancel']) {
      it(`returns to (0, 0) after ${type}, easing rather than jumping, then costs nothing`, async () => {
        await heldSilk();
        pointer('pointermove', stage(), 400, 0);
        const rested = settle(0);
        expect(last().uPointer[0]).toBeCloseTo(REACH, 10);

        stage().dispatchEvent(new PointerEvent(type));
        runFrame(rested + 16);
        expect(last().uPointer[0], 'on its way').toBeGreaterThan(0);
        expect(last().uPointer[0]).toBeLessThan(REACH);

        const home = settle(rested + 16);
        expect(last().uPointer).toEqual([0, 0]);

        const count = drawn.length;
        runFrame(home + 16);
        runFrame(home + 32);
        expect(drawn, 'a resting pointer costs no redraw').toHaveLength(count);
      });
    }

    it('honours amplitude, and a negative one stirs the other way', async () => {
      await heldSilk(host => host.amplitude.set(2));
      pointer('pointermove', stage(), 400, 0);
      settle(0);
      expect(last().uPointer[0]).toBeCloseTo(REACH * 2, 10);
      expect(last().uPointer[1]).toBeCloseTo(REACH * 2, 10);

      await heldSilk(host => host.amplitude.set(-1));
      pointer('pointermove', stage(), 400, 0);
      settle(0);
      expect(last().uPointer[0]).toBeCloseTo(-REACH, 10);
      expect(last().uPointer[1]).toBeCloseTo(-REACH, 10);
    });

    it('eases a changed amplitude over rather than jumping to it', async () => {
      await heldSilk();
      pointer('pointermove', stage(), 400, 0);
      const rested = settle(0);

      await set(host => host.amplitude.set(3));
      runFrame(rested + 16);

      expect(last().uPointer[0]).toBeGreaterThan(REACH);
      expect(last().uPointer[0]).toBeLessThan(REACH * 1.5);
    });

    it('holds the pointer rather than hand the shader an amplitude that is not finite', async () => {
      await heldSilk();
      pointer('pointermove', stage(), 400, 0);
      const rested = settle(0);
      const held = last().uPointer;

      // At the box's centre the aim is 0, and 0 times `Infinity` is `NaN`, which every later
      // step would add to for good.
      await set(host => host.amplitude.set(Infinity));
      pointer('pointermove', stage(), 200, 100);
      runFrame(rested + 16);
      pointer('pointermove', stage(), 400, 0);
      runFrame(rested + 32);
      expect(last().uPointer).toEqual(held);

      await set(host => host.amplitude.set(1));
      pointer('pointermove', stage(), 200, 100);
      settle(rested + 48);
      expect(last().uPointer).toEqual([0, 0]);
    });

    it('leaves the pointer out at amplitude 0 even with one on its way back', async () => {
      await heldSilk();
      pointer('pointermove', stage(), 400, 0);
      settle(0);

      // Listeners gone and nothing left to move at speed 0, so the still frame takes over at rest.
      await set(host => host.amplitude.set(0));

      expect(frames.size).toBe(0);
      expect(last().uPointer).toEqual([0, 0]);
    });
  });

  describe('reduced motion', () => {
    const reduced = (): unknown => ({ provide: WrPlatform, useValue: reducedMotion });

    it('draws one frame, asks for none and listens for nothing', async () => {
      const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
      withContext();
      box(320, 180);
      await mount([reduced()]);

      expect(drawn).toHaveLength(1);
      expect(frames.size).toBe(0);
      expect(pointerListeners(add)).toEqual([]);
      expect(isPainted()).toBe(true);
      expect(last().uPointer).toEqual([0, 0]);
    });

    it('redraws the still frame when the colour scheme changes', async () => {
      withContext();
      box(320, 180);
      await mount([reduced()]);
      silk().style.setProperty('--wr-iridescence-color', '#ff0000');
      expect(drawn, 'a changed hook alone redraws nothing').toHaveLength(1);

      document.documentElement.style.colorScheme = 'dark';
      try {
        await new Promise(resolve => setTimeout(resolve));

        expect(drawn).toHaveLength(2);
        expect(last().uColor).toEqual([1, 0, 0]);
        expect(frames.size).toBe(0);
      } finally {
        document.documentElement.style.removeProperty('color-scheme');
      }
    });

    it('redraws the still frame when the colour input changes', async () => {
      withContext();
      box(320, 180);
      await mount([reduced()]);

      await set(host => host.color.set('#00ff00'));

      expect(drawn).toHaveLength(2);
      expect(last().uColor).toEqual([0, 1, 0]);
      expect(frames.size).toBe(0);
    });

    it('goes back to the theme when the colour is unset, reading the hook after the binding took it off', async () => {
      withContext();
      box(320, 180);
      await mount([reduced()]);
      await set(host => host.color.set('#00ff00'));

      await set(host => host.color.set(null));

      expect(hook()).toBe('');
      expect(drawn).toHaveLength(3);
      expect(last().uColor).toEqual([1, 1, 1]);
    });

    it('redraws the still frame at once when the box resizes', async () => {
      withContext();
      box(320, 180);
      await mount([reduced()]);

      resized(640, 360);

      expect(drawn).toHaveLength(2);
      expect(last().uResolution).toEqual([640, 360]);
    });

    it('holds the phases and rests the pointer when the preference is switched on, and resumes when it is off', async () => {
      const reduce = signal(false);
      withContext();
      box(400, 200);
      await mount([{ provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: reduce } }]);
      let now = 0;
      for (let i = 0; i < 40; i++) runFrame((now += 16));
      pointer('pointermove', stage(), 400, 0);
      for (let i = 0; i < 10; i++) runFrame((now += 16));
      const reached = last();
      expect(reached.uPointer[0]).toBeGreaterThan(0);
      expect(reached.uPhase[0]).toBeGreaterThan(0);
      const remove = vi.spyOn(stage(), 'removeEventListener');

      reduce.set(true);
      await flush();

      // Exactly where they were: a still frame at 0 would jump the folds.
      expect(last().uPhase).toEqual(reached.uPhase);
      expect(last().uPointer).toEqual([0, 0]);
      expect(frames.size).toBe(0);
      expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));

      const still = drawn.length;
      pointer('pointermove', stage(), 0, 0);
      expect(drawn).toHaveLength(still);

      reduce.set(false);
      await flush();
      runFrame((now += 16));
      runFrame(now + 16);

      expect(drawn.length).toBeGreaterThan(still);
      expect(last().uPhase[0]).toBeGreaterThan(reached.uPhase[0]);
      expect(last().uPhase[0] - reached.uPhase[0]).toBeLessThan(RATE[0] * 0.05);
    });
  });

  describe('off screen', () => {
    it('asks for no frames while off screen, and resumes without a jump', async () => {
      const io = withIntersection();
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const before = last().uPhase;
      const count = drawn.length;

      io.report!([{ isIntersecting: false }]);
      await flush();

      expect(frames.size).toBe(0);
      expect(drawn).toHaveLength(count);

      // A long time away, which the first frame back knows nothing about.
      io.report!([{ isIntersecting: true }]);
      await flush();
      expect(frames.size).toBe(1);
      runFrame(1000 + 3_600_000);

      expect(drawn).toHaveLength(count + 1);
      last().uPhase.forEach((phase, i) => expect(phase - before[i]).toBeCloseTo(RATE[i] * FRAME_S, 10));
    });

    it('asks for no frames with no box to draw on, and resumes in place when it has one', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const before = last().uPhase;

      resized(320, 0);
      await flush();
      expect(frames.size).toBe(0);

      resized(320, 180);
      await flush();
      expect(last().uPhase).toEqual(before);
      expect(frames.size).toBe(1);
    });

    it('starts no loop in a box that is empty from the first, until it has a size', async () => {
      withContext();
      box(0, 0);
      await mount();
      expect(frames.size).toBe(0);

      resized(320, 180);
      await flush();
      expect(drawn).toHaveLength(1);
      expect(frames.size).toBe(1);
    });

    it('watches the canvas, so a canvas hidden under forced colours stops the loop too', async () => {
      withIntersection();
      const observe = vi.spyOn(IntersectionObserver.prototype, 'observe');
      withContext();
      box(320, 180);
      await mount();

      expect(observe).toHaveBeenCalledWith(canvas());
    });

    it('takes the pointer listeners off with the loop, and does not start a second one', async () => {
      const io = withIntersection();
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const remove = vi.spyOn(stage(), 'removeEventListener');

      io.report!([{ isIntersecting: false }]);
      await flush();
      expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));

      io.report!([{ isIntersecting: true }]);
      io.report!([{ isIntersecting: true }]);
      await flush();
      expect(frames.size).toBe(1);
    });

    it('counts as visible with no observer at all', async () => {
      withContext();
      box(320, 180);
      vi.stubGlobal('IntersectionObserver', undefined);
      await mount();

      expect(frames.size).toBe(1);
    });
  });

  describe('the bitmap', () => {
    it('backs the canvas at CSS pixels, whatever the screen', async () => {
      vi.stubGlobal('devicePixelRatio', 2);
      withContext();
      box(800, 600);
      await mount();
      runFrame(1000);

      expect([canvas().width, canvas().height]).toEqual([800, 600]);
      expect(last().uResolution).toEqual([800, 600]);
    });

    it('scales a large box under the budget, both sides alike, and uResolution follows', async () => {
      withContext();
      box(4000, 3000);
      await mount();
      runFrame(1000);

      const { width, height } = canvas();
      expect(width * height).toBeLessThanOrEqual(2_000_000);
      // Not a timid guess under the budget either: within a few rows of it.
      expect(width * height).toBeGreaterThan(1_995_000);
      expect(width / height).toBeCloseTo(4 / 3, 2);
      expect(last().uResolution).toEqual([width, height]);
    });

    it('stays under budget where rounding to nearest would carry it back over', async () => {
      withContext();
      // 1732.05 × 1154.7 at the budget's scale, which rounds to 2,000,460.
      box(3000, 2000);
      await mount();

      expect(canvas().width * canvas().height).toBeLessThanOrEqual(2_000_000);
    });

    it('takes the size from the layout box, not the rect, so a scale-in does not stretch it', async () => {
      withContext();
      box(400, 200, { left: 0, top: 0, width: 384, height: 192 });
      await mount();

      expect([canvas().width, canvas().height]).toEqual([400, 200]);
    });

    it('leaves an unchanged box alone: writing canvas.width clears the bitmap', async () => {
      withContext();
      box(800, 600);
      await mount();
      runFrame(1000);
      const width = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
      const height = vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set');
      const count = drawn.length;

      resized(800, 600);
      resized(800.4, 600.4);

      expect(width).not.toHaveBeenCalled();
      expect(height).not.toHaveBeenCalled();
      expect(drawn, 'and a bitmap nothing cleared needs no redraw').toHaveLength(count);
    });

    it('redraws inside the observer callback, not a frame later, so a resize drag does not flicker', async () => {
      withContext();
      box(800, 600);
      await mount();
      runFrame(1000);
      const count = drawn.length;

      resized(640, 360);

      expect(drawn).toHaveLength(count + 1);
      expect([canvas().width, canvas().height]).toEqual([640, 360]);
      expect(last().uResolution).toEqual([640, 360]);
    });

    it('works with no ResizeObserver at all', async () => {
      withContext();
      vi.stubGlobal('ResizeObserver', undefined);
      box(320, 180);
      await mount();
      runFrame(1000);

      expect(last().uResolution).toEqual([320, 180]);
    });

    it('does not take a fresh canvas for sized when the box is the default 300 × 150', async () => {
      withContext();
      box(300, 150);
      await mount();
      runFrame(1000);

      expect(last().uResolution).toEqual([300, 150]);
    });
  });

  describe('colour', () => {
    it('leaves the hook in charge when unset', async () => {
      withContext();
      box(320, 180);
      await mount();

      silk().style.setProperty('--wr-iridescence-color', '#ff0000');
      runFrame(1000);

      expect(last().uColor).toEqual([1, 0, 0]);
    });

    it('writes a chosen colour on the hook for the stand-in, and hands the shader its channels', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.color.set('#00ff00'));
      runFrame(1000);

      expect(hook()).toBe('#00ff00');
      expect(last().uColor).toEqual([0, 1, 0]);
    });

    it('ignores alpha, and reads a colour from the cascade', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.color.set('rgba(255, 0, 0, 0.25)'));
      runFrame(1000);
      expect(last().uColor).toEqual([1, 0, 0]);

      await set(host => host.color.set('light-dark(rgb(0, 0, 255), rgb(0, 255, 0))'));
      runFrame(1016);
      expect(last().uColor).toEqual([0, 0, 1]);

      stage().style.setProperty('--tint', 'rgb(0, 255, 0)');
      await set(host => host.color.set('var(--tint)'));
      runFrame(1032);
      expect(last().uColor).toEqual([0, 1, 0]);
    });

    for (const [name, value] of [
      ['empty', ''],
      ['blank', '   '],
      ['unset', null],
    ] as const) {
      it(`removes the hook and follows the theme when ${name}`, async () => {
        withContext();
        box(320, 180);
        await mount([], host => host.color.set('#00ff00'));
        runFrame(1000);
        expect(hook()).toBe('#00ff00');

        await set(host => host.color.set(value));
        silk().style.setProperty('--wr-iridescence-color', '#ff0000');
        runFrame(1016);

        expect(last().uColor).toEqual([1, 0, 0]);

        await set(host => host.color.set('#00ff00'));
        expect(hook()).toBe('#00ff00');
        await set(host => host.color.set(value));
        expect(hook()).toBe('');
      });
    }

    it('never writes a blank onto the hook, which is an empty value and not a missing one', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.color.set('#00ff00'));
      const write = vi.spyOn(silk().style, 'setProperty');

      // jsdom drops the blank by itself, so this asks what was written, not what stuck. In
      // a browser `--wr-iridescence-color:   ` is valid, and leaves every read of it empty.
      await set(host => host.color.set('   '));

      expect(write).not.toHaveBeenCalled();
      expect(hook()).toBe('');
    });

    it('never writes an expression built on the hook onto the hook, which would be a cycle', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.color.set('color-mix(in srgb, var(--wr-iridescence-color) 50%, black)'));
      runFrame(1000);

      expect(hook()).toBe('');
      last().uColor.forEach(channel => expect(Number.isFinite(channel)).toBe(true));

      await set(host => host.color.set('var(--wr-iridescence-color)'));
      expect(hook()).toBe('');
    });

    it('lets a changed hook reach the next frame, with nothing telling the loop', async () => {
      withContext();
      box(320, 180);
      await mount();
      silk().style.setProperty('--wr-iridescence-color', '#ff0000');
      runFrame(1000);
      expect(last().uColor).toEqual([1, 0, 0]);

      silk().style.setProperty('--wr-iridescence-color', '#0000ff');
      runFrame(1016);

      expect(last().uColor).toEqual([0, 0, 1]);
    });

    it('parses a colour once, not once a frame, while the string it resolves to holds', async () => {
      withContext();
      box(320, 180);
      await mount([], host => host.color.set('#00ff00'));
      runFrame(1000);
      const read = vi.spyOn(window, 'getComputedStyle');

      runFrame(1016);
      const held = read.mock.calls.length;
      read.mockClear();

      await set(host => host.color.set('#0000ff'));
      read.mockClear();
      runFrame(1032);
      const changed = read.mock.calls.length;

      // Parsing a new string resolves it once more. Dropping the check makes the two
      // counts equal, and every frame pays for the second resolve.
      expect(held).toBeGreaterThan(0);
      expect(changed).toBeGreaterThan(held);
    });
  });

  describe('a lost context', () => {
    const lose = (): Event => {
      const event = new Event('webglcontextlost', { cancelable: true });
      canvas().dispatchEvent(event);
      return event;
    };

    it('asks for it back, stops the loop and shows the stand-in', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      await flush();
      expect(isPainted()).toBe(true);
      const late = [...frames.values()];

      const event = lose();
      await flush();

      expect(event.defaultPrevented, 'without this no restore ever comes').toBe(true);
      expect(isPainted()).toBe(false);
      expect(frames.size).toBe(0);

      const count = drawn.length;
      late[0](1016);
      expect(drawn).toHaveLength(count);
      expect(frames.size).toBe(0);
    });

    it('draws nothing for a frame that lands before the loop has stopped', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      const count = drawn.length;

      lose();
      runFrame(1016);

      expect(drawn).toHaveLength(count);
    });

    it('takes a colour, a resize and a scheme change without drawing on nothing', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      lose();
      await flush();
      const count = drawn.length;

      await set(host => host.color.set('#ff0000'));
      resized(640, 360);
      document.documentElement.style.colorScheme = 'dark';
      try {
        await new Promise(resolve => setTimeout(resolve));

        expect(drawn).toHaveLength(count);
      } finally {
        document.documentElement.style.removeProperty('color-scheme');
      }
    });

    it('rebuilds everything when it comes back, resumes in place and paints again', async () => {
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      runFrame(1016);
      const held = last().uPhase;
      lose();
      await flush();
      expect(gpu.programs).toHaveLength(1);
      expect(gpu.buffers).toHaveLength(1);
      expect(gpu.deleted, 'the dead handles are not deleted: the browser has already dropped them').toEqual([]);

      canvas().dispatchEvent(new Event('webglcontextrestored'));
      await flush();

      expect(gpu.programs).toHaveLength(2);
      expect(gpu.buffers).toHaveLength(2);
      expect(frames.size).toBe(1);

      runFrame(90_000);
      await flush();

      expect(isPainted()).toBe(true);
      last().uPhase.forEach((phase, i) => expect(phase - held[i]).toBeCloseTo(RATE[i] * FRAME_S, 10));
    });

    it('draws the still frame at once when it comes back under reduced motion', async () => {
      withContext();
      box(320, 180);
      await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
      const count = drawn.length;
      lose();
      await flush();
      expect(isPainted()).toBe(false);

      canvas().dispatchEvent(new Event('webglcontextrestored'));
      await flush();

      expect(drawn).toHaveLength(count + 1);
      expect(isPainted()).toBe(true);
      expect(frames.size).toBe(0);
    });

    it('stops again when a restored context will not build, and logs it', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      lose();
      await flush();

      gpu.compiles = false;
      canvas().dispatchEvent(new Event('webglcontextrestored'));
      await flush();

      expect(error).toHaveBeenCalled();
      expect(frames.size).toBe(0);
      expect(isPainted()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('stops the loop, removes every listener, disconnects both observers and gives the GPU back', async () => {
      const io = withIntersection();
      withContext();
      box(320, 180);
      await mount();
      runFrame(1000);
      // The first draw's host-binding update has asked for a frame of Angular's own.
      await flush();
      const late = [...frames.values()];
      const count = drawn.length;
      const removeFromParent = vi.spyOn(stage(), 'removeEventListener');
      const removeFromCanvas = vi.spyOn(canvas(), 'removeEventListener');

      fixture.destroy();

      expect(frames.size).toBe(0);
      for (const type of ['pointermove', 'pointerleave', 'pointercancel']) {
        expect(removeFromParent).toHaveBeenCalledWith(type, expect.any(Function));
      }
      for (const type of ['webglcontextlost', 'webglcontextrestored']) {
        expect(removeFromCanvas).toHaveBeenCalledWith(type, expect.any(Function));
      }
      expect(disconnects).toBe(1);
      expect(io.report).toBeNull();
      expect(gpu.deleted).toHaveLength(2);
      expect(gpu.deleted[0]).toBe(gpu.programs[0]);
      expect(gpu.deleted[1]).toBe(gpu.buffers[0]);
      expect(gpu.released).toBe(1);

      late[0](1016);
      expect(drawn).toHaveLength(count);
      expect(frames.size).toBe(0);
    });

    it('takes the context listeners off first: its own release must not read as a lost context', async () => {
      withContext();
      box(320, 180);
      await mount();

      fixture.destroy();

      expect(gpu.released).toBe(1);
      expect(gpu.heardOwnRelease).toBe(false);
    });

    it('releases a context that arrived lost and never built a program, with nothing to delete', async () => {
      withContext({ lost: true, compiles: false });
      box(320, 180);
      await mount();
      expect(gpu.released).toBe(0);

      fixture.destroy();

      expect(gpu.released).toBe(1);
      expect(gpu.deleted).toEqual([]);
    });
  });
});
