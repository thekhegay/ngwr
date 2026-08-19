import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrConfetti } from './wr-confetti';

/** The two platform answers this service branches on. */
const platformStub = (reducedMotion: boolean, browser = true): unknown => ({
  provide: WrPlatform,
  useValue: {
    isBrowser: browser,
    isServer: !browser,
    userAgent: null,
    prefersDark: () => false,
    prefersReducedMotion: () => reducedMotion,
  },
});

/**
 * jsdom gives no 2D context, which is one of the two states worth pinning rather
 * than a limitation: `getContext('2d')` returning null is a real browser answer (a
 * refused context, a headless environment), and the service has to put a canvas on
 * the page, find no context, and stop — without throwing and without leaving a frame
 * loop running.
 *
 * The other state is a context that works, and everything past `ensureCanvas()`
 * needs one: the particle physics, the ttl that retires a burst, and the single
 * shared rAF loop all live inside `tick()`, which returns on its first line when
 * `this.ctx` is null. Those tests mount `withContext()`, the smallest 2D context
 * `tick()` will paint into, and read back the shapes it drew.
 */

/** `clearRect` calls, one per pass of `tick()` — the frames that ran. */
let cleared: number;
/** One entry per particle painted, in the order `tick()` drew them. */
let filled: number;
/** The `translate(x, y)` each particle was painted at, per frame. */
let placed: { x: number; y: number }[];
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];

/**
 * Frames are held, not fired. Whether one was SCHEDULED is the whole of what
 * "the loop stopped" means here, and running them by hand keeps a physics
 * assertion off the wall clock.
 */
const holdFrames = (): void => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
};

/**
 * Enough of a 2D context for `tick()` to paint, and nothing more. `clearRect` opens
 * every pass, `fillRect` closes every particle, and `translate` is where the particle
 * says where it has got to — the only place the physics is readable.
 */
const withContext = (): void => {
  holdFrames();
  const ctx: Record<string, unknown> = {
    clearRect: () => {
      cleared++;
    },
    translate: (x: number, y: number) => {
      placed.push({ x, y });
    },
    fillRect: () => {
      filled++;
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // `save`, `restore`, `rotate`, `fillStyle`, `globalAlpha`: each travels straight
    // into a no-op, and inventing a plausible answer would say nothing this stub
    // does not already say.
    new Proxy(ctx, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
  );
};

/** Run every frame the page is currently holding, once. */
const runFrame = (): void => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(16);
};

describe('WrConfetti', () => {
  let confetti: WrConfetti;

  const canvases = (): HTMLCanvasElement[] => [...document.querySelectorAll('canvas')];

  const setup = (platform?: unknown): WrConfetti => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: platform ? [platform as never] : [] });
    return TestBed.inject(WrConfetti);
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    cleared = 0;
    filled = 0;
    placed = [];
    frames = [];
    confetti = setup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('puts one full-screen canvas on the page, out of everyone way', () => {
    confetti.fire();

    expect(canvases().length).toBe(1);
    const canvas = canvases()[0];
    // Decoration, and it must never swallow a click meant for the page under it.
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('reuses the same canvas for every burst', () => {
    confetti.fire();
    const first = canvases()[0];
    confetti.fire({ count: 10 });
    confetti.fire({ count: 10 });

    expect(canvases().length).toBe(1);
    expect(canvases()[0]).toBe(first);
  });

  it('survives a browser that will not give it a drawing context', () => {
    holdFrames();
    confetti.fire({ count: 500 });

    // The burst is scheduled either way — the guard is inside `tick()` — so the
    // question is what that frame does when it finds no context.
    expect(frames.length).toBe(1);
    expect(() => runFrame()).not.toThrow();

    // It stood down rather than spinning: nothing rescheduled, and the service is
    // still armed for a later burst on a page that does have a context.
    expect(frames).toEqual([]);
    confetti.fire({ count: 1 });
    expect(frames.length).toBe(1);
  });

  it('runs one loop no matter how many bursts land in it', () => {
    holdFrames();
    confetti.fire({ count: 10 });
    confetti.fire({ count: 10 });
    confetti.fire({ count: 10 });

    // Every burst joining the running loop is the whole reason `rafId` is kept:
    // three loops would each clear the canvas the other two had just painted.
    expect(frames.length).toBe(1);
  });

  it('paints one piece per particle, over a canvas it cleared first', () => {
    withContext();
    confetti.fire({ count: 5, ttl: 4 });

    runFrame();

    expect(cleared).toBe(1);
    expect(filled).toBe(5);
  });

  it('retires a burst when its ttl runs out, and stops the loop with it', () => {
    withContext();
    confetti.fire({ count: 5, ttl: 3 });

    runFrame();
    runFrame();
    expect(filled).toBe(10);

    // Third pass: every particle's ttl reaches zero, none is painted, and nothing
    // is scheduled after it. Without that the loop runs for the life of the page.
    runFrame();

    expect(filled).toBe(10);
    expect(cleared).toBe(3);
    expect(frames).toEqual([]);
  });

  it('lets gravity bring a particle launched straight up back down', () => {
    withContext();
    // One particle, no spread: it leaves at exactly 90° — straight up the screen,
    // which in canvas coordinates means y falling.
    confetti.fire({ count: 1, spread: 0, angle: 90, origin: { x: 0.5, y: 0.5 } });

    for (let i = 0; i < 40; i++) runFrame();

    const ys = placed.map(p => p.y);
    const peak = Math.min(...ys);
    expect(peak).toBeLessThan(ys[0]);
    // And it came back: with drag alone the rise would just stall at the peak and
    // stay there, which is what this second half rules out.
    expect(ys.at(-1)!).toBeGreaterThan(peak);
  });

  it('sizes the canvas to the viewport and the pixel ratio', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    confetti = setup();
    confetti.fire();

    expect(canvases()[0].width).toBe(window.innerWidth * 2);
    expect(canvases()[0].height).toBe(window.innerHeight * 2);
  });

  it('does nothing at all for someone who asked for less motion', () => {
    holdFrames();
    confetti = setup(platformStub(true));
    confetti.fire();

    // Not even the canvas, and not even a frame: a decoration nobody asked for
    // should leave no trace and cost nothing.
    expect(canvases()).toEqual([]);
    expect(frames).toEqual([]);
  });

  it('does nothing on the server', () => {
    holdFrames();
    confetti = setup({ provide: PLATFORM_ID, useValue: 'server' });
    confetti.fire();

    expect(canvases()).toEqual([]);
    expect(frames).toEqual([]);
  });

  it('takes an options object without complaining about the ones it is not given', () => {
    withContext();
    confetti.fire({ count: 5, origin: { x: 0.25, y: 0.5 }, colors: ['#fff'] });

    runFrame();

    // The ones it was not given come from the defaults rather than from
    // `undefined`: a spread of `NaN` particles paints nothing and throws nowhere.
    expect(canvases().length).toBe(1);
    expect(filled).toBe(5);
  });
});
