import { Component, Directive, ErrorHandler, PLATFORM_ID, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAurora } from './aurora';

@Component({
  imports: [WrAurora],
  template: `<wr-aurora [amplitude]="amplitude()" [speed]="speed()" />`,
})
class Host {
  readonly amplitude = signal(1);
  readonly speed = signal(1);
}

@Directive({ selector: '[wrHookTint]', host: { '[style.--wr-aurora-stop-1]': 'wrHookTint()' } })
class HookTint {
  readonly wrHookTint = input<string | null>(null);
}

@Component({
  imports: [WrAurora, HookTint],
  template: `<wr-aurora [colorStops]="colorStops()" [wrHookTint]="tint()" />`,
})
class HookTintHost {
  readonly colorStops = signal<readonly string[] | null>(['rgb(0, 255, 0)', 'rgb(0, 255, 0)', 'rgb(0, 255, 0)']);
  readonly tint = signal<string | null>(null);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * A WebGL2 background. jsdom refuses the context, which is the state this spec is
 * for: `getContext('webgl2')` returning null is a real browser answer (an old
 * machine, a blocklisted driver, a headless run), and the component has to put its
 * canvas up and stop rather than throw on a null context.
 *
 * Two things had to change before any of that was being read at all.
 *
 * `boot()` runs from `afterNextRender`, and what it throws NEVER reaches
 * `detectChanges()` or `whenStable()` — Angular reports it to the `ErrorHandler`
 * and the fixture carries on as though nothing happened. So "survives a browser
 * with no WebGL2" passed with the null-context guard deleted, and passed again
 * with a `throw` as the first line of `boot()`. Every mount here installs a
 * recorder, and the tests read it.
 *
 * And past that guard there is nothing to observe with a null context: the
 * reduced-motion branch, the frame loop and the whole `onDestroy` registration
 * are unreachable, so the two tests named after them could only assert that
 * destroying a fixture does not throw — true of a component that registers no
 * teardown at all. Those mount `withContext()` instead: the smallest WebGL2 that
 * lets `boot()` run to its last line, with what it paints counted.
 */

/** What the stub answers, and what it was asked. */
interface Recorded {
  compiles: boolean;
  lost: boolean;
  programs: object[];
  buffers: object[];
  deleted: object[];
  released: number;
  /** Whether the lost event the release fires found a listener still on the canvas. */
  heardOwnRelease: boolean;
  /** `uniform2f` calls, which is where the resolution reaches the shader. */
  resolutions: number;
}

/** Everything `boot()` threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** `drawArrays` calls, which is the whole of what a spec can see this component paint. */
let painted: number;
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;
/** The last colour-stop uniform, flattened to nine 0–1 channels. */
let stops: number[];
/** The resize observer's callback, to deliver a resize by hand. */
let resized: ResizeObserverCallback | null;
/** The stub's state. */
let gpu: Recorded;

/**
 * Enough of WebGL2 for `boot()` to reach its last line, and nothing more.
 *
 * Every call is a no-op, except the few that have to answer: `createShader`,
 * `createProgram` and `createBuffer` hand back handles, since `build()` reads an
 * empty answer as a driver that refused; `getShaderParameter` and
 * `getProgramParameter` say the shader compiled and the program linked, because a
 * stub that says otherwise makes the component log an error that is the stub's
 * fault and not the code's; `drawArrays` is counted; `uniform3fv` keeps the colour
 * stops, the one uniform whose value comes from CSS; and the deletes and
 * `WEBGL_lose_context` record what was handed back. jsdom also has no
 * `ResizeObserver`, which `boot()` installs after the context, so the spec supplies
 * the smallest one it can disconnect.
 */
const withContext = (answers: Partial<Pick<Recorded, 'compiles' | 'lost'>> = {}): void => {
  layout(320, 180);
  gpu = {
    compiles: true,
    lost: false,
    programs: [],
    buffers: [],
    deleted: [],
    released: 0,
    heardOwnRelease: false,
    resolutions: 0,
    ...answers,
  };
  const gl: Record<string, unknown> = {
    createShader: () => ({}),
    getShaderParameter: () => gpu.compiles,
    getShaderInfoLog: () => 'stub: refused',
    createProgram: () => {
      const program = {};
      gpu.programs.push(program);
      return program;
    },
    getProgramParameter: () => true,
    createBuffer: () => {
      const buffer = {};
      gpu.buffers.push(buffer);
      return buffer;
    },
    isContextLost: () => gpu.lost,
    drawArrays: () => {
      painted++;
    },
    uniform2f: () => {
      gpu.resolutions++;
    },
    uniform3fv: (_location: unknown, data: Float32Array) => {
      stops = Array.from(data);
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
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // A constant like `gl.BLEND` comes back as a no-op function too. It only ever
    // travels straight into another no-op, and inventing plausible numbers for
    // forty of them would say nothing this stub does not already say.
    new Proxy(gl, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
  );

  class Observer {
    constructor(callback: ResizeObserverCallback) {
      resized = callback;
    }
    observe(): void {
      /* nothing to measure: jsdom lays nothing out */
    }
    unobserve(): void {
      /* as above */
    }
    disconnect(): void {
      disconnects++;
    }
  }
  vi.stubGlobal('ResizeObserver', Observer);

  // Frames are held, not fired: whether one was SCHEDULED is the whole
  // difference between the two motion branches, and running it by hand keeps
  // that off the clock — a backgrounded jsdom throttles timers, and a spec that
  // waits on one flakes. Angular's own scheduler races rAF against a
  // `setTimeout`, so holding the frame does not stall the fixture.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
};

/** A layout box for every element, since jsdom lays nothing out. */
const layout = (width: number, height: number): void => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
};

/** Run every frame the page is currently holding, once. */
const runFrame = (): void => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(16);
};

describe('WrAurora', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const canvas = (): HTMLCanvasElement | null => (fixture.nativeElement as HTMLElement).querySelector('canvas');

  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...providers,
      ] as never[],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    thrown = [];
    painted = 0;
    disconnects = 0;
    frames = [];
    stops = [];
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a canvas that is decoration, not content', () => {
    expect(canvas()).not.toBeNull();
    expect(canvas()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('survives a browser with no WebGL2', () => {
    // The canvas is up and `boot()` stopped quietly on the null context. Asked of
    // the handler rather than of `detectChanges()`, which sees none of it.
    expect(thrown).toEqual([]);
    expect(canvas()).not.toBeNull();
  });

  it('takes an input change without reaching for a context it never got', () => {
    fixture.componentInstance.amplitude.set(2);
    fixture.componentInstance.speed.set(0.5);
    fixture.detectChanges();

    expect(thrown).toEqual([]);
  });

  it('renders the canvas on the server without drawing', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
    expect(thrown).toEqual([]);
  });

