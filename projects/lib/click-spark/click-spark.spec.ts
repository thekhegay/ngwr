import { Component, ErrorHandler, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrClickSpark } from './click-spark';

@Component({
  imports: [WrClickSpark],
  template: `
    <wr-click-spark [sparkCount]="sparkCount()" [sparkColor]="sparkColor()" [duration]="duration()">
      <button type="button" class="inner">Click me</button>
    </wr-click-spark>
  `,
})
class Host {
  readonly sparkCount = signal(8);
  readonly sparkColor = signal('var(--wr-color-dark)');
  readonly duration = signal(400);
}

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Sparks drawn into a 2D canvas jsdom will not give a context for, which is the
 * state half this spec is for: `getContext('2d')` returning null is a real browser
 * answer, and the component has to put its canvas up over the projected content and
 * stop rather than throw.
 *
 * Past that guard there was nothing to observe, so the tests named after the burst,
 * the reduced-motion policy and the teardown could only assert that a click does not
 * throw — true of a component that never draws a thing. Those mount `withContext()`
 * instead: the smallest 2D context that lets `startLoop()` run, with every `stroke()`
 * and the colour it was painted in recorded.
 *
 * `afterNextRender` is why the recorder exists at all: what `startLoop()` throws
 * never reaches `detectChanges()` or `whenStable()` — Angular reports it to the
 * `ErrorHandler` and the fixture carries on as though nothing happened.
 *
 * What stays out of reach: the canvas is sized from `getBoundingClientRect()`, which
 * is 0×0 for everything in jsdom, so `syncCanvasSize` and the debounced resize it
 * hangs off can only ever be observed writing zero over zero. The spec counts the
 * observer's `disconnect()` and leaves its callback alone.
 */

/** Everything the deferred boot threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** `clearRect` calls, one per pass of the draw loop — the frames that ran, painted or not. */
let cleared: number;
/** One entry per spark line drawn, holding the `strokeStyle` it was drawn with. */
let strokes: string[];
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;

/** The instant every spark in this spec is born at — see `clickAt`. Any value; only its fixedness matters. */
const CLICK_TIME = 1_000;

/**
 * Frames are held, not fired, and run by hand with a timestamp the test chooses:
 * a spark's whole life is `ts - startTime` against `duration`, and reading that
 * off the wall clock in a backgrounded jsdom is how a spec starts flaking. It is
 * also what makes the null-context guard observable — the loop is scheduled
 * inside `startLoop()` but only dereferences the context a frame later, so a spec
 * that never runs a frame passes with the guard deleted.
 */
const holdFrames = (): void => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
};

/**
 * Enough of a 2D context for `startLoop()` to run, and nothing more.
 *
 * Two calls are recorded: `clearRect`, which opens every pass of the loop, and
 * `stroke()`, which closes every spark line and reads back the `strokeStyle` the
 * component had just assigned — the only place `resolveColor()` is observable.
 * jsdom also has no `ResizeObserver`, which the component installs one line after
 * the canvas size, so the spec supplies the smallest one it can disconnect.
 */
