import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DOT_GRID_LEVELS,
  DOT_GRID_MAX_DPR,
  DOT_GRID_MAX_PIXELS,
  DotGrid,
  dotGridLayout,
  dotGridSpringStep,
} from './dot-grid';

@Component({
  imports: [DotGrid],
  template: `<section class="wrap">
    <ngwr-dot-grid />
    <p>Components</p>
  </section>`,
})
class Host {}

interface FakeContext {
  readonly setTransform: ReturnType<typeof vi.fn>;
  readonly clearRect: ReturnType<typeof vi.fn>;
  readonly beginPath: ReturnType<typeof vi.fn>;
  readonly moveTo: ReturnType<typeof vi.fn>;
  readonly arc: ReturnType<typeof vi.fn>;
  readonly fill: ReturnType<typeof vi.fn>;
}

/** jsdom has no 2D context; this one records what gets drawn. */
const fakeContext = (): FakeContext => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
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

describe('dotGridLayout', () => {
  it('lays a centred grid, one dot per spacing each way', () => {
    const { cols, rows, x, y } = dotGridLayout(100, 60, 20);

    expect(cols).toBe(6);
    expect(rows).toBe(4);
    expect(x).toHaveLength(24);
    // 6 columns span 100px exactly: the first sits on the edge.
    expect(x[0]).toBe(0);
    expect(x[rows]).toBe(20);
    // 4 rows span 60px: centred, the first is on the edge too.
    expect(y[0]).toBe(0);
    expect(y[1]).toBe(20);
    expect(y[3]).toBe(60);
  });

  it('centres a grid that does not divide the box', () => {
    const { cols, rows, x, y } = dotGridLayout(110, 50, 20);

    expect(cols).toBe(6);
    expect(rows).toBe(3);
    expect(x[0]).toBe(5);
    expect(x[(cols - 1) * rows]).toBe(105);
    expect(y[0]).toBe(5);
    expect(y[rows - 1]).toBe(45);
  });

  it('is a few thousand dots at most on a laptop screen', () => {
    const { cols, rows } = dotGridLayout(1440, 900, 26);

    expect(cols).toBe(56);
    expect(rows).toBe(35);
    expect(cols * rows).toBe(1960);
  });

  it('refuses a spacing under 8px and an empty box', () => {
    expect(dotGridLayout(80, 80, 1).cols).toBe(11);
    expect(dotGridLayout(0, 0, 26).x).toHaveLength(0);
  });
});

describe('dotGridSpringStep', () => {
  const run = (
    target: number,
    from: number,
    frames: number
  ): { peak: number; off: Float32Array; vel: Float32Array } => {
    const off = Float32Array.of(from);
    const vel = Float32Array.of(0);
    let peak = from;
    for (let n = 0; n < frames; n++) {
      dotGridSpringStep(off, vel, 0, target, 1);
      if (Math.abs(off[0] - from) > Math.abs(peak - from)) peak = off[0];
    }
    return { peak, off, vel };
  };

  it('reaches a pushed target and overshoots it by a fifth at most', () => {
    const { peak, off, vel } = run(10, 0, 60);

    expect(peak).toBeGreaterThan(10);
    expect(peak).toBeLessThan(12);
    expect(Math.abs(off[0] - 10)).toBeLessThan(0.05);
    expect(Math.abs(vel[0])).toBeLessThan(0.05);
  });

  it('returns a released dot to rest within a second, never swinging past a fifth of the push', () => {
    const { peak, off, vel } = run(0, 10, 60);

    expect(peak).toBeLessThan(0);
    expect(peak).toBeGreaterThan(-2);
    expect(Math.abs(off[0])).toBeLessThan(0.02);
    expect(Math.abs(vel[0])).toBeLessThan(0.02);
  });

  it('takes a longer step on a slow frame and none on a zero frame', () => {
    const slow = Float32Array.of(0);
    const slowVel = Float32Array.of(0);
    dotGridSpringStep(slow, slowVel, 0, 10, 2);
    const fast = Float32Array.of(0);
    const fastVel = Float32Array.of(0);
    dotGridSpringStep(fast, fastVel, 0, 10, 1);
    const none = Float32Array.of(3);
    const noneVel = Float32Array.of(0);
    dotGridSpringStep(none, noneVel, 0, 10, 0);

    expect(slow[0]).toBeGreaterThan(fast[0]);
    expect(none[0]).toBe(3);
  });
});

