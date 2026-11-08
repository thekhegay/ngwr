import { Directionality } from '@angular/cdk/bidi';
import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THREAD_LINES_FRAME_MS, THREAD_LINES_PULL_IN, THREAD_LINES_PULL_OUT, WrThreadLines } from './thread-lines';
import {
  GATHER_MIN,
  POINTS_MAX,
  POINTS_MIN,
  PULL,
  PULL_CLOSE,
  SWAY_MAX,
  SWAY_MIN,
  TINT_EVERY,
  createThreadNoise,
  threadApproach,
  threadLayout,
  threadPoints,
  threadPull,
  threadSpread,
  threadSway,
} from './thread-model';

@Component({
  imports: [WrThreadLines],
  template: `<section class="wrap">
    <wr-thread-lines />
    <p>Opt-in</p>
  </section>`,
})
class Host {}

interface FakeContext {
  readonly setTransform: ReturnType<typeof vi.fn>;
  readonly clearRect: ReturnType<typeof vi.fn>;
  readonly beginPath: ReturnType<typeof vi.fn>;
  readonly moveTo: ReturnType<typeof vi.fn>;
  readonly quadraticCurveTo: ReturnType<typeof vi.fn>;
  readonly lineTo: ReturnType<typeof vi.fn>;
  readonly stroke: ReturnType<typeof vi.fn>;
  strokeStyle: string;
  lineWidth: number;
}

/** jsdom has no 2D context; this one records what gets drawn. */
const fakeContext = (): FakeContext => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
});

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

/** The spread of a thread set's points at one place along, top to bottom. */
const span = (values: ArrayLike<number>, points: number, k: number, count: number): number => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = values[i * points + k];
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  return max - min;
};

describe('createThreadNoise', () => {
  it('is the same function for the same seed, and another for another', () => {
    const a = createThreadNoise();
    const b = createThreadNoise();
    const c = createThreadNoise(1);

    expect(a(0.3, 1.7, 4.2)).toBe(b(0.3, 1.7, 4.2));
    expect(a(12.5, 0.1, 9.9)).toBe(b(12.5, 0.1, 9.9));
    expect(a(0.3, 1.7, 4.2)).not.toBe(c(0.3, 1.7, 4.2));
  });

  it('stays within -1..1 and is smooth: a small step moves it a little', () => {
    const noise = createThreadNoise();
    let worst = 0;
    for (let n = 0; n < 2000; n++) {
      const x = n * 0.137;
      const value = noise(x, 2.3, 0.7);
      expect(Math.abs(value)).toBeLessThanOrEqual(1);
      worst = Math.max(worst, Math.abs(noise(x + 0.01, 2.3, 0.7) - value));
    }
    expect(worst).toBeLessThan(0.05);
  });
});

describe('threadLayout', () => {
  it('lays the threads from the start edge to the far one, gathered at the start and fanned at the end', () => {
    const { count, points, x, y } = threadLayout(1440, 800, 24);

    expect(count).toBe(24);
    expect(points).toBe(threadPoints(1440));
    expect(x[0]).toBe(0);
    expect(x[points - 1]).toBe(1440);
    for (let k = 1; k < points; k++) expect(x[k]).toBeGreaterThan(x[k - 1]);
    expect(y).toHaveLength(24 * points);

    const start = span(y, points, 0, count);
    const end = span(y, points, points - 1, count);
    expect(start).toBeLessThanOrEqual(threadSpread(0, 800));
    expect(start).toBeLessThan(0.07 * 800);
    expect(end).toBeGreaterThan(800);
    // The fan opens late: halfway along it is still well under half open.
    expect(span(y, points, Math.floor(points / 2), count)).toBeLessThan(end / 2);
  });

  it('keeps the threads in order, so none crosses another at rest', () => {
    const { count, points, y } = threadLayout(1200, 600, 28);

    for (let k = 0; k < points; k++) {
      for (let i = 1; i < count; i++) expect(y[i * points + k]).toBeGreaterThan(y[(i - 1) * points + k]);
    }
  });

  it('is the same ribbon every time', () => {
    expect(threadLayout(900, 500, 20).y).toEqual(threadLayout(900, 500, 20).y);
  });

  it('tints a few threads, spaced out', () => {
    const { count, tinted } = threadLayout(900, 500, 24);

    const tints = Array.from(tinted).filter(Boolean).length;
    expect(tints).toBe(Math.ceil((count - 2) / TINT_EVERY));
    expect(tints).toBeLessThan(count / 4);
  });

  it('never gathers tighter than the floor on a short box and lays nothing in an empty one', () => {
    expect(threadSpread(0, 100)).toBe(GATHER_MIN);
    expect(threadLayout(0, 0, 24).count).toBe(0);
    expect(threadLayout(0, 0, 24).y).toHaveLength(0);
  });
});

