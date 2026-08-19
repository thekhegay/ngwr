import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFuzzyText } from './fuzzy-text';
import type { WrFuzzyTextDirection } from './interfaces';

@Component({
  imports: [WrFuzzyText],
  template: `<wr-fuzzy-text
    [text]="text()"
    [color]="color()"
    [direction]="direction()"
    [fuzzRange]="fuzzRange()"
    [enableHover]="enableHover()"
    [clickEffect]="clickEffect()"
  />`,
})
class Host {
  readonly text = signal('404');
  readonly color = signal('inherit');
  readonly direction = signal<WrFuzzyTextDirection>('horizontal');
  readonly fuzzRange = signal(30);
  readonly enableHover = signal(true);
  readonly clickEffect = signal(false);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * This component paints its text into a canvas as PIXELS, and jsdom will not hand it
 * a context — which is half of what is worth pinning, since a refused context is a
 * real browser answer and `init()` has to stop on it rather than push on.
 *
 * The other half needed a context, and past that guard there was nothing to observe
 * at all: the reduced-motion still, the fuzz loop, the frame-rate cap, hover
 * reactivity and the whole teardown were unreachable, so the tests named after them
 * could only assert that rendering does not throw — true of a component that draws
 * nothing. Those mount `withContext()`.
 *
 * Three stubs make that work, and each one is jsdom missing something rather than a
 * convenience:
 *
 * - a 2D context whose `measureText` answers with a fixed box, because jsdom has no
 *   text metrics and every downstream size is derived from them;
 * - `document.fonts`, which jsdom does not implement at all — `init()` suspends on
 *   `document.fonts.load()`, so without it the continuation never runs, and counting
 *   its calls is what makes the null-context guard readable;
 * - a fixed `Math.random()`, which turns the per-row offset from noise into a
 *   READING of the current intensity. `dx = floor(intensity * (random - 0.5) *
 *   fuzzRange)`, so with `random` pinned at 1 the idle, hovered and clicked states
 *   are three different numbers on the canvas: 2, 7 and 15. That is the only place
 *   the intensity ramp is visible from outside.
 *
 * `afterNextRender` is why the error recorder exists: what `init()` throws never
 * reaches `detectChanges()` or `whenStable()` — Angular reports it to the
 * `ErrorHandler` and the fixture carries on.
 *
 * What stays out of reach: glitch bursts and the click spike's own 150ms release are
 * driven by `setTimeout`, and the pointer geometry is read off
 * `getBoundingClientRect()`, which is 0×0 for everything here — the spec compensates
 * by treating client coordinates as canvas-local, which is only true because the
 * rect is all zeros.
 */

/** Everything `init()` threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** `clearRect` calls: one per pass of the fuzz loop that was not skipped by the frame cap. */
let cleared: number;
/** The three-argument `drawImage` — the single clean copy the reduced-motion branch paints. */
let stills: number;
/** The nine-argument `drawImage`, one per row (or column), holding the offset it was slid by. */
let slices: number[];
/** `document.fonts.load()` calls — `init()` reaching past the context check. */
let fontLoads: number;
/** Frames the page asked for, keyed the way the page keyed them so a cancel can take effect. */
let frames: Map<number, FrameRequestCallback>;
/** Frame ids the page cancelled. */
let cancelled: number[];
let nextFrameId: number;

/**
 * Frames are held, not fired, and run by hand at a timestamp the test chooses: the
 * frame-rate cap is `ts - lastFrame` against `1000 / fps`, and reading that off the
 * wall clock in a backgrounded jsdom is how a spec starts flaking.
 *
 * Unlike the sibling canvas specs this holder honours `cancelAnimationFrame`, because
 * an input change here tears the old loop down and starts a new one — a holder that
 * kept the cancelled callback would run two loops and report the leak this is meant
 * to catch.
 */
const holdFrames = (): void => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => {
    frames.set(++nextFrameId, frame);
    return nextFrameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    cancelled.push(id);
    frames.delete(id);
  });
};

/** Run every frame the page is currently holding, once, at `ts`. */
const runFrame = (ts: number): void => {
  const pending = [...frames.values()];
  frames.clear();
  for (const frame of pending) frame(ts);
};

/**
 * jsdom implements no `FontFaceSet`, and `init()` suspends on `document.fonts.load()`
 * — so without this the continuation never runs at all. It is installed for EVERY
 * mount, context or none: counting the calls is how the null-context guard is read,
 * and a loader that was never there would report zero for a component that stopped
 * and for one that pushed straight on alike.
 *
 * `load` is a parameter so one test can hold the fonts unresolved and destroy the
 * component while it waits, which is the case the component's own `destroyed` flag
 * exists for.
 */
const withFonts = (load: () => Promise<unknown> = () => Promise.resolve([])): void => {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      load: () => {
        fontLoads++;
        return load();
      },
      get ready() {
        fontLoads++;
        return load();
      },
    },
  });
};

/**
 * Enough of a 2D context and a random source for `init()` to reach its last line, and
 * nothing more.
 */