describe('DotGrid', () => {
  let ctx: FakeContext;
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  let frames: FrameRequestCallback[];
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;
  let thrown: unknown[];
  let dpr: PropertyDescriptor | undefined;

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
    fixture.nativeElement.querySelector<HTMLElement>('ngwr-dot-grid')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.ngwr-dot-grid__canvas')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    const pending = frames;
    frames = [];
    pending.forEach(frame => frame(now));
  };

  /** Lays the field out as the browser would: the size notification, then its frame, which is then forgotten. */
  const layout = (width: number, height: number): void => {
    StubResizeObserver.instances[0].fire(width, height);
    tick(0);
    raf.mockClear();
  };

  const inView = (): void => StubIntersectionObserver.instances[0].fire(true);

  /** Fires `n` frames 16ms apart and returns how many the component asked for. */
  const settle = (n: number): number => {
    const before = raf.mock.calls.length;
    for (let i = 1; i <= n; i++) tick(i * 16);
    return raf.mock.calls.length - before;
  };

  const dots = (): number => ctx.arc.mock.calls.length;

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
    dpr = Object.getOwnPropertyDescriptor(document.defaultView!, 'devicePixelRatio');
  });

  afterEach(() => {
    if (dpr) Object.defineProperty(document.defaultView!, 'devicePixelRatio', dpr);
    else Reflect.deleteProperty(document.defaultView!, 'devicePixelRatio');
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
    expect(el.nextElementSibling?.textContent).toBe('Components');
  });

  it('takes a 2D context in the browser and watches the host for size and view', async () => {
    const fixture = await render();

    expect(getContext).toHaveBeenCalledWith('2d');
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
  });

  it('sizes the canvas to the section at the device ratio, capped at two', async () => {
    Object.defineProperty(document.defaultView!, 'devicePixelRatio', { value: 3, configurable: true });
    const fixture = await render();

    layout(800, 400);

    expect(canvas(fixture).width).toBe(800 * DOT_GRID_MAX_DPR);
    expect(canvas(fixture).height).toBe(400 * DOT_GRID_MAX_DPR);
    expect(ctx.setTransform).toHaveBeenCalledWith(DOT_GRID_MAX_DPR, 0, 0, DOT_GRID_MAX_DPR, 0, 0);
  });

  it('lowers the ratio for a tall section so the canvas stays within its pixel budget, never below one', async () => {
    Object.defineProperty(document.defaultView!, 'devicePixelRatio', { value: 2, configurable: true });
    const fixture = await render();

    layout(375, 4500);
    const { width, height } = canvas(fixture);
    expect(width * height).toBeLessThanOrEqual(DOT_GRID_MAX_PIXELS * 1.01);
    expect(width).toBeGreaterThanOrEqual(375);

    layout(100, 100_000);
    expect(canvas(fixture).width).toBe(100);
    expect(canvas(fixture).height).toBe(100_000);
  });

  it('draws the still field once, one dot per 26px each way, and does not start the loop', async () => {
    await render();

    layout(260, 130);
    inView();

    const { cols, rows } = dotGridLayout(260, 130, 26);
    expect(dots()).toBe(cols * rows);
    // All at rest: one path, one fill.
    expect(ctx.fill).toHaveBeenCalledTimes(1);
    expect(raf).not.toHaveBeenCalled();
  });

  it('folds a burst of size changes into one layout on the next frame', async () => {
    const fixture = await render();

    StubResizeObserver.instances[0].fire(200, 100);
    StubResizeObserver.instances[0].fire(400, 100);
    StubResizeObserver.instances[0].fire(520, 260);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(ctx.setTransform).not.toHaveBeenCalled();

    tick(0);

    expect(ctx.setTransform).toHaveBeenCalledTimes(1);

    expect(canvas(fixture).width).toBe(520);
    const { cols, rows } = dotGridLayout(520, 260, 26);
    expect(dots()).toBe(cols * rows);
  });

  it('runs while the mouse is over the section and uses more than one fill while dots are lit', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();
    ctx.fill.mockClear();

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    expect(raf).toHaveBeenCalledTimes(1);

    const asked = settle(10);
    expect(asked).toBe(10);
    expect(ctx.fill.mock.calls.length).toBeGreaterThan(10);
    expect(ctx.fill.mock.calls.length).toBeLessThanOrEqual(10 * DOT_GRID_LEVELS);
  });

  it('keeps running after the pointer leaves until every dot has settled, then stops on its own', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    settle(5);
    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));

    // Two seconds of frames: the loop gives up long before that.
    const asked = settle(120);
    expect(asked).toBeGreaterThan(5);
    expect(asked).toBeLessThan(120);
    expect(frames).toHaveLength(0);
    expect(caf).not.toHaveBeenCalled();
  });

  it('does not run off screen, starts when scrolled into view, and pauses while the document is hidden', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(400, 300);

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
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
    ctx.fill.mockClear();
    tick(16);
    expect(ctx.fill).toHaveBeenCalled();
    const second = raf.mock.results[raf.mock.results.length - 1].value as number;

    StubIntersectionObserver.instances[0].fire(false);
    expect(caf).toHaveBeenCalledWith(second);
  });

  it('ignores a moving finger, so a touch scroll is never fought', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150, pointerType: 'touch' }));

    expect(raf).not.toHaveBeenCalled();
  });

  it('sends one ring out from a tap and comes to rest again', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    wrap(fixture).dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 150, pointerType: 'touch' }));
    expect(raf).toHaveBeenCalledTimes(1);

    const asked = settle(120);
    expect(asked).toBeGreaterThan(30);
    expect(asked).toBeLessThan(120);
    expect(frames).toHaveLength(0);
  });

  it('does not ring on a mouse press', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    wrap(fixture).dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 150 }));

    expect(raf).not.toHaveBeenCalled();
  });

  it('draws the still field and never moves under reduced motion', async () => {
    const fixture = await render([platform(stub(true))]);
    layout(400, 300);
    inView();
    expect(ctx.fill).toHaveBeenCalledTimes(1);

    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    wrap(fixture).dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 150, pointerType: 'touch' }));

    expect(raf).not.toHaveBeenCalled();
  });

  it('puts the field back to rest when motion is reduced mid-flight', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(400, 300);
    inView();
    wrap(fixture).dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    settle(5);
    ctx.fill.mockClear();
    const loop = raf.mock.results[raf.mock.results.length - 1].value as number;

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(caf).toHaveBeenCalledWith(loop);
    // The still field, drawn once: a single fill.
    expect(ctx.fill).toHaveBeenCalledTimes(1);
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
    layout(400, 300);
    inView();
    target.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 150 }));
    expect(raf).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(caf).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('pointerleave', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('pointerdown', expect.any(Function));

    // A frame that was already queued does nothing once destroyed.
    ctx.fill.mockClear();
    tick(100);
    expect(ctx.fill).not.toHaveBeenCalled();
  });
});