  it('paints a static frame and schedules none for someone who asked for less motion', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    // The ribbons hold their t=0 shape: `boot()` painted, and nothing it left
    // behind paints again. Without the reduced-motion branch a loop is in
    // `frames` and the count moves on the first one.
    const still = painted;
    expect(still).toBeGreaterThan(0);

    runFrame();
    runFrame();

    expect(painted).toBe(still);
  });

  it('keeps painting frame after frame when motion is allowed', async () => {
    withContext();
    await mount();

    const first = painted;
    runFrame();

    // The other half of the same branch. Without it the test above would pass on
    // a component that never draws anything at all.
    expect(painted).toBeGreaterThan(first);
  });

  it('feeds the shader resolved stops, never text a uniform cannot hold', async () => {
    withContext();
    await mount();
    // The theme declares each stop as a `light-dark()` pair, and the old hex-only
    // parser turned that into `NaN` channels. What reaches the uniform has to be
    // the computed colour, in either shape a browser hands back: `rgb()` with
    // 0–255 channels, and `color(srgb …)` with 0–1 channels for a `color-mix()`.
    // jsdom resolves a `light-dark()` to its light half, as a browser does with no
    // dark scheme in effect.
    const aurora = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-aurora')!;
    aurora.style.setProperty('--wr-aurora-stop-1', 'light-dark(rgb(255, 0, 0), rgb(0, 0, 0))');
    aurora.style.setProperty('--wr-aurora-stop-2', 'color-mix(in srgb, rgb(0, 0, 255) 50%, transparent)');
    aurora.style.setProperty('--wr-aurora-stop-3', '#00ff00');

    runFrame();

    expect(stops).toEqual([1, 0, 0, 0, 0, 1, 0, 1, 0]);
  });

  it('reads a hook a directive on the host changes in the same pass, on a still frame', async () => {
    withContext();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: WrPlatform, useValue: reducedMotion }] });
    const hosted = TestBed.createComponent(HookTintHost);
    hosted.detectChanges();
    await hosted.whenStable();
    expect(stops.slice(0, 3)).toEqual([0, 1, 0]);

    // The stops go back to the theme's hook in the pass that sets it: an `effect`
    // runs before the directive's host binding and resolved the old value.
    hosted.componentInstance.colorStops.set(null);
    hosted.componentInstance.tint.set('rgb(0, 0, 255)');
    hosted.detectChanges();
    await hosted.whenStable();

    expect(stops.slice(0, 3)).toEqual([0, 0, 1]);
    hosted.destroy();
  });

  it('repaints the still frame in the new colours when the scheme switches', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    const aurora = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-aurora')!;
    // jsdom resolves every `light-dark()` to its light half, so the switch is
    // staged on the hook itself: the new value is in place BEFORE the scheme
    // moves, and only the scheme switch may bring it to the canvas.
    aurora.style.setProperty('--wr-aurora-stop-1', '#ff0000');
    const before = painted;
    runFrame();
    expect(painted, 'a still frame schedules nothing on its own').toBe(before);

    document.documentElement.style.colorScheme = 'dark';
    try {
      await new Promise(resolve => setTimeout(resolve));

      expect(painted).toBe(before + 1);
      expect(stops.slice(0, 3)).toEqual([1, 0, 0]);
    } finally {
      document.documentElement.style.removeProperty('color-scheme');
    }
  });

  it('follows reduced motion switched on and off while the page is open', async () => {
    const reduce = signal(false);
    withContext();
    await mount([{ provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: reduce } }]);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    runFrame();

    // Switched on: the loop is cancelled and the static frame repainted.
    reduce.set(true);
    await fixture.whenStable();
    expect(cancel).toHaveBeenCalled();
    const still = painted;
    frames = [];
    runFrame();
    expect(painted).toBe(still);

    // And off again: the loop resumes.
    reduce.set(false);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(still);
  });

  it('parks the loop off screen and resumes it in view', async () => {
    let report: ((entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) | null = null;
    withContext();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) {
          report = callback;
        }
        observe(): void {
          // Driven by hand below.
        }
        disconnect(): void {
          report = null;
        }
      }
    );
    await mount();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    report!([{ isIntersecting: false, intersectionRatio: 0 }]);
    await fixture.whenStable();
    expect(cancel).toHaveBeenCalled();
    frames = [];
    const parked = painted;
    runFrame();
    expect(painted).toBe(parked);

    report!([{ isIntersecting: true, intersectionRatio: 1 }]);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(parked);

    fixture.destroy();
    expect(report).toBeNull();
  });

  it('watches the canvas, so a canvas hidden under forced colours stops the loop too', async () => {
    const observe = vi.fn();
    withContext();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        disconnect(): void {
          // Nothing to tear down.
        }
      }
    );
    await mount();

    expect(observe).toHaveBeenCalledWith(canvas());
  });

  it('counts a box flush against a zero-height clip as off screen, and hears the clip open', async () => {
    let report: ((entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) | null = null;
    let options: IntersectionObserverInit | undefined;
    withContext();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(
          callback: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void,
          init?: IntersectionObserverInit
        ) {
          report = callback;
          options = init;
        }
        observe(): void {
          // Driven by hand below.
        }
        disconnect(): void {
          report = null;
        }
      }
    );
    await mount();

    report!([{ isIntersecting: true, intersectionRatio: 0 }]);
    await fixture.whenStable();
    frames = [];
    const parked = painted;
    runFrame();
    expect(painted).toBe(parked);

    // 0 alone would send nothing here in a real browser, and a larger second threshold
    // shares an index with 0 for the last step of a clip closing on a transition.
    expect(options?.threshold).toEqual([0, 1e-9]);
    report!([{ isIntersecting: true, intersectionRatio: 0.5 }]);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(parked);
  });

  it('draws nothing and asks for no frames with no box, and starts when it has one', async () => {
    withContext();
    layout(0, 0);
    await mount();
    runFrame();
    expect(painted).toBe(0);

    layout(320, 180);
    resized!([], {} as ResizeObserver);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(0);

    layout(320, 0);
    resized!([], {} as ResizeObserver);
    await fixture.whenStable();
    frames = [];
    const parked = painted;
    runFrame();
    expect(painted).toBe(parked);
  });

  it('repaints at once on a resize while the loop runs, at the time it had reached', async () => {
    withContext();
    await mount();
    runFrame();
    const before = painted;

    // Sizing the bitmap clears it, so the frame cannot wait for the loop.
    resized!([], {} as ResizeObserver);

    expect(painted).toBe(before + 1);
  });

  it('sizes from the layout box, whatever a transform does to the rect', async () => {
    withContext();
    layout(320, 180);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 0, height: 0 } as DOMRect);
    await mount();

    expect([canvas()!.width, canvas()!.height]).toEqual([320, 180]);
    expect(painted, 'a host under scale(0) still has a box').toBeGreaterThan(0);
  });

  it('tears down the listener, the observer and the frame it installed, and gives the GPU back', async () => {
    withContext();
    await mount();
    const remove = vi.spyOn(window, 'removeEventListener');
    const removeFromCanvas = vi.spyOn(canvas()!, 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    fixture.destroy();

    // Deleting the `onDestroy` registration leaks a resize listener, a
    // ResizeObserver and a running rAF per instance — and this is a background,
    // one-per-route component, so nothing else would ever notice.
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
    // And the context with its program and buffer: browsers keep a small number of
    // live contexts and kill the oldest, so a page left to the collector costs the
    // next route its own.
    for (const type of ['webglcontextlost', 'webglcontextrestored']) {
      expect(removeFromCanvas).toHaveBeenCalledWith(type, expect.any(Function));
    }
    expect(gpu.deleted).toHaveLength(2);
    expect(gpu.deleted[0]).toBe(gpu.programs[0]);
    expect(gpu.deleted[1]).toBe(gpu.buffers[0]);
    expect(gpu.released).toBe(1);
  });

  it('takes the context listeners off first: its own release must not read as a lost context', async () => {
    withContext();
    await mount();

    fixture.destroy();

    expect(gpu.released).toBe(1);
    expect(gpu.heardOwnRelease).toBe(false);
  });

  it('logs a shader the driver refuses, paints nothing, starts no loop and keeps no context', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    withContext({ compiles: false });
    await mount();

    expect(error).toHaveBeenCalled();
    runFrame();
    expect(painted).toBe(0);
    expect(gpu.programs).toEqual([]);
    expect(gpu.released, 'nor keeps a context it will never draw on').toBe(1);
    expect(thrown).toEqual([]);
  });

  it('does not call a context that arrived lost a broken shader, and builds when it comes back', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    withContext({ lost: true, compiles: false });
    await mount();

    expect(error).not.toHaveBeenCalled();
    runFrame();
    expect(painted).toBe(0);

    gpu.lost = false;
    gpu.compiles = true;
    canvas()!.dispatchEvent(new Event('webglcontextrestored'));
    await fixture.whenStable();
    runFrame();

    expect(painted).toBeGreaterThan(0);
  });

  it('asks a lost context back and stops the loop until it comes', async () => {
    withContext();
    await mount();
    runFrame();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    const event = new Event('webglcontextlost', { cancelable: true });
    canvas()!.dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented, 'without this no restore ever comes').toBe(true);
    expect(cancel).toHaveBeenCalled();
    frames = [];
    const parked = painted;
    runFrame();
    expect(painted).toBe(parked);

    // A frame that lands before the loop has stopped, an input change and a resize
    // have nothing to draw on: the dead handles are the browser's now.
    fixture.componentInstance.amplitude.set(2);
    await fixture.whenStable();
    resized!([], {} as ResizeObserver);
    expect(painted).toBe(parked);
    expect(gpu.deleted, 'the dead handles are not deleted: the browser has already dropped them').toEqual([]);
  });

  it('rebuilds everything when the context comes back, resolution included, and paints again', async () => {
    withContext();
    await mount();
    runFrame();
    canvas()!.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    await fixture.whenStable();
    frames = [];
    const parked = painted;
    const uploaded = gpu.resolutions;

    canvas()!.dispatchEvent(new Event('webglcontextrestored'));
    await fixture.whenStable();
    runFrame();

    expect(gpu.programs).toHaveLength(2);
    expect(gpu.buffers).toHaveLength(2);
    // The old program took `uResolution` with it; a new one drawing at the default
    // 300 × 150 would stretch the ribbons across the box.
    expect(gpu.resolutions).toBeGreaterThan(uploaded);
    expect(painted).toBeGreaterThan(parked);
  });

  it('draws the still frame at once when the context comes back under reduced motion', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    canvas()!.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    await fixture.whenStable();
    const parked = painted;

    canvas()!.dispatchEvent(new Event('webglcontextrestored'));
    await fixture.whenStable();

    expect(painted).toBe(parked + 1);
    runFrame();
    runFrame();
    expect(painted, 'and no loop took over').toBe(parked + 1);
  });

  it('stops again when a restored context will not build, and logs it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    withContext();
    await mount();
    runFrame();
    canvas()!.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    await fixture.whenStable();
    frames = [];
    const parked = painted;

    gpu.compiles = false;
    canvas()!.dispatchEvent(new Event('webglcontextrestored'));
    await fixture.whenStable();
    runFrame();

    expect(error).toHaveBeenCalled();
    expect(painted).toBe(parked);
  });
});
