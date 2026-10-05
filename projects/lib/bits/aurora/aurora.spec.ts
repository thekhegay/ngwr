import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
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

/** Everything `boot()` threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** `drawArrays` calls, which is the whole of what a spec can see this component paint. */
let painted: number;
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;

/**
 * Enough of WebGL2 for `boot()` to reach its last line, and nothing more.
 *
 * Every call is a no-op, except two: `getShaderParameter` answers that the shader
 * compiled, because a stub that says otherwise makes the component log a shader
 * error that is the stub's fault and not the code's; and `drawArrays` is counted.
 * jsdom also has no `ResizeObserver`, which `boot()` installs one line after the
 * context, so the spec supplies the smallest one it can disconnect.
 */
const withContext = (): void => {
  const gl: Record<string, unknown> = {
    getShaderParameter: () => true,
    drawArrays: () => {
      painted++;
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // A constant like `gl.BLEND` comes back as a no-op function too. It only ever
    // travels straight into another no-op, and inventing plausible numbers for
    // forty of them would say nothing this stub does not already say.
    new Proxy(gl, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
  );

  class Observer {
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

  it('tears down the listener, the observer and the frame it installed', async () => {
    withContext();
    await mount();
    const remove = vi.spyOn(window, 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    fixture.destroy();

    // Deleting the `onDestroy` registration leaks a resize listener, a
    // ResizeObserver and a running rAF per instance — and this is a background,
    // one-per-route component, so nothing else would ever notice.
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
  });
});
