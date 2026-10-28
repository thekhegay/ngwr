import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrWaves } from './waves';

@Component({
  imports: [WrWaves],
  template: `<wr-waves [friction]="friction()" [tension]="tension()" [lineColor]="lineColor()" />`,
})
class Host {
  readonly lineColor = signal<string | null>(null);
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
/** The `strokeStyle` each pass of `drawLines()` closed its path with. */
let strokes: string[];
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;
/** Path calls, by name: `moveTo` opens a line, `lineTo` and `quadraticCurveTo` extend it. */
let pathCalls: Record<'moveTo' | 'lineTo' | 'quadraticCurveTo', number>;
/**
 * Every pass of `drawLines()`, opened by its `clearRect`: one entry per line, holding
 * the point `moveTo` started it at, each curve's control point, and the point
 * `lineTo` closed it on. A grid at rest draws every line straight down.
 */
let passes: [number, number][][][];
/** The callback the component gave its resize observer, for the spec to deliver entries through. */
let observed: ResizeObserverCallback | null;

/**
 * Enough of a 2D context for `boot()` to reach its last line, and nothing more.
 *
 * Every call is a no-op but two: `clearRect`, which opens each pass of
 * `drawLines()` and is therefore the count of what was painted, and `stroke()`,
 * which closes it and reads back the `strokeStyle` the component had just
 * assigned. The path calls are recorded into `passes` as well, so a spec can
 * tell a drifted field from a grid at rest. jsdom also has no `ResizeObserver`,
 * which `boot()` installs a few lines after the context, so the spec supplies
 * the smallest one it can disconnect, and keeps its callback so `resized()` can
 * deliver an entry.
 */
const withContext = (): void => {
  const ctx: Record<string, unknown> = {
    clearRect: () => {
      painted++;
      passes.push([]);
    },
    stroke: () => {
      strokes.push(String(ctx['strokeStyle']));
    },
    moveTo: (x: number, y: number) => {
      pathCalls.moveTo++;
      passes.at(-1)?.push([[x, y]]);
    },
    lineTo: (x: number, y: number) => {
      pathCalls.lineTo++;
      passes.at(-1)?.at(-1)?.push([x, y]);
    },
    quadraticCurveTo: (cx: number, cy: number) => {
      pathCalls.quadraticCurveTo++;
      passes.at(-1)?.at(-1)?.push([cx, cy]);
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy(ctx, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
  );

  class Observer {
    constructor(callback: ResizeObserverCallback) {
      observed = callback;
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

/**
 * A laid-out box for every element, since jsdom lays nothing out. `width` × `height`
 * is the layout box (`clientWidth` / `clientHeight`); `rect` is the box as painted,
 * after transforms, which is the same box unless a spec scales it.
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

/** Whether any line in a pass bends — a grid at rest draws every one straight down. */
const bends = (pass: [number, number][][]): boolean => pass.some(line => line.some(([x]) => x !== line[0][0]));

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
    strokes = [];
    disconnects = 0;
    frames = [];
    pathCalls = { moveTo: 0, lineTo: 0, quadraticCurveTo: 0 };
    passes = [];
    observed = null;
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

  it('redraws the still grid in the new colour when the scheme switches', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    // jsdom resolves every `light-dark()` to its light half, so the switch is
    // staged on the hook itself: the new value is in place BEFORE the scheme
    // moves, and only the scheme switch may bring it to the canvas.
    waves()!.style.setProperty('--wr-waves-line-color', 'rgb(255, 0, 0)');
    runFrame();
    expect(painted, 'a still grid schedules nothing on its own').toBe(1);

    document.documentElement.style.colorScheme = 'dark';
    try {
      await new Promise(resolve => setTimeout(resolve));

      expect(painted).toBe(2);
      expect(strokes.at(-1)).toBe('rgb(255, 0, 0)');
    } finally {
      document.documentElement.style.removeProperty('color-scheme');
    }
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

  it('stops asking for frames while it is off screen, and picks up when it is back', async () => {
    withContext();
    let report: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          report = callback;
        }
        observe(): void {
          /* the spec reports by hand */
        }
        disconnect(): void {
          /* as above */
        }
      }
    );
    // Frames by id, so a cancelled one is really withdrawn. Angular's scheduler
    // asks for frames too, so the count to read is what was PAINTED.
    const held = new Map<number, FrameRequestCallback>();
    let lastId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => {
      held.set(++lastId, frame);
      return lastId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
      held.delete(id);
    });
    const flush = (): void => {
      const pending = [...held.values()];
      held.clear();
      for (const frame of pending) frame(16);
    };
    await mount();

    flush();
    expect(painted, 'nothing is drawn before the observer says the field is in view').toBe(0);

    report!([{ isIntersecting: true }]);
    flush();
    expect(painted).toBe(1);

    report!([{ isIntersecting: false }]);
    flush();
    expect(painted, 'off screen, the frame it had asked for is withdrawn').toBe(1);

    // Back in view twice over: one loop, not a second beside the first.
    report!([{ isIntersecting: true }]);
    report!([{ isIntersecting: true }]);
    flush();
    expect(painted).toBe(2);
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

  it('sizes the canvas from the box before transforms, not from the scaled rect', async () => {
    withContext();
    // A dialog scaling in from 0.96: the layout box is 1000 × 450, the rect as
    // painted 960 × 432 and centred on it. No resize observer hears of a
    // transform, so whatever boot() measures is what the field keeps.
    box(1000, 450, { left: 20, top: 9, width: 960, height: 432 });
    await mount();
    runFrame();

    expect([canvas()!.width, canvas()!.height]).toEqual([1000, 450]);
    // Laid out across the 1000px box: a line every 10px from 100px past each edge.
    expect(passes.at(-1)!.length).toBe(121);

    // The observer's first entry lands mid-animation too, and carries the layout
    // box. Read from the entry, it agrees with boot() and changes nothing.
    resized(1000, 450);
    expect([canvas()!.width, canvas()!.height]).toEqual([1000, 450]);
    expect(painted).toBe(1);
  });

  it('maps the pointer back through a transform on the host or an ancestor', async () => {
    withContext();
    // Scaled to half and centred: the layout box is 1000 × 450, the rect 500 × 225.
    box(1000, 450, { left: 250, top: 112.5, width: 500, height: 225 });
    await mount();
    runFrame();
    // A line every 10px from -100, so line 90 stands at 800 and line 50 at 400.
    const before = passes.at(-1)!;
    expect(before.length).toBe(121);

    // The grid's (800, 430) shows at 250 + 800 × 0.5, 112.5 + 430 × 0.5. The second
    // move gives the pointer the speed that pushes the lines near it.
    const move = (x: number, y: number): void => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
    };
    move(250 + 800 * 0.5, 112.5 + 430 * 0.5);
    move(250 + 840 * 0.5, 112.5 + 430 * 0.5);
    for (let i = 0; i < 6; i++) runFrame();
    const after = passes.at(-1)!;

    // Every frame is stamped alike, so the drift is the same and only the pointer
    // differs. Read one to one, the pointer lands at 400 and pushes line 50 instead.
    expect(after[90]).not.toEqual(before[90]);
    expect(after[50]).toEqual(before[50]);
    // And down the line: its points stand every 32px from -15, so the 175px push
    // around 430 reaches from the tenth point to the fifteenth. Read one to one,
    // the pointer lands at 215, leaves the point at 433 alone and pushes the top.
    expect(after[90][14]).not.toEqual(before[90][14]);
    expect(after[90].slice(0, 8)).toEqual(before[90].slice(0, 8));
  });

  it('repaints inside the observer callback for a new box, with no frame in between', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();
    expect(painted).toBe(1);

    // Entries arrive after the frame's own callbacks and before its paint, and
    // writing the canvas size clears it, so a repaint left to the next frame
    // would leave this one blank.
    box(300, 240);
    const asked = frames.length;
    resized(300, 240);

    expect([canvas()!.width, canvas()!.height]).toEqual([300, 240]);
    expect(painted).toBe(2);
    expect(frames.length, 'nothing left for a frame to do').toBe(asked);
    // Laid out again across the new box, and drawn where the drift had the
    // field, not as a grid at rest for a frame.
    expect(passes.at(-1)!.length).toBe(Math.ceil(500 / 10) + 1);
    expect(bends(passes.at(-1)!)).toBe(true);
  });

  it('leaves the canvas alone for an observer entry that repeats the box', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();
    const widths = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
    const heights = vi.spyOn(HTMLCanvasElement.prototype, 'height', 'set');

    // The observer's first entry repeats the box boot() measured. Writing the
    // canvas size clears the bitmap even to the value it already has.
    resized(240, 240);
    window.dispatchEvent(new Event('resize'));

    expect(widths).not.toHaveBeenCalled();
    expect(heights).not.toHaveBeenCalled();
    expect(painted).toBe(1);
  });

  it('backs the canvas again when the pixel ratio changes, and repaints at once', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();
    const before = passes.at(-1)!;

    // Browser zoom or a move to another screen: a window resize and no new box.
    vi.stubGlobal('devicePixelRatio', 2);
    window.dispatchEvent(new Event('resize'));

    expect([canvas()!.width, canvas()!.height]).toEqual([480, 480]);
    expect(painted).toBe(2);
    // Same box, same lines: only the backing store changed under them.
    expect(passes.at(-1)).toEqual(before);

    // Nothing changed this time, so nothing is cleared or drawn.
    window.dispatchEvent(new Event('resize'));
    expect(painted).toBe(2);
  });

