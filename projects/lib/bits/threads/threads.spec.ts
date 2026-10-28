import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrThreads } from './threads';

@Component({
  imports: [WrThreads],
  template: `
    <wr-threads
      [lineCount]="lineCount()"
      [color]="color()"
      [lineWidth]="lineWidth()"
      [spread]="spread()"
      [speed]="speed()"
      [followPointer]="followPointer()"
    />
  `,
})
class Host {
  readonly lineCount = signal(18);
  readonly color = signal('var(--wr-threads-color)');
  readonly lineWidth = signal(1);
  readonly spread = signal(0.4);
  readonly speed = signal(1);
  readonly followPointer = signal(true);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Threads drawn into a 2D canvas. jsdom refuses the context, which is the first state
 * this spec is for: `getContext('2d')` returning null is a real browser answer, and the
 * component has to put its canvas up and stop rather than throw. `.wr-threads--painted`
 * is what makes that readable — the stylesheet's stand-in threads stay up until the
 * canvas has real pixels, so the class's ABSENCE is the fallback holding.
 *
 * Everything past the null-context guard needs a context, so those tests mount
 * `withContext()`: the smallest 2D context that lets the boot run to its last line,
 * recording what each frame painted — the strokes, the colour and width each was drawn
 * with, and the points every thread's path went through. The paths are what make the
 * pointer observable at all: frames are run by hand at one fixed timestamp, so the
 * current never moves and the only thing that can change a thread between two frames
 * is the pointer. That also means a frame which would repeat the last one is SKIPPED —
 * the loop draws only when the current moved, the pointer pulls or the picture changed —
 * so a spec that wants frame after frame advances the clock.
 *
 * The boot runs from `afterNextRender`, and what it throws never reaches
 * `detectChanges()` or `whenStable()` — Angular reports it to the `ErrorHandler` and
 * the fixture carries on — so every mount installs a recorder and the tests read it.
 */

/** Everything the deferred boot threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** `clearRect` calls, one per frame drawn. */
let painted: number;
/** One entry per thread stroked: the colour, width and alpha it was drawn with. */
let strokes: { color: string; width: number; alpha: number }[];
/** Per frame, per thread, the flat `[x, y, x, y, …]` its path went through. */
let drawn: number[][][];
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;
/** The resize observer's callbacks, newest last — `resize()` fires the one installed last. */
let resizers: (() => void)[];

/**
 * Enough of a 2D context for the boot to reach its last line, recording what it paints.
 *
 * `clearRect` opens each frame and `beginPath` each thread; the three path calls add
 * points to the thread being built (a curve's control point counts — it is where the
 * thread was bent toward); `stroke()` closes it and reads back the style it was drawn
 * in. Everything else is a no-op. jsdom also has no `ResizeObserver`, so the spec
 * supplies the smallest one it can fire by hand and disconnect.
 */
const withContext = (): void => {
  const point = (x: number, y: number): void => {
    drawn.at(-1)?.at(-1)?.push(x, y);
  };
  const ctx: Record<string, unknown> = {
    clearRect: () => {
      painted++;
      drawn.push([]);
    },
    beginPath: () => {
      drawn.at(-1)?.push([]);
    },
    moveTo: point,
    lineTo: point,
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => {
      point(cx, cy);
      point(x, y);
    },
    stroke: () => {
      strokes.push({
        color: String(ctx['strokeStyle']),
        width: Number(ctx['lineWidth']),
        alpha: Number(ctx['globalAlpha']),
      });
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy(ctx, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
  );

  class Observer {
    constructor(callback: () => void) {
      resizers.push(callback);
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

  // Frames are held, not fired: whether one was SCHEDULED is the difference
  // between the two motion branches, and running it by hand keeps that off the
  // clock. Angular's own scheduler races rAF against a `setTimeout`, so holding
  // the frame does not stall the fixture.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
};

/** Run every frame the page is currently holding, once, at `ts`. */
const runFrame = (ts = 16): void => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(ts);
};

/** Fire the resize observer the last mount installed, the way a browser does on a new box. */
const resize = (): void => resizers.at(-1)!();

/**
 * A laid-out box for every element — jsdom's is 0×0, which leaves a thread two points
 * long. `width` × `height` is the LAYOUT box (`clientWidth` / `clientHeight`); `drawn`
 * is where `getBoundingClientRect()` puts it, which differs only under a transform.
 */
const box = (
  width: number,
  height: number,
  drawn: { left?: number; top?: number; width?: number; height?: number } = {}
): void => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
  const rect = { left: 0, top: 0, width, height, ...drawn };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...rect,
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  });
};

/** Run one frame per 16 ms from `from`, `count` of them — a current that moves. */
const runFrames = (count: number, from = 1000): void => {
  for (let i = 0; i < count; i++) runFrame(from + i * 16);
};

/** Every `[x, y]` of one frame, threads concatenated. */
const pointsOf = (frame: number[][]): [number, number][] =>
  frame.flatMap(path =>
    Array.from({ length: path.length / 2 }, (_, i): [number, number] => [path[i * 2], path[i * 2 + 1]])
  );

const pointer = (type: string, clientX: number, clientY: number): MouseEvent =>
  // jsdom has no `PointerEvent`; the listener reads only the coordinates.
  new MouseEvent(type, { clientX, clientY, bubbles: true });

describe('WrThreads', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const canvas = (): HTMLCanvasElement | null => (fixture.nativeElement as HTMLElement).querySelector('canvas');
  const threads = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-threads')!;

  const mount = async (providers: unknown[] = [], setup?: (host: Host) => void): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...providers,
      ] as never[],
    });
    fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    thrown = [];
    painted = 0;
    strokes = [];
    drawn = [];
    disconnects = 0;
    resizers = [];
    frames = [];
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a canvas that is decoration, not content', () => {
    expect(canvas()!.getAttribute('aria-hidden')).toBe('true');
    expect(threads().hasAttribute('role')).toBe(false);
    expect(threads().hasAttribute('tabindex')).toBe(false);
    expect(threads().querySelectorAll('[tabindex], a, button, input')).toHaveLength(0);
  });

  it('survives a browser that will not give it a 2d context', () => {
    // The boot stopped quietly — asked of the handler, the only place an
    // `afterNextRender` failure is reported — and the stand-in is still up,
    // because nothing has painted over it.
    expect(thrown).toEqual([]);
    expect(canvas()).not.toBeNull();
    expect(threads().classList.contains('wr-threads--painted')).toBe(false);
  });

  it('takes an input change without reaching for a context it never got', () => {
    fixture.componentInstance.lineCount.set(4);
    fixture.componentInstance.followPointer.set(false);
    fixture.componentInstance.color.set('#ff0000');
    fixture.detectChanges();

    expect(thrown).toEqual([]);
  });

  it('renders the canvas on the server, and the stand-in with it', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
    // What a prerendered page shows is the stand-in, so the geometry it draws
    // at has to be in the server's HTML, and the class that retires it must not.
    const style = threads().getAttribute('style') ?? '';
    expect(style).toContain('--wr-threads-count: 18');
    expect(style).toContain('--wr-threads-line-width: 1px');
    expect(threads().classList.contains('wr-threads--painted')).toBe(false);
    expect(thrown).toEqual([]);
  });

  it('publishes the geometry the canvas will draw, not the raw inputs', () => {
    const host = fixture.componentInstance;
    const published = (name: string): string => threads().style.getPropertyValue(name);

    host.lineCount.set(6.4);
    host.lineWidth.set(0);
    fixture.detectChanges();
    expect([published('--wr-threads-count'), published('--wr-threads-line-width')]).toEqual(['6', '0.25px']);

    host.lineCount.set(250);
    host.spread.set(3);
    fixture.detectChanges();
    expect([published('--wr-threads-count'), published('--wr-threads-spread')]).toEqual(['100', '1']);

    // One thread runs through the middle, so the stand-in has no band to fan across.
    host.lineCount.set(0);
    fixture.detectChanges();
    expect([published('--wr-threads-count'), published('--wr-threads-spread')]).toEqual(['1', '0']);
  });

  it('writes a chosen colour onto the hook the stand-in reads, and only a chosen one', () => {
    const host = fixture.componentInstance;
    const hook = (): string => threads().style.getPropertyValue('--wr-threads-color');
    expect(hook(), "the theme's colour is the stylesheet's to declare").toBe('');

    host.color.set('#ff0000');
    fixture.detectChanges();
    expect(hook()).toBe('#ff0000');

    // Built on the hook itself, the expression would be a cycle written onto it.
    host.color.set('color-mix(in srgb, var(--wr-threads-color) 50%, transparent)');
    fixture.detectChanges();
    expect(hook()).toBe('');
  });

  it('keeps painting frame after frame when motion is allowed', async () => {
    withContext();
    await mount();

    // The first frame arrives with the loop, which is also when the stand-in goes.
    expect(painted).toBe(0);

    runFrame(1000);
    runFrame(1016);
    fixture.detectChanges();

    expect(painted).toBe(2);
    expect(threads().classList.contains('wr-threads--painted')).toBe(true);
  });

  it('strokes one thread per line asked for, at the width asked for, fading toward the edges', async () => {
    withContext();
    box(400, 200);
    await mount([], host => {
      host.lineCount.set(5);
      host.lineWidth.set(2);
    });

    runFrame();

    expect(strokes).toHaveLength(5);
    expect(strokes.every(stroke => stroke.width === 2)).toBe(true);
    const alphas = strokes.map(stroke => stroke.alpha);
    expect(alphas[2]).toBe(1);
    expect(alphas[0]).toBeLessThan(alphas[1]);
    expect(alphas[4]).toBe(alphas[0]);
    // And each thread is curved, not joined point to point: every interior
    // sample is a curve's control, so a thread holds far more than two points.
    expect(drawn[0].every(path => path.length > 8)).toBe(true);
  });

  it('strokes with the theme colour resolved against the host, never with text a canvas cannot read', async () => {
    withContext();
    await mount();
    // The hook holds what a stylesheet would; jsdom resolves a `light-dark()` to
    // its light half, as a browser does with no dark scheme in effect.
    threads().style.setProperty('--wr-threads-color', 'light-dark(rgb(1, 2, 3), rgb(4, 5, 6))');

    runFrame();

    expect(strokes.length).toBeGreaterThan(0);
    expect(new Set(strokes.map(stroke => stroke.color))).toEqual(new Set(['rgb(1, 2, 3)']));
  });

  it('resolves a token passed as the colour through the cascade', async () => {
    withContext();
    await mount([], host => host.color.set('var(--wr-color-primary)'));
    threads().style.setProperty('--wr-color-primary', 'rgb(10, 20, 30)');

    runFrame();

    expect(strokes.at(-1)!.color).toBe('rgb(10, 20, 30)');
  });

  it('bends the threads near the pointer toward it and leaves the far ones alone', async () => {
    withContext();
    box(800, 200);
    await mount();
    runFrame();
    const rest = pointsOf(drawn.at(-1)!);

    window.dispatchEvent(pointer('pointermove', 600, 20));
    for (let i = 0; i < 12; i++) runFrame();
    const bent = pointsOf(drawn.at(-1)!);

    expect(bent).toHaveLength(rest.length);
    const shift = (near: (x: number) => boolean): number[] =>
      rest.flatMap(([x, y], i) => (near(x) ? [bent[i][1] - y] : []));
    const under = shift(x => Math.abs(x - 600) <= 12);
    const far = shift(x => x <= 100);
    const mean = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;

    // Up, toward the pointer's y of 20, and by a visible amount — while half a
    // box away the threads have not moved at all.
    expect(mean(under)).toBeLessThan(-5);
    expect(Math.max(...far.map(Math.abs))).toBe(0);
  });

  it('lets the threads go once the pointer leaves the page', async () => {
    withContext();
    box(400, 200);
    await mount();
    runFrame();
    const rest = pointsOf(drawn.at(-1)!);

    window.dispatchEvent(pointer('pointermove', 200, 20));
    for (let i = 0; i < 12; i++) runFrame();
    expect(pointsOf(drawn.at(-1)!)).not.toEqual(rest);

    document.documentElement.dispatchEvent(new MouseEvent('pointerleave'));
    for (let i = 0; i < 200; i++) runFrame();

    expect(pointsOf(drawn.at(-1)!)).toEqual(rest);
  });

  it('ignores a pointer outside its own box', async () => {
    withContext();
    box(400, 200);
    await mount();
    runFrame();
    const rest = pointsOf(drawn.at(-1)!);

    window.dispatchEvent(pointer('pointermove', 600, 20));
    for (let i = 0; i < 12; i++) runFrame();

    expect(pointsOf(drawn.at(-1)!)).toEqual(rest);
  });

  it('does not listen for the pointer at all when told not to follow it', async () => {
    const listen = vi.spyOn(window, 'addEventListener');
    withContext();
    box(400, 200);
    await mount([], host => host.followPointer.set(false));
    runFrame();
    const rest = pointsOf(drawn.at(-1)!);

    window.dispatchEvent(pointer('pointermove', 200, 20));
    for (let i = 0; i < 12; i++) runFrame();

    expect(listen.mock.calls.some(([type]) => type === 'pointermove')).toBe(false);
    expect(pointsOf(drawn.at(-1)!)).toEqual(rest);
  });

  it('drops the pointer listeners when following is switched off, and keeps the current running', async () => {
    withContext();
    await mount();
    const remove = vi.spyOn(window, 'removeEventListener');
    runFrame();

    fixture.componentInstance.followPointer.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));

    const before = painted;
    runFrame();
    expect(painted).toBeGreaterThan(before);
  });

  it('moves the current with time', async () => {
    withContext();
    box(400, 200);
    await mount();
    runFrame(1000);
    runFrame(1016);
    expect(pointsOf(drawn[1])).not.toEqual(pointsOf(drawn[0]));
  });

  it('holds the current at speed 0, drawing again only for the pointer or a changed picture', async () => {
    withContext();
    box(400, 200);
    await mount([], host => host.speed.set(0));

    // One frame, and the loop stays for the pointer — but a frame that would
    // repeat the last one is not drawn.
    runFrames(3);
    expect(painted).toBe(1);
    expect(frames).toHaveLength(1);

    window.dispatchEvent(pointer('pointermove', 200, 20));
    runFrame(2000);
    expect(painted).toBe(2);

    // Let go: it draws until the pull is gone, then stops drawing again.
    document.documentElement.dispatchEvent(new MouseEvent('pointerleave'));
    runFrames(200, 3000);
    const released = painted;
    runFrames(3, 9000);
    expect(painted).toBe(released);

    // An input change is a new picture, so the held loop draws it.
    fixture.componentInstance.lineCount.set(3);
    fixture.detectChanges();
    await fixture.whenStable();
    runFrame(10_000);
    expect(painted).toBe(released + 1);
    expect(drawn.at(-1)).toHaveLength(3);
  });

  it('runs no loop at all at speed 0 with no pointer to follow, and holds the frame where it was', async () => {
    withContext();
    box(400, 200);
    await mount([], host => host.followPointer.set(false));
    runFrames(20);
    const flowing = pointsOf(drawn.at(-1)!);
    const before = painted;

    fixture.componentInstance.speed.set(0);
    fixture.detectChanges();
    await fixture.whenStable();

    // The still frame lands at once, where the current stood rather than back at its start.
    expect(painted).toBe(before + 1);
    expect(pointsOf(drawn.at(-1)!)).toEqual(flowing);
    expect(pointsOf(drawn.at(-1)!)).not.toEqual(pointsOf(drawn[0]));

    runFrames(3, 5000);
    expect(painted, 'nothing can move, so no frame is asked for').toBe(before + 1);

    fixture.componentInstance.lineCount.set(3);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(painted).toBe(before + 2);
    expect(drawn.at(-1)).toHaveLength(3);

    // Mounted that way, it draws its frame with no loop behind it. What the page
    // is holding may include Angular's own scheduler frame, so run it: a loop
    // would have asked for the next one.
    const mounted = painted;
    await mount([], host => {
      host.followPointer.set(false);
      host.speed.set(0);
    });
    expect(painted).toBe(mounted + 1);
    runFrame(6000);
    expect(frames).toHaveLength(0);
    expect(painted).toBe(mounted + 1);
  });

  it('redraws at once on a resize, at the current where it stands', async () => {
    withContext();
    box(400, 200);
    await mount();
    runFrames(20);
    const last = pointsOf(drawn.at(-1)!);
    const before = painted;

    // Sizing the bitmap clears it, so the frame cannot wait for the next tick.
    resize();

    expect(painted).toBe(before + 1);
    expect(pointsOf(drawn.at(-1)!)).toEqual(last);
    expect(pointsOf(drawn.at(-1)!)).not.toEqual(pointsOf(drawn[0]));
  });

  it('redraws the still frame on a resize under reduced motion, which nothing else would', async () => {
    withContext();
    box(400, 200);
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    expect(painted).toBe(1);

    resize();
    expect(painted).toBe(2);

    window.dispatchEvent(new Event('resize'));
    expect(painted).toBe(3);
  });

  it('sizes from the layout box and maps the pointer into it, under a transform', async () => {
    withContext();
    box(600, 200);
    await mount();
    runFrame();
    window.dispatchEvent(pointer('pointermove', 450, 20));
    for (let i = 0; i < 12; i++) runFrame();
    const plain = pointsOf(drawn.at(-1)!).flat();

    // The same box mid `scale(0.96)` — the way a `wr-dialog` enters — drawn 576 × 192
    // from (12, 4), with the pointer over the same spot of it.
    box(600, 200, { left: 12, top: 4, width: 576, height: 192 });
    await mount();
    expect([canvas()!.width, canvas()!.height]).toEqual([600, 200]);
    runFrame();
    window.dispatchEvent(pointer('pointermove', 12 + 450 * 0.96, 4 + 20 * 0.96));
    for (let i = 0; i < 12; i++) runFrame();

    const scaled = pointsOf(drawn.at(-1)!).flat();
    expect(scaled).toHaveLength(plain.length);
    expect(Math.max(...scaled.map((value, i) => Math.abs(value - plain[i])))).toBeLessThan(1e-6);
  });

  it('draws one still frame for someone who asked for less motion, and listens for no pointer', async () => {
    const listen = vi.spyOn(window, 'addEventListener');
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(painted).toBe(1);
    expect(threads().classList.contains('wr-threads--painted')).toBe(true);
    expect(listen).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(listen.mock.calls.some(([type]) => type === 'pointermove')).toBe(false);

    window.dispatchEvent(pointer('pointermove', 10, 10));
    runFrame();
    runFrame();

    expect(painted).toBe(1);
  });

  it('repaints the still frame when an input changes under reduced motion', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    expect(painted).toBe(1);

    fixture.componentInstance.lineCount.set(3);
    fixture.componentInstance.color.set('rgb(9, 8, 7)');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(painted).toBe(2);
    expect(strokes.slice(-3).map(stroke => stroke.color)).toEqual(['rgb(9, 8, 7)', 'rgb(9, 8, 7)', 'rgb(9, 8, 7)']);
    expect(drawn.at(-1)).toHaveLength(3);
  });

  it('redraws the still frame in the new colour when the scheme switches', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    // jsdom resolves every `light-dark()` to its light half, so the switch is
    // staged on the hook itself: the new value is in place BEFORE the scheme
    // moves, and only the scheme switch may bring it to the canvas.
    threads().style.setProperty('--wr-threads-color', 'rgb(255, 0, 0)');
    runFrame();
    expect(painted, 'a still frame schedules nothing on its own').toBe(1);

    document.documentElement.style.colorScheme = 'dark';
    try {
      await new Promise(resolve => setTimeout(resolve));

      expect(painted).toBe(2);
      expect(strokes.at(-1)!.color).toBe('rgb(255, 0, 0)');
    } finally {
      document.documentElement.style.removeProperty('color-scheme');
    }
  });

  it('follows reduced motion switched on and off while the page is open', async () => {
    const reduce = signal(false);
    withContext();
    await mount([{ provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: reduce } }]);
    const remove = vi.spyOn(window, 'removeEventListener');
    runFrame();
    expect(painted).toBe(1);

    // Switched on: the pointer listener goes, the loop stops, one still frame is drawn.
    reduce.set(true);
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
    const still = painted;
    expect(still).toBe(2);
    frames = [];
    runFrame();
    expect(painted).toBe(still);

    // And off again: the current flows once more.
    reduce.set(false);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(still);
  });

  it('parks the loop off screen and resumes it in view', async () => {
    let report: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
    withContext();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
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

    report!([{ isIntersecting: false }]);
    await fixture.whenStable();
    expect(cancel).toHaveBeenCalled();
    frames = [];
    const parked = painted;
    runFrame();
    expect(painted).toBe(parked);

    report!([{ isIntersecting: true }]);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(parked);

    fixture.destroy();
    expect(report, 'the observer is disconnected with the component').toBeNull();
  });

  it('backs the canvas at 2x, and steps down on a box too large for the pixel budget', async () => {
    withContext();
    vi.stubGlobal('devicePixelRatio', 2);

    box(1280, 450);
    await mount();
    expect([canvas()!.width, canvas()!.height]).toEqual([2560, 900]);

    // 3456 × 1120 at 2x would be 3.9 MP; the budget brings it to 2.5 MP.
    fixture.destroy();
    box(1728, 560);
    await mount();
    expect(canvas()!.width * canvas()!.height).toBeLessThanOrEqual(2_500_000 + 1728 + 560);
    expect(canvas()!.width).toBeGreaterThan(1728);
  });

  it('tears down the listeners, the observer and the frame it installed', async () => {
    withContext();
    await mount();
    const remove = vi.spyOn(window, 'removeEventListener');
    const leave = vi.spyOn(document.documentElement, 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    fixture.destroy();

    // A background is one per route, so a leaked listener, observer or running
    // frame per instance is something nothing else would ever notice.
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(leave).toHaveBeenCalledWith('pointerleave', expect.any(Function));
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
  });
});
