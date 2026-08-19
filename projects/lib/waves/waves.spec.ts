import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrWaves } from './waves';

@Component({
  imports: [WrWaves],
  template: `<wr-waves [friction]="friction()" [tension]="tension()" />`,
})
class Host {
  readonly friction = signal(0.925);
  readonly tension = signal(0.005);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * A 2D-canvas line field. jsdom refuses the context, which is the state this spec is
 * for: `getContext('2d')` returning null is a real browser answer, and the component
 * has to put its canvas up and stop rather than throw on a null context.
 *
 * What makes that readable is `.wr-waves--painted`. The component ships a CSS
 * stand-in grid for the seconds before hydration and retires it the moment the
 * canvas has real pixels in it, so the class's ABSENCE is the null-context
 * fallback holding: the stand-in stays up, and nothing pretends to have painted.
 *
 * The rest needed a context. `boot()` runs from `afterNextRender`, and what it
 * throws never reaches `detectChanges()` or `whenStable()` — Angular reports it
 * to the `ErrorHandler` and the fixture carries on — so every mount installs a
 * recorder. Past the null-context guard nothing exists to observe at all: the
 * reduced-motion branch, the frame loop and both `onDestroy` registrations are
 * unreachable, so the tests named after them mount `withContext()`, the smallest
 * 2D context that lets `boot()` run to its last line.
 */

/** Everything `boot()` threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** `clearRect` calls, one per pass of `drawLines()`. */
let painted: number;
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;

/**
 * Enough of a 2D context for `boot()` to reach its last line, and nothing more.
 *
 * Every call is a no-op but `clearRect`, which opens each pass of `drawLines()`
 * and is therefore the count of what was painted. jsdom also has no
 * `ResizeObserver`, which `boot()` installs a few lines after the context, so the
 * spec supplies the smallest one it can disconnect.
 */
const withContext = (): void => {
  const ctx: Record<string, unknown> = {
    clearRect: () => {
      painted++;
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy(ctx, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
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

describe('WrWaves', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const canvas = (): HTMLCanvasElement | null => (fixture.nativeElement as HTMLElement).querySelector('canvas');
  const waves = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('wr-waves');

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

  it('survives a browser that will not give it a 2d context', () => {
    // `boot()` stopped quietly — asked of the handler, which is the only place an
    // `afterNextRender` failure is reported — and the CSS stand-in is still up,
    // because nothing has painted over it.
    expect(thrown).toEqual([]);
    expect(canvas()).not.toBeNull();
    expect(waves()!.classList.contains('wr-waves--painted')).toBe(false);
  });

  it('takes an input change without reaching for a context it never got', () => {
    fixture.componentInstance.friction.set(0.5);
    fixture.componentInstance.tension.set(0.01);
    fixture.detectChanges();

    expect(thrown).toEqual([]);
  });

  it('renders the canvas on the server without drawing', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
    // The stand-in grid is what a prerendered page shows, and it must survive
    // into the HTML rather than being switched off by a canvas that never ran.
    expect(waves()!.classList.contains('wr-waves--painted')).toBe(false);
    expect(thrown).toEqual([]);
  });

  it('draws one undisturbed grid for someone who asked for less motion', async () => {
    const listen = vi.spyOn(window, 'addEventListener');
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    // One static grid: painted once, no drift, and — the part a resize listener
    // hides — no pointer reactivity at all.
    expect(painted).toBe(1);
    expect(waves()!.classList.contains('wr-waves--painted')).toBe(true);
    expect(listen).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(listen).not.toHaveBeenCalledWith('mousemove', expect.any(Function));

    runFrame();
    runFrame();

    expect(painted).toBe(1);
  });

  it('keeps painting frame after frame when motion is allowed', async () => {
    withContext();
    await mount();

    // Nothing is painted inside `boot()` here — the first grid arrives with the
    // first frame, which is also when the stand-in is retired.
    expect(painted).toBe(0);

    runFrame();
    fixture.detectChanges();

    expect(painted).toBeGreaterThan(0);
    expect(waves()!.classList.contains('wr-waves--painted')).toBe(true);
  });

  it('tears down the listeners, the observer and the frame it installed', async () => {
    withContext();
    await mount();
    const remove = vi.spyOn(window, 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    fixture.destroy();

    // Deleting the `onDestroy` registration leaks a resize listener, two pointer
    // listeners on `window`, a ResizeObserver and a running rAF per instance —
    // and this is a background, one-per-route component, so nothing else would
    // ever notice.
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
  });
});