  it('strokes with the line colour resolved, never with text a canvas cannot read', async () => {
    withContext();
    await mount();
    // The theme declares the hook as a `light-dark()` pair, and no canvas reads
    // one: Chromium and WebKit refuse it and keep the previous stroke, Firefox
    // paints the light half in every scheme. jsdom resolves the light half, as a
    // browser does with no dark scheme in effect.
    waves()!.style.setProperty('--wr-waves-line-color', 'light-dark(rgb(1, 2, 3), rgb(4, 5, 6))');

    runFrame();

    expect(strokes).toEqual(['rgb(1, 2, 3)']);
  });

  it('bends each line through curves rather than joining its points with straight segments', async () => {
    withContext();
    // jsdom lays nothing out, and a 0×0 box leaves two points per line — no
    // interior to bend. A box tall enough for several points per line is what
    // makes the difference between a curve and a polyline visible.
    box(100, 240);
    await mount();

    runFrame();

    // Every interior point is a curve's control; the only straight piece is
    // the half-segment that closes each line. As a polyline, `lineTo` ran once
    // per point and no curve was drawn at all.
    expect(pathCalls.moveTo).toBeGreaterThan(0);
    expect(pathCalls.quadraticCurveTo).toBeGreaterThan(pathCalls.moveTo);
    expect(pathCalls.lineTo).toBe(pathCalls.moveTo);
  });