const withContext = (load?: () => Promise<unknown>): void => {
  holdFrames();
  withFonts(load);

  const ctx: Record<string, unknown> = {
    clearRect: () => {
      cleared++;
    },
    drawImage: (...args: unknown[]) => {
      if (args.length === 3) {
        stills++;
        return;
      }
      // A row slide copies a strip one pixel TALL and carries its offset sixth; a
      // column slide copies one a pixel WIDE and carries it seventh. Told apart by
      // the strip rather than by position, so an offset of zero stays a zero
      // instead of reading back as whichever row it landed on.
      slices.push(Number(args[4] === 1 ? args[5] : args[6]));
    },
    // jsdom has no text metrics. A fixed box makes every size the component derives
    // from it a known number: 100 wide and 50 tall gives 110 offscreen pixels across
    // and 50 rows down, which is what the per-frame slice counts are read against.
    measureText: () => ({
      width: 100,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 100,
      actualBoundingBoxAscent: 40,
      actualBoundingBoxDescent: 10,
    }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy(ctx, { get: (target, key) => target[key as string] ?? ((): void => undefined) }) as never
  );

  // 1 makes `(random - 0.5)` exactly 0.5, so the row offset is `floor(intensity *
  // fuzzRange / 2)` — a direct read of the intensity the loop is running at.
  vi.spyOn(Math, 'random').mockReturnValue(1);
};

describe('WrFuzzyText', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const readable = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-fuzzy-text__sr-only');
  const canvas = (): HTMLCanvasElement => root().querySelector('canvas')!;

  /** `init()` suspends on the font loader, so a render is not enough — let the microtasks drain. */
  const flush = async (): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  };

  const mount = async (providers: unknown[] = [], setup?: (host: Host) => void): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...providers,
      ] as never[],
    });
    fixture = TestBed.createComponent(Host);
    // Applied before the first render, so `init()` boots with the final values rather
    // than tearing itself down for them. `enableHover` / `clickEffect` no longer care
    // either way — their listeners are always attached and read the input live — but
    // the thirteen bitmap inputs do.
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await flush();
  };

  beforeEach(async () => {
    thrown = [];
    cleared = 0;
    stills = 0;
    slices = [];
    fontLoads = 0;
    frames = new Map();
    cancelled = [];
    nextFrameId = 0;
    withFonts();
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    Reflect.deleteProperty(document, 'fonts');
    vi.restoreAllMocks();
  });

  it('carries its text as text, not only as pixels', () => {
    // Everything this component renders used to be a canvas: a screen reader got
    // an empty element where the page showed a headline.
    expect(readable()!.textContent).toBe('404');
    expect(canvas().getAttribute('aria-hidden')).toBe('true');
  });

  it('follows the text it is given', () => {
    fixture.componentInstance.text.set('Not found');
    fixture.detectChanges();

    expect(readable()!.textContent).toBe('Not found');
  });

  it('hides the readable copy without depending on a stylesheet', () => {
    // This entry point ships no CSS, so a consumer importing none would otherwise
    // see the text twice — once as pixels and once as a stray line of markup.
    // Read back off the element rather than as the authored string: the browser
    // normalises the declaration it was given.
    const style = readable()!.style;
    expect(style.position).toBe('absolute');
    expect(style.clipPath).toBe('inset(50%)');
    expect(style.width).toBe('1px');
  });

  it('survives a browser that will not give it a drawing context', () => {
    // Which is what jsdom is: `getContext('2d')` returns null here. Asked of the
    // handler, since an `afterNextRender` failure reaches nowhere else — and asked
    // of the font loader too, because the guard's whole job is to stop BEFORE the
    // expensive half. A component that pushed on would be waiting on a webfont it
    // has nowhere to paint.
    expect(thrown).toEqual([]);
    expect(canvas()).not.toBeNull();
    expect(fontLoads).toBe(0);
  });

  it('paints the text once, still, for someone who asked for less motion', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    // One clean copy of the offscreen text, and nothing that keeps moving: the
    // frames still arrive, they simply belong to nobody.
    expect(stills).toBe(1);
    runFrame(1000);
    runFrame(2000);

    expect(stills).toBe(1);
    expect(slices).toEqual([]);
    expect(readable()!.textContent).toBe('404');
  });

  it('slides one slice per row of the text, frame after frame', async () => {
    withContext();
    await mount();

    runFrame(1000);

    // 50 rows, from the 50-pixel-tall box `measureText` reported.
    expect(cleared).toBe(1);
    expect(slices.length).toBe(50);

    runFrame(2000);

    expect(slices.length).toBe(100);
  });

  it('skips a frame that arrives inside the frame-rate cap', async () => {
    withContext();
    await mount();

    // 60fps is one frame every 16.6ms; this one is 1ms in.
    runFrame(1);
    expect(slices).toEqual([]);
    expect(cleared).toBe(0);

    runFrame(1000);
    expect(slices.length).toBe(50);
  });

  it('slides columns instead of rows when asked', async () => {
    withContext();
    await mount([], host => host.direction.set('vertical'));

    runFrame(1000);

    // 110 columns — the 100-pixel text plus the 10-pixel buffer it is drawn into —
    // where the horizontal pass slides 50 rows.
    expect(slices.length).toBe(110);
  });

  it('widens the fuzz while the pointer is over the text, and narrows it again after', async () => {
    withContext();
    await mount();

    runFrame(1000);
    // floor(0.18 * 30 / 2): the idle base intensity, read off the canvas.
    expect([...new Set(slices)]).toEqual([2]);

    // The rect is 0×0 in jsdom, so a client coordinate IS a canvas coordinate. The
    // text sits between x=55 and x=155, y=0 and y=50.
    slices = [];
    canvas().dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 25 }));
    runFrame(2000);
    expect([...new Set(slices)]).toEqual([7]);

    // Off the glyphs but still on the canvas: the box, not the element, is what
    // reacts — which is the whole reason the component tracks one.
    slices = [];
    canvas().dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 25 }));
    runFrame(3000);
    expect([...new Set(slices)]).toEqual([2]);

    slices = [];
    canvas().dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 25 }));
    canvas().dispatchEvent(new MouseEvent('mouseleave'));
    runFrame(4000);
    expect([...new Set(slices)]).toEqual([2]);
  });

  it('does not react to the pointer at all when hover is off', async () => {
    withContext();
    await mount([], host => host.enableHover.set(false));

    canvas().dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 25 }));
    runFrame(1000);

    expect([...new Set(slices)]).toEqual([2]);
  });

  it('spikes to full fuzz on click, and only when asked to', async () => {
    withContext();
    await mount([], host => host.clickEffect.set(true));

    canvas().dispatchEvent(new MouseEvent('click'));
    runFrame(1000);

    // floor(1 * 30 / 2) — the intensity is pinned at 1 for the length of the spike.
    expect([...new Set(slices)]).toEqual([15]);
  });

  it('ignores a click when the click effect is off', async () => {
    withContext();
    await mount();

    canvas().dispatchEvent(new MouseEvent('click'));
    runFrame(1000);

    expect([...new Set(slices)]).toEqual([2]);
  });

  /**
   * Both of these flip an input AFTER the component has booted, and neither is in the
   * re-init effect's dependency list — so nothing tears the loop down and restarts it.
   * The listeners were once attached only if the input was true at boot, which made a
   * signal starting `false` (the default for `clickEffect`, and the ordinary way to
   * bind either) a switch that never turned on: nothing happened until some unrelated
   * input forced a re-init, and then it all started working.
   */
  it('starts spiking on click when the click effect is turned on after booting', async () => {
    withContext();
    await mount();

    fixture.componentInstance.clickEffect.set(true);
    fixture.detectChanges();
    canvas().dispatchEvent(new MouseEvent('click'));
    runFrame(1000);

    expect([...new Set(slices)]).toEqual([15]);
  });

  it('starts reacting to the pointer when hover is turned on after booting', async () => {
    withContext();
    await mount([], host => host.enableHover.set(false));

    fixture.componentInstance.enableHover.set(true);
    fixture.detectChanges();
    canvas().dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 25 }));
    runFrame(1000);

    expect([...new Set(slices)]).toEqual([7]);
  });

  it('redraws with the new numbers when an input changes, without leaving the old loop running', async () => {
    withContext();
    await mount();

    runFrame(1000);
    expect([...new Set(slices)]).toEqual([2]);

    slices = [];
    fixture.componentInstance.fuzzRange.set(60);
    fixture.detectChanges();
    await flush();
    runFrame(2000);

    // Both halves matter. The offset moved, so the new numbers reached the loop; and
    // there are still 50 slices, so the loop that was running before was torn down
    // rather than left painting alongside the new one.
    expect([...new Set(slices)]).toEqual([5]);
    expect(slices.length).toBe(50);
  });

  it('starts nothing when it is destroyed while the font is still loading', async () => {
    let release!: () => void;
    withContext(() => new Promise<void>(resolve => (release = resolve)));
    await mount();

    // `init()` is suspended mid-way: the canvas is sized, nothing else has started,
    // and `teardown` is still undefined — so the destroy hook has nothing to call and
    // the continuation is the only thing that can stop itself.
    expect(fontLoads).toBe(1);
    fixture.destroy();
    release();
    await flush();
    runFrame(1000);

    expect(slices).toEqual([]);
    expect(stills).toBe(0);
  });

  it('stops the loop and lets go of the canvas when destroyed', async () => {
    withContext();
    await mount();
    const drop = vi.spyOn(canvas(), 'removeEventListener');

    fixture.destroy();

    expect(cancelled.length).toBeGreaterThan(0);
    expect(drop).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(drop).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    expect(drop).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(drop).toHaveBeenCalledWith('touchend', expect.any(Function));

    // And it really stopped, rather than only having said so.
    runFrame(9000);
    expect(slices).toEqual([]);
  });

  it('renders the readable text on the server too', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(readable()!.textContent).toBe('404');
    expect(thrown).toEqual([]);
  });
});