describe('threadPoints', () => {
  it('puts a point every few dozen px, within bounds', () => {
    expect(threadPoints(1440)).toBe(21);
    expect(threadPoints(375)).toBe(POINTS_MIN);
    expect(threadPoints(4000)).toBe(POINTS_MAX);
  });
});

describe('threadSway', () => {
  const noise = createThreadNoise();

  it('is deterministic and bounded by the amplitude, small at the gathered end and wide at the frayed one', () => {
    expect(threadSway(noise, 300, 0.5, 3, 1200)).toBe(threadSway(noise, 300, 0.5, 3, 1200));

    let start = 0;
    let end = 0;
    for (let t = 0; t < 20_000; t += 97) {
      for (let x = 0; x < 1440; x += 61) {
        start = Math.max(start, Math.abs(threadSway(noise, x, 0, 5, t)));
        end = Math.max(end, Math.abs(threadSway(noise, x, 1, 5, t)));
      }
    }
    expect(start).toBeLessThanOrEqual(SWAY_MIN);
    expect(end).toBeLessThanOrEqual(SWAY_MAX);
    expect(end).toBeGreaterThan(SWAY_MAX / 2);
    expect(start).toBeLessThan(end / 4);
  });

  it('moves neighbours together but not in step, and drifts in time', () => {
    let near = 0;
    let far = 0;
    let differ = 0;
    for (let x = 0; x < 1440; x += 37) {
      const a = threadSway(noise, x, 1, 10, 5000);
      const b = threadSway(noise, x, 1, 11, 5000);
      const c = threadSway(noise, x, 1, 22, 5000);
      near += Math.abs(a - b);
      far += Math.abs(a - c);
      if (a !== b) differ++;
    }
    expect(near).toBeLessThan(far);
    expect(differ).toBeGreaterThan(30);
    expect(threadSway(noise, 300, 1, 10, 0)).not.toBe(threadSway(noise, 300, 1, 10, 3000));
  });
});

describe('threadPull', () => {
  const out = new Float32Array(2);
  const pull = (dx: number, dy: number, reach = 180, strength = 1): [number, number] => {
    threadPull(dx, dy, reach, strength, out);
    return [out[0], out[1]];
  };

  it('draws a point toward the pointer, with a smooth falloff to nothing at the reach', () => {
    const [x, y] = pull(90, 0);
    expect(x).toBeLessThan(0);
    expect(y).toBeCloseTo(0, 10);
    // A quarter of the full pull halfway out.
    expect(-x).toBeCloseTo(PULL / 4, 5);

    expect(pull(180, 0)).toEqual([0, 0]);
    expect(pull(400, 0)).toEqual([0, 0]);
    expect(Math.abs(pull(179, 0)[0])).toBeLessThan(0.01);

    // Past about 38px the curve is under the half-distance cap and falls from there.
    let previous = Infinity;
    for (let d = 40; d < 180; d += 10) {
      const magnitude = -pull(d, 0)[0];
      expect(magnitude).toBeLessThan(previous);
      previous = magnitude;
    }
  });

  it('never closes more than half the distance, so a point leans in rather than snapping onto the pointer', () => {
    const [x] = pull(4, 0);
    expect(-x).toBeCloseTo(4 * PULL_CLOSE, 5);

    const [dx, dy] = pull(3, 4);
    expect(Math.hypot(dx, dy)).toBeCloseTo(5 * PULL_CLOSE, 5);
    expect(dx / dy).toBeCloseTo(3 / 4, 5);
  });

  it('scales with the strength and is nothing at zero strength or at the pointer itself', () => {
    expect(pull(90, 0, 180, 0.5)[0]).toBeCloseTo(pull(90, 0)[0] / 2, 5);
    expect(pull(90, 0, 180, 0)).toEqual([0, 0]);
    expect(pull(0, 0)).toEqual([0, 0]);
  });
});

describe('threadApproach', () => {
  it('eases toward the target without overshooting, slower out than in', () => {
    let value = 0;
    const path: number[] = [];
    for (let n = 0; n < 120; n++) {
      value = threadApproach(value, 1, THREAD_LINES_PULL_IN, 1);
      path.push(value);
    }
    expect(path.every((v, i) => v <= 1 && (i === 0 || v > path[i - 1]))).toBe(true);
    expect(path[29]).toBeGreaterThan(0.9);
    expect(path[119]).toBeGreaterThan(0.999);

    let waning = 1;
    for (let n = 0; n < 30; n++) waning = threadApproach(waning, 0, THREAD_LINES_PULL_OUT, 1);
    expect(waning).toBeGreaterThan(1 - path[29]);
    expect(waning).toBeLessThan(0.35);
  });

  it('takes the same path on a slow screen: two 60Hz frames equal one frame of double length', () => {
    const two = threadApproach(threadApproach(0, 1, 0.08, 1), 1, 0.08, 1);
    expect(threadApproach(0, 1, 0.08, 2)).toBeCloseTo(two, 10);
    expect(threadApproach(3, 10, 0.08, 0)).toBe(3);
  });
});

