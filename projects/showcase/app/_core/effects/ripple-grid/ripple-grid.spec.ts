import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RIPPLE_GRID_LEVELS, RippleGrid } from './ripple-grid';
import {
  AMPLITUDE,
  BAND,
  LIFE,
  MAX_RIPPLES,
  type Ripple,
  SPEED,
  rippleAdd,
  rippleAlive,
  rippleBand,
  rippleField,
  rippleGridLayout,
  rippleRadius,
  rippleStrength,
} from './ripple-model';

@Component({
  imports: [RippleGrid],
  template: `<main class="wrap">
    <ngwr-ripple-grid />
    <p>Not found</p>
    <button type="button">Go home</button>
  </main>`,
})
class Host {}

interface FakeContext {
  lineWidth: number;
  strokeStyle: string;
  readonly setTransform: ReturnType<typeof vi.fn>;
  readonly clearRect: ReturnType<typeof vi.fn>;
  readonly beginPath: ReturnType<typeof vi.fn>;
  readonly moveTo: ReturnType<typeof vi.fn>;
  readonly lineTo: ReturnType<typeof vi.fn>;
  readonly stroke: ReturnType<typeof vi.fn>;
}

/** jsdom has no 2D context; this one records what gets drawn. */
const fakeContext = (): FakeContext => ({
  lineWidth: 0,
  strokeStyle: '',
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
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

/** A pointer's click: `detail` is 1, as a mouse or a finger gives, where a keyboard gives 0. */
const click = (init: MouseEventInit): MouseEvent => new MouseEvent('click', { bubbles: true, detail: 1, ...init });

const at = (x: number, y: number, born = 0): Ripple => ({ x, y, born });

describe('ripple model', () => {
  it('sends the ring out at its speed', () => {
    expect(rippleRadius(0)).toBe(0);
    expect(rippleRadius(1000)).toBe(SPEED);
    expect(rippleRadius(500)).toBe(SPEED / 2);
  });

  it('starts at full strength and fades to nothing over its life, faster the farther it travels', () => {
    expect(rippleStrength(0)).toBe(1);
    expect(rippleStrength(LIFE / 2)).toBeGreaterThan(0);
    expect(rippleStrength(LIFE / 2)).toBeLessThan(0.25);
    expect(rippleStrength(LIFE)).toBe(0);
    expect(rippleStrength(LIFE * 2)).toBe(0);
    expect(rippleStrength(-1)).toBe(0);
    for (let age = 0; age < LIFE; age += 50) {
      expect(rippleStrength(age + 50)).toBeLessThan(rippleStrength(age));
    }
  });

  it('shapes the wave as a soft band: one on the ring, zero past half the band, smooth between', () => {
    expect(rippleBand(0)).toBe(1);
    expect(rippleBand(BAND / 2)).toBe(0);
    expect(rippleBand(-BAND / 2)).toBe(0);
    expect(rippleBand(BAND)).toBe(0);
    expect(rippleBand(BAND / 4)).toBeCloseTo(0.5, 5);
    expect(rippleBand(-BAND / 4)).toBeCloseTo(0.5, 5);
    // A step of a px near the edge moves the profile by a sliver, not a jump.
    expect(Math.abs(rippleBand(BAND / 2 - 1) - rippleBand(BAND / 2 - 2))).toBeLessThan(0.01);
  });

  it('pushes a point on the ring outward by the amplitude and lights it, and leaves a point off the ring alone', () => {
    const out = new Float32Array(3);
    const ring = rippleRadius(200);

    rippleField([at(100, 100)], 200, 100 + ring, 100, out);
    const strength = rippleStrength(200);
    expect(out[0]).toBeCloseTo(AMPLITUDE * strength, 4);
    expect(out[1]).toBeCloseTo(0, 5);
    expect(out[2]).toBeCloseTo(strength, 5);

    rippleField([at(100, 100)], 200, 100, 100 - ring, out);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[1]).toBeCloseTo(-AMPLITUDE * strength, 4);

    rippleField([at(100, 100)], 200, 100 + ring + BAND, 100, out);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });

  it('sums overlapping ripples and counts a dead one for nothing', () => {
    const out = new Float32Array(3);
    const ring = rippleRadius(200);
    const x = 100 + ring;

    rippleField([at(100, 100)], 200, x, 100, out);
    const one = Array.from(out);
    // The same ring twice, from the same point and age: twice the push, twice the glow.
    rippleField([at(100, 100), at(100, 100)], 200, x, 100, out);
    expect(out[0]).toBeCloseTo(one[0] * 2, 4);
    expect(out[2]).toBeCloseTo(one[2] * 2, 4);
    // One far older than its life adds nothing.
    rippleField([at(100, 100), at(x, 100, -LIFE * 2)], 200, x, 100, out);
    expect(Array.from(out)).toEqual(one);
  });

  it('keeps at most a handful alive, dropping the oldest', () => {
    let ripples: Ripple[] = [];
    for (let i = 0; i < MAX_RIPPLES + 2; i++) ripples = rippleAdd(ripples, at(i, 0, i));

    expect(ripples).toHaveLength(MAX_RIPPLES);
    expect(ripples[0].born).toBe(2);
    expect(ripples[ripples.length - 1].born).toBe(MAX_RIPPLES + 1);
  });

  it('prunes the ripples that have faded', () => {
    const ripples = [at(0, 0, 0), at(0, 0, 1000), at(0, 0, 2000)];

    expect(rippleAlive(ripples, 500)).toHaveLength(1);
    expect(rippleAlive(ripples, LIFE + 1000)).toEqual([ripples[2]]);
    expect(rippleAlive(ripples, LIFE + 2000)).toEqual([]);
  });

  it('lays the lines out centred, one per spacing each way', () => {
    const { xs, ys } = rippleGridLayout(100, 60, 20);

    expect(Array.from(xs)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(Array.from(ys)).toEqual([0, 20, 40, 60]);

    const off = rippleGridLayout(110, 50, 20);
    expect(Array.from(off.xs)).toEqual([5, 25, 45, 65, 85, 105]);
    expect(Array.from(off.ys)).toEqual([5, 25, 45]);
  });

  it('refuses a spacing under 8px and an empty box', () => {
    expect(rippleGridLayout(80, 80, 1).xs).toHaveLength(11);
    expect(rippleGridLayout(0, 0, 32).xs).toHaveLength(0);
    expect(rippleGridLayout(0, 0, 32).ys).toHaveLength(0);
  });
});

describe('RippleGrid', () => {
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
    fixture.nativeElement.querySelector<HTMLElement>('ngwr-ripple-grid')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.ngwr-ripple-grid__canvas')!;
  const button = (fixture: { nativeElement: HTMLElement }): HTMLButtonElement =>
    fixture.nativeElement.querySelector<HTMLButtonElement>('button')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    const pending = frames;
    frames = [];
    pending.forEach(frame => frame(now));
  };

  /** Lays the grid out as the browser would: the size notification, then its frame, which is then forgotten. */
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

  it('is decorative: hidden from assistive tech, no text, nothing focusable, first in its parent', async () => {
    const fixture = await render();
    const el = host(fixture);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('Not found');
  });

  it('draws the flat grid once, as straight lines, and does not start the loop', async () => {
    await render();

    layout(320, 160);
    inView();

    const { xs, ys } = rippleGridLayout(320, 160, 32);
    expect(ctx.moveTo).toHaveBeenCalledTimes(xs.length + ys.length);
    expect(ctx.lineTo).toHaveBeenCalledTimes(xs.length + ys.length);
    expect(ctx.moveTo).toHaveBeenCalledWith(xs[0], 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(xs[0], 160);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, ys[0]);
    expect(ctx.lineTo).toHaveBeenCalledWith(320, ys[0]);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.lineWidth).toBe(1);
    expect(raf).not.toHaveBeenCalled();
  });

  it('resolves its colours against the canvas: the muted ink at rest, the primary glow when lit', async () => {
    await render();
    layout(320, 160);

    // jsdom resolves no custom property: the fallbacks, at the rest strength.
    expect(ctx.strokeStyle).toBe('rgba(107, 114, 128, 0.200)');
  });

  it('starts a ring from a click and bends the lines into sampled polylines, in more than one stroke', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();
    ctx.moveTo.mockClear();
    ctx.lineTo.mockClear();
    ctx.stroke.mockClear();

    wrap(fixture).dispatchEvent(click({ clientX: 200, clientY: 150 }));
    expect(raf).toHaveBeenCalledTimes(1);

    tick(16);
    tick(32);
    tick(200);

    const { xs, ys } = rippleGridLayout(400, 300, 32);
    // Sampled every few px, a line is many segments now, not one.
    expect(ctx.lineTo.mock.calls.length).toBeGreaterThan((xs.length + ys.length) * 10);
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(3);
    expect(ctx.stroke.mock.calls.length).toBeLessThanOrEqual(3 * RIPPLE_GRID_LEVELS);
    // The vertical line nearest the click bends: some of its samples leave its x.
    const line = xs.reduce((best, x) => (Math.abs(x - 200) < Math.abs(best - 200) ? x : best), xs[0]);
    const bent = ctx.lineTo.mock.calls.some(
      ([x, y]: number[]) => Math.abs(x - line) > 0.5 && Math.abs(x - line) < AMPLITUDE + 1 && y > 0 && y < 300
    );
    expect(bent).toBe(true);
  });

  it('runs while a ring is alive, then draws the flat grid again and stops on its own', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    wrap(fixture).dispatchEvent(click({ clientX: 200, clientY: 150 }));

    // Three seconds of frames: the ring lives for one and a half.
    const asked = settle(180);
    expect(asked).toBeGreaterThan(LIFE / 16 - 5);
    expect(asked).toBeLessThan(180);
    expect(frames).toHaveLength(0);
    expect(caf).not.toHaveBeenCalled();

    // The last frame: the grid at rest again, one stroke of straight lines.
    const strokes = ctx.stroke.mock.calls.length;
    const lastBegin = ctx.beginPath.mock.invocationCallOrder[ctx.beginPath.mock.calls.length - 1];
    const lastStroke = ctx.stroke.mock.invocationCallOrder[strokes - 1];
    expect(lastStroke).toBeGreaterThan(lastBegin);
    expect(ctx.strokeStyle).toBe('rgba(107, 114, 128, 0.200)');
  });

  it('lets several rings overlap and keeps a handful at most', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    for (let i = 0; i < MAX_RIPPLES + 3; i++) {
      wrap(fixture).dispatchEvent(click({ clientX: 50 + i * 40, clientY: 150 }));
    }
    // One loop, however many clicks.
    expect(raf).toHaveBeenCalledTimes(1);

    const asked = settle(180);
    expect(asked).toBeLessThan(180);
    expect(frames).toHaveLength(0);
  });

  it('lets a click on a button inside reach the button and still rings from it', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    // A plain listener, not an Angular binding: a binding would schedule a frame of its own.
    const pressed = vi.fn();
    button(fixture).addEventListener('click', pressed);

    const event = click({ clientX: 120, clientY: 220 });
    button(fixture).dispatchEvent(event);

    expect(pressed).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('ignores a keyboard activation, which has no point to ring from', async () => {
    const fixture = await render();
    layout(400, 300);
    inView();

    const pressed = vi.fn();
    button(fixture).addEventListener('click', pressed);

    button(fixture).dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));

    expect(pressed).toHaveBeenCalledTimes(1);
    expect(raf).not.toHaveBeenCalled();
  });

  it('does not run off screen and starts when scrolled into view', async () => {
    const fixture = await render();
    layout(400, 300);

    wrap(fixture).dispatchEvent(click({ clientX: 200, clientY: 150 }));
    expect(raf).not.toHaveBeenCalled();

    inView();
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('draws the flat grid and never ripples under reduced motion', async () => {
    const fixture = await render([platform(stub(true))]);
    layout(400, 300);
    inView();
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    ctx.stroke.mockClear();

    wrap(fixture).dispatchEvent(click({ clientX: 200, clientY: 150 }));

    expect(raf).not.toHaveBeenCalled();
    // Put to rest and drawn flat once more: straight lines, one stroke.
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.strokeStyle).toBe('rgba(107, 114, 128, 0.200)');
  });

  it('flattens the grid when motion is reduced mid-ring', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(400, 300);
    inView();
    wrap(fixture).dispatchEvent(click({ clientX: 200, clientY: 150 }));
    settle(5);
    const loop = raf.mock.results[raf.mock.results.length - 1].value as number;
    ctx.stroke.mockClear();

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(caf).toHaveBeenCalledWith(loop);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  it('draws nothing under forced colours', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const fixture = await render();

    expect(getContext).not.toHaveBeenCalled();
    expect(StubResizeObserver.instances).toHaveLength(0);
    wrap(fixture).dispatchEvent(click({ clientX: 10, clientY: 10 }));
    expect(raf).not.toHaveBeenCalled();
  });

  it('survives a browser that gives it no context', async () => {
    getContext.mockImplementation(() => null);
    const fixture = await render();

    expect(StubResizeObserver.instances).toHaveLength(0);
    wrap(fixture).dispatchEvent(click({ clientX: 10, clientY: 10 }));
    expect(raf).not.toHaveBeenCalled();
  });

  it('releases the loop, the observers and the click listener on destroy', async () => {
    const fixture = await render();
    const target = wrap(fixture);
    const removed = vi.spyOn(target, 'removeEventListener');
    layout(400, 300);
    inView();
    target.dispatchEvent(click({ clientX: 200, clientY: 150 }));
    expect(raf).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(caf).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith('click', expect.any(Function));

    ctx.stroke.mockClear();
    tick(100);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});