  it('follows reduced motion switched on and off while the page is open', async () => {
    const reduce = signal(false);
    withContext();
    box(240, 240);
    await mount([{ provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: reduce } }]);
    const remove = vi.spyOn(window, 'removeEventListener');
    runFrame();
    expect(painted).toBeGreaterThan(0);

    // Switched on: the pointer listeners go, the loop stops, one still grid is drawn.
    reduce.set(true);
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));

    // A new box lays the still grid out again at rest: the drift of the last
    // frame the loop drew does not carry into a field that no longer moves.
    box(300, 240);
    const drawn = painted;
    resized(300, 240);
    expect(painted).toBe(drawn + 1);
    expect(passes.at(-1)!.length).toBe(Math.ceil(500 / 10) + 1);
    expect(bends(passes.at(-1)!)).toBe(false);

    const still = painted;
    frames = [];
    runFrame();
    expect(painted).toBe(still);

    // And off again: the field drifts once more.
    reduce.set(false);
    await fixture.whenStable();
    runFrame();
    expect(painted).toBeGreaterThan(still);
  });

  it('repaints the still grid when the line colour changes under reduced motion', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    expect(painted).toBe(1);

    fixture.componentInstance.lineColor.set('rgb(9, 8, 7)');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(painted).toBe(2);
    expect(strokes.at(-1)).toBe('rgb(9, 8, 7)');
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