const withContext = (): void => {
  holdFrames();
  const ctx: Record<string, unknown> = {
    clearRect: () => {
      cleared++;
    },
    stroke: () => {
      strokes.push(String(ctx['strokeStyle']));
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // Anything else — `beginPath`, `moveTo`, `lineWidth` — travels straight into a
    // no-op, and inventing a plausible answer for it would say nothing this stub
    // does not already say.
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
};

/**
 * Run every frame the page is currently holding, once, at `ts`, and check that
 * exactly `passes` of them were the component's draw loop.
 *
 * `draw` re-schedules itself into the NEXT batch, so two of them held at the
 * same time means one `runFrame` paints twice — as does a second live instance
 * sharing this recorder. Either way the only symptom is a doubled number
 * several lines later, in an assertion about colours or spark counts that names
 * nothing about frames; this fails at the frame that ran twice instead.
 *
 * It counts PASSES rather than held callbacks because the array is not the
 * component's alone: zoneless change detection schedules through
 * `scheduleCallbackWithRafRace`, which asks for a `requestAnimationFrame` and a
 * `setTimeout` and takes whichever fires first. The timeout always wins here —
 * the mock never fires — so Angular's entries are inert by the time a test runs
 * them, but they are in the array (two to four of them per test, varying with
 * how many times a test calls `detectChanges()`). `clearRect` opens every pass
 * of `draw` and nothing else, so its delta counts the component's frames alone.
 */
const runFrame = (ts: number, passes: number): void => {
  const pending = frames;
  frames = [];
  const before = cleared;
  for (const frame of pending) frame(ts);
  expect(cleared - before, `draw passes at ts=${ts}`).toBe(passes);
};

describe('WrClickSpark', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-click-spark')!;
  const canvas = (): HTMLCanvasElement => root().querySelector<HTMLCanvasElement>('.wr-click-spark__canvas')!;

  /**
   * Click the host with the clock pinned, and hand back the exact instant every
   * spark of that burst was stamped with.
   *
   * Frames are already run by hand so the wall clock cannot decide anything —
   * but `onClick` stamps each spark with its OWN `performance.now()`, and that
   * was the one reading left on it. Sampling the clock just before the dispatch
   * made `startTime` = `t0 + skew`, so a test retiring the burst at `t0 + 401`
   * against a 400 ms duration was really asserting that the dispatch reached the
   * handler within 1 ms. The threshold was measured by inserting a busy-wait
   * between the sample and the dispatch: 0.5 ms passes, 1.5 ms fails, which is
   * the 1 ms the arithmetic predicts. Idle headroom was thinner than it looks —
   * steady-state skew here is 0.014–0.052 ms, but the FIRST dispatch in a fresh
   * context is ~0.4 ms, and every `clickAt` in this file is a cold path, so the
   * margin was about 2× rather than the 10× a steady-state reading suggests.
   * A loaded shared runner descheduling the thread is enough to cross it;
   * coverage is NOT the mechanism, which was worth measuring rather than
   * assuming — dispatch skew is the same with and without `--coverage`, because
   * `@vitest/coverage-v8` is engine-level and does not instrument the source.
   * Past the threshold `elapsed` lands under 400, the sparks survive the frame
   * that is supposed to retire them, and the burst is painted a second time:
   * `expected 16 to be 8`, once in twenty-five CI runs, on a pull request that
   * changed a git hook.
   */
  const clickAt = (x = 10, y = 10): number => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(CLICK_TIME);
    try {
      host().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    } finally {
      clock.mockRestore();
    }
    return CLICK_TIME;
  };

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
    cleared = 0;
    strokes = [];
    disconnects = 0;
    frames = [];
    await mount();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('draws into a canvas that is decoration, not content', () => {
    expect(canvas()).not.toBeNull();
    expect(canvas().getAttribute('aria-hidden')).toBe('true');
  });

  it('lets the click through to what it wraps', () => {
    // The whole point is that it decorates an existing control rather than
    // replacing it — a canvas that ate the click would be useless.
    let clicked = 0;
    root()
      .querySelector('.inner')!
      .addEventListener('click', () => (clicked += 1));
    root().querySelector<HTMLElement>('.inner')!.click();

    expect(clicked).toBe(1);
  });

  it('survives a click with no drawing context behind the canvas', async () => {
    holdFrames();
    await mount();
    clickAt();

    // Asked of the handler rather than of `detectChanges()`: a listener that throws
    // during `dispatchEvent` is reported, not rethrown, so `not.toThrow()` here
    // holds for a component that blew up on every click.
    expect(thrown).toEqual([]);
    expect(canvas()).not.toBeNull();

    // And nothing is looping over the context it did not get. This is the only
    // shape the null-context guard is readable in: `startLoop()` returns before
    // scheduling, so a spec that never runs a frame passes with the guard deleted
    // and the first real frame throws in the page instead.
    expect(() => runFrame(0, 0)).not.toThrow();
    expect(cleared).toBe(0);
  });

  it('bursts one spark line per `sparkCount` on the next frame', async () => {
    withContext();
    await mount();
    fixture.componentInstance.sparkCount.set(5);
    fixture.detectChanges();

    const t0 = clickAt();
    runFrame(t0, 1);

    expect(strokes.length).toBe(5);
  });

  it('lets the sparks go once their duration is up', async () => {
    withContext();
    await mount();

    const t0 = clickAt();
    runFrame(t0, 1);
    const burst = strokes.length;
    expect(burst).toBe(8);

    runFrame(t0 + 401, 1);

    // Nothing more is painted, and the loop parks instead of spinning on an empty
    // array for the rest of the page's life. Parking is only safe where it is —
    // after the filter, and so after the `clearRect` that opens the frame — because
    // the pass that retires the last spark has already blanked the canvas. Park any
    // earlier and the last burst would stay frozen on it.
    expect(strokes.length).toBe(burst);
    expect(cleared).toBe(2);
    expect(frames).toEqual([]);
  });

  it('wakes the parked loop for the next click', async () => {
    withContext();
    await mount();

    const t0 = clickAt();
    runFrame(t0, 1);
    runFrame(t0 + 401, 1);
    expect(frames).toEqual([]);

    // The price of parking, and the regression it invites: a component that stopped
    // and never restarted would spark exactly once per page load, with no error and
    // no visible difference until the second click.
    const t1 = clickAt();
    expect(frames.length).toBe(1);
    runFrame(t1, 1);

    // Two full bursts at the default `[sparkCount]` of 8.
    expect(strokes.length).toBe(16);
  });

  it('makes no sparks for someone who asked for less motion', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    const t0 = clickAt();
    runFrame(t0, 1);
    runFrame(t0 + 16, 0);

    // Nothing was drawn, and the loop stopped after the single frame it was booted
    // with: `onClick` returns before pushing anything here, so this instance can
    // never paint, and it must not go on clearing a page-sized canvas every frame
    // to prove it. The second `runFrame` asks for zero passes, so a loop that kept
    // going fails there rather than here.
    expect(strokes).toEqual([]);
    expect(cleared).toBe(1);
  });

  it('resolves a `var(--wr-…)` spark colour against the host', async () => {
    withContext();
    await mount();
    // Canvas `strokeStyle` cannot read a custom property, so the component has to
    // resolve the token itself; a spark painted with the literal string `var(…)`
    // would be invisible.
    host().style.setProperty('--wr-color-dark', 'rgb(1, 2, 3)');

    const t0 = clickAt();
    runFrame(t0, 1);

    expect(strokes.length).toBe(8);
    expect([...new Set(strokes)]).toEqual(['rgb(1, 2, 3)']);
  });

  it('falls back to a dark literal when the token resolves to nothing', async () => {
    withContext();
    await mount();
    fixture.componentInstance.sparkColor.set('var(--wr-nothing-here)');
    fixture.detectChanges();

    const t0 = clickAt();
    runFrame(t0, 1);

    expect([...new Set(strokes)]).toEqual(['#0f172a']);
  });

  it('passes a plain colour through untouched', async () => {
    withContext();
    await mount();
    fixture.componentInstance.sparkColor.set('#ff0000');
    fixture.detectChanges();

    const t0 = clickAt();
    runFrame(t0, 1);

    expect([...new Set(strokes)]).toEqual(['#ff0000']);
  });

  it('tears down the frame loop and the observer it installed', async () => {
    withContext();
    await mount();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    fixture.destroy();

    // Dropping either `onDestroy` leaks a running rAF and a ResizeObserver per
    // instance, and this one wraps ordinary page content, so a route that mounts
    // several would leak several.
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
  });

  it('renders the canvas and the content on the server too', async () => {
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas()).not.toBeNull();
    expect(root().querySelector('.inner')).not.toBeNull();
    expect(thrown).toEqual([]);
  });
});