describe('WrThreadLines', () => {
  let ctx: FakeContext;
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  let frames: FrameRequestCallback[];
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;
  let thrown: unknown[];

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
    fixture.nativeElement.querySelector<HTMLElement>('wr-thread-lines')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.wr-thread-lines__canvas')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    const pending = frames;
    frames = [];
    pending.forEach(frame => frame(now));
  };

  /** Lays the ribbon out as the browser would: the size notification, then its frame, which is then forgotten. */
  const layout = (width: number, height: number): void => {
    StubResizeObserver.instances[0].fire(width, height);
    tick(0);
    raf.mockClear();
  };

  const inView = (): void => StubIntersectionObserver.instances[0].fire(true);

  /** Fires `n` frames one `FRAME_MS` apart from `from` and returns how many the component asked for. */
  const run = (n: number, from = 0): number => {
    const before = raf.mock.calls.length;
    for (let i = 1; i <= n; i++) tick(from + i * THREAD_LINES_FRAME_MS);
    return raf.mock.calls.length - before;
  };

  /** The y of the first thread's first point in the last frame drawn. */
  const firstY = (): number => ctx.moveTo.mock.calls[ctx.moveTo.mock.calls.length - 24][1] as number;

  beforeEach(() => {
    thrown = [];
    ctx = fakeContext();
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
    frames = [];
    raf = vi.fn((frame: FrameRequestCallback) => frames.push(frame));
    caf = vi.fn();
    StubResizeObserver.instances = [];
    StubIntersectionObserver.instances = [];
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
    // The loop stamps its start with the clock and measures the frames it is handed against it.
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    expect(thrown).toEqual([]);
  });

  it('renders the empty canvas on the server, absolutely positioned by the sheet, and draws nothing', async () => {
    const fixture = await render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(canvas(fixture)).not.toBeNull();
    expect(canvas(fixture).getAttribute('width')).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });

  it('is decorative: hidden from assistive tech, no text, nothing focusable', async () => {
    const fixture = await render();
    const el = host(fixture);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('Opt-in');
  });

  it('takes a 2D context in the browser and watches the host for size and view', async () => {
    const fixture = await render();

    expect(getContext).toHaveBeenCalledWith('2d');
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
  });

  it('draws the ribbon once at layout: one curve per thread, in two strokes, hairline', async () => {
    const fixture = await render();

    layout(1440, 800);

    const { points } = threadLayout(1440, 800, 24);
    expect(canvas(fixture).width).toBe(1440);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalledTimes(24);
    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(24 * (points - 2));
    expect(ctx.lineTo).toHaveBeenCalledTimes(24);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    expect(ctx.lineWidth).toBe(1);
    // Every thread starts on the start edge and ends on the far one.
    expect(ctx.moveTo.mock.calls.every(call => call[0] === 0)).toBe(true);
    expect(ctx.lineTo.mock.calls.every(call => call[0] === 1440)).toBe(true);
    // Gathered: the starts sit in a narrow band; frayed: the ends span more than the height.
    const starts = ctx.moveTo.mock.calls.map(call => call[1] as number);
    const ends = ctx.lineTo.mock.calls.map(call => call[1] as number);
    expect(Math.max(...starts) - Math.min(...starts)).toBeLessThan(0.1 * 800);
    expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(800);
    // Not off screen yet: no loop.
    expect(raf).not.toHaveBeenCalled();
  });

  it('runs on its own once on screen, no faster than its frame floor, and keeps moving with no pointer', async () => {
    await render();
    layout(1440, 800);
    ctx.clearRect.mockClear();

    inView();
    expect(raf).toHaveBeenCalledTimes(1);

    // 60Hz frames: every other one is drawn.
    tick(16.7);
    expect(ctx.clearRect).not.toHaveBeenCalled();
    tick(33.4);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    const early = firstY();
    tick(50);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    tick(66.7);
    expect(ctx.clearRect).toHaveBeenCalledTimes(2);
    expect(raf).toHaveBeenCalledTimes(5);

    // Still asked for after a long run, and the sway has moved the threads.
    expect(run(60, 66.7)).toBe(60);
    expect(firstY()).not.toBe(early);
  });

  it('pulls the threads toward the mouse, waxing as it arrives, and lets them go after it leaves', async () => {
    const fixture = await render();
    layout(1440, 800);
    inView();
    run(3);
    const before = firstY();

    // Over the gathered end's first point: the first thread is pulled down toward it.
    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 0, clientY: 200 }));
    run(1, 3 * THREAD_LINES_FRAME_MS);
    const first = firstY() - before;
    run(20, 4 * THREAD_LINES_FRAME_MS);
    const later = firstY() - before;
    expect(first).toBeGreaterThan(0);
    expect(later).toBeGreaterThan(first);
    expect(later).toBeLessThan(PULL + SWAY_MIN * 2);

    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    run(120, 24 * THREAD_LINES_FRAME_MS);
    expect(Math.abs(firstY() - before)).toBeLessThan(SWAY_MIN * 2);
  });

  it('ignores a moving finger, so a touch scroll is never fought', async () => {
    const fixture = await render();
    layout(1440, 800);
    inView();
    run(3);
    const before = firstY();

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 0, clientY: 200, pointerType: 'touch' }));
    run(20, 3 * THREAD_LINES_FRAME_MS);

    expect(Math.abs(firstY() - before)).toBeLessThan(SWAY_MIN * 2);
  });

  it('does not run off screen, starts when scrolled into view, and pauses while the document is hidden', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(1440, 800);
    expect(raf).not.toHaveBeenCalled();

    inView();
    expect(raf).toHaveBeenCalledTimes(1);
    const first = raf.mock.results[0].value as number;

    // A signal change makes Angular's own scheduler race on a frame too, and
    // cancel it: only the loop's frame id says anything here.
    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(caf).toHaveBeenCalledWith(first);

    page.pageVisible.set(true);
    fixture.detectChanges();
    ctx.clearRect.mockClear();
    tick(THREAD_LINES_FRAME_MS);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    const second = raf.mock.results[raf.mock.results.length - 1].value as number;

    StubIntersectionObserver.instances[0].fire(false);
    expect(caf).toHaveBeenCalledWith(second);
  });

  it('draws the still ribbon and never moves under reduced motion', async () => {
    const fixture = await render([platform(stub(true))]);
    layout(1440, 800);
    inView();
    const drawn = ctx.clearRect.mock.calls.length;
    const still = firstY();

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 0, clientY: 320 }));
    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 330 }));

    expect(raf).not.toHaveBeenCalled();
    // The pointer alone draws nothing: a still frame, not a loop in disguise.
    expect(ctx.clearRect).toHaveBeenCalledTimes(drawn);
    expect(firstY()).toBe(still);
  });

  it('puts the ribbon to rest when motion is reduced mid-flight', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(1440, 800);
    inView();
    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 0, clientY: 320 }));
    run(10);
    const loop = raf.mock.results[raf.mock.results.length - 1].value as number;
    ctx.clearRect.mockClear();

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(caf).toHaveBeenCalledWith(loop);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
  });

  it('mirrors the ribbon under RTL, so it gathers at the inline start', async () => {
    const fixture = await render();
    layout(1440, 800);
    const ltrStarts = ctx.moveTo.mock.calls.map(call => call[1] as number);
    ctx.moveTo.mockClear();
    ctx.lineTo.mockClear();

    TestBed.inject(Directionality).valueSignal.set('rtl');
    fixture.detectChanges();

    expect(ctx.moveTo).toHaveBeenCalledTimes(24);
    expect(ctx.moveTo.mock.calls.every(call => call[0] === 1440)).toBe(true);
    expect(ctx.lineTo.mock.calls.every(call => call[0] === 0)).toBe(true);
    expect(ctx.moveTo.mock.calls.map(call => call[1] as number)).toEqual(ltrStarts);
  });

  it('draws nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render();

    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    expect(StubIntersectionObserver.instances).toHaveLength(0);
    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 10 }));
    expect(raf).not.toHaveBeenCalled();
    expect(ctx.clearRect).not.toHaveBeenCalled();
  });

  it('survives a browser that gives it no context', async () => {
    getContext.mockImplementation(() => null);
    const fixture = await render();

    expect(StubResizeObserver.instances).toHaveLength(0);
    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 10 }));
    expect(raf).not.toHaveBeenCalled();
  });

  it('releases the loop, the observers and the listeners on destroy', async () => {
    const fixture = await render();
    const target = wrap(fixture);
    const removed = vi.spyOn(target, 'removeEventListener');
    layout(1440, 800);
    inView();
    expect(raf).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(caf).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('pointerleave', expect.any(Function));

    // A frame that was already queued does nothing once destroyed.
    ctx.clearRect.mockClear();
    tick(100);
    expect(ctx.clearRect).not.toHaveBeenCalled();
  });
});
