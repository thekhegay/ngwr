import { Component, ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FluidCursor } from './fluid-cursor';
import {
  CAP,
  CURL,
  DRAG,
  EMIT_GAP,
  EMIT_MAX,
  FADE_IN,
  LIFE_MAX,
  LIFE_MIN,
  RADIUS,
  RADIUS_END,
  SPEED_MAX,
  TINTS,
  TINT_CYCLE,
  createFluidNoise,
  fluidAdvance,
  fluidAlpha,
  fluidBlend,
  fluidClear,
  fluidCurl,
  fluidEmit,
  fluidLive,
  fluidPool,
  fluidRadius,
  fluidStep,
  fluidTint,
  fluidVelocity,
} from './fluid-model';

@Component({
  imports: [FluidCursor],
  template: `<footer class="wrap">
    <ngwr-fluid-cursor />
    <p>ngwr</p>
  </footer>`,
})
class Host {}

interface FakeContext {
  readonly setTransform: ReturnType<typeof vi.fn>;
  readonly clearRect: ReturnType<typeof vi.fn>;
  readonly drawImage: ReturnType<typeof vi.fn>;
  readonly createRadialGradient: ReturnType<typeof vi.fn>;
  readonly fillRect: ReturnType<typeof vi.fn>;
  fillStyle: unknown;
  globalAlpha: number;
  globalCompositeOperation: string;
}

/** jsdom has no 2D context; this one records what gets drawn, for the sprites and the canvas alike. */
const fakeContext = (): FakeContext => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillRect: vi.fn(),
  fillStyle: '',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
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

/** A pool with no jitter: every random read is the middle of its range. */
const stillPool = (cap = CAP): ReturnType<typeof fluidPool> => fluidPool(cap, () => 0.5);

const liveSlots = (pool: ReturnType<typeof fluidPool>): number[] =>
  Array.from({ length: pool.cap }, (_, i) => i).filter(i => fluidLive(pool, i));

describe('fluidEmit', () => {
  it('lays one particle per gap along a stroke, from its start to its end', () => {
    const pool = stillPool();

    const n = fluidEmit(pool, 0, 50, 150, 50, 0, 0);

    expect(n).toBe(150 / EMIT_GAP + 1);
    const xs = liveSlots(pool).map(i => pool.x[i]);
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBe(150);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(EMIT_GAP, 5);
    expect(pool.alive).toBe(n);
  });

  it('carries the remainder across moves, so a stroke in short steps is one even run', () => {
    const pool = stillPool();

    fluidEmit(pool, 0, 0, 12, 0, 0, 0);
    fluidEmit(pool, 12, 0, 24, 0, 0, 0);
    fluidEmit(pool, 24, 0, 36, 0, 0, 0);

    const xs = liveSlots(pool)
      .map(i => pool.x[i])
      .sort((a, b) => a - b);
    expect(xs).toEqual([0, 5, 10, 15, 20, 25, 30, 35]);
  });

  it('spreads a long jump over its whole length, never more than the cap per move', () => {
    const pool = stillPool();

    const n = fluidEmit(pool, 0, 0, 1000, 0, 0, 0);

    expect(n).toBe(EMIT_MAX);
    const xs = liveSlots(pool).map(i => pool.x[i]);
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBeGreaterThan(900);
    expect(xs[1] - xs[0]).toBeCloseTo(1000 / EMIT_MAX, 5);
  });

  it('emits one at the start of a stroke, where the pointer has not moved yet', () => {
    const pool = stillPool();

    expect(fluidEmit(pool, 40, 40, 40, 40, 0, 0)).toBe(1);
    expect(pool.x[0]).toBe(40);
    expect(pool.y[0]).toBe(40);
  });

  it('gives a particle some of the pointer speed, a life in range and a colour', () => {
    const pool = stillPool();

    fluidEmit(pool, 0, 0, 0, 0, 1, -0.5);

    expect(pool.vx[0]).toBeCloseTo(0.35, 5);
    expect(pool.vy[0]).toBeCloseTo(-0.175, 5);
    expect(pool.life[0]).toBeGreaterThanOrEqual(LIFE_MIN);
    expect(pool.life[0]).toBeLessThanOrEqual(LIFE_MAX);
    expect(pool.size[0]).toBe(1);
    expect(pool.tint[0]).toBe(0);
  });

  it('never holds more than the cap: a new particle takes the oldest slot', () => {
    const pool = stillPool(16);

    for (let k = 0; k < 5; k++) fluidEmit(pool, 0, k * 10, 1000, k * 10, 0, 0);

    expect(pool.alive).toBe(16);
    expect(liveSlots(pool)).toHaveLength(16);
    // Five jumps of 40 each wrapped the ring; every slot left holds the last jump.
    expect(Array.from(pool.y.subarray(0, 16)).every(y => y === 40)).toBe(true);
  });
});

describe('fluidVelocity', () => {
  const out = new Float32Array(2);

  it('reads the pointer speed in px per ms', () => {
    fluidVelocity(40, -20, 20, out);

    expect(out[0]).toBeCloseTo(2, 5);
    expect(out[1]).toBeCloseTo(-1, 5);
  });

  it('clamps a jump and treats a move with no time as a slow one', () => {
    fluidVelocity(300, 400, 1, out);
    expect(Math.hypot(out[0], out[1])).toBeCloseTo(SPEED_MAX, 5);
    expect(out[0] / out[1]).toBeCloseTo(0.75, 5);

    fluidVelocity(8, 0, 0, out);
    expect(out[0]).toBe(1);
  });
});

describe('fluidTint', () => {
  it('runs from the first colour to the last and back over one cycle', () => {
    expect(fluidTint(0)).toBe(0);
    expect(fluidTint(TINT_CYCLE / 2)).toBe(TINTS - 1);
    expect(fluidTint(TINT_CYCLE)).toBe(0);
    expect(fluidTint(TINT_CYCLE / 4)).toBe(Math.round((TINTS - 1) / 2));
  });
});

describe('fluidStep', () => {
  const noise = createFluidNoise();
  const flow = new Float32Array(2);

  const one = (vx: number, vy: number): ReturnType<typeof fluidPool> => {
    const pool = stillPool(1);
    fluidEmit(pool, 0, 0, 0, 0, 0, 0);
    pool.vx[0] = vx;
    pool.vy[0] = vy;
    return pool;
  };

  it('ages the particle and moves it by its velocity, which drag wears down', () => {
    const pool = one(1, 0);

    expect(fluidStep(pool, 0, 16.7, noise, 0, flow)).toBe(true);

    expect(pool.age[0]).toBeCloseTo(16.7, 5);
    expect(pool.vx[0]).toBeCloseTo(DRAG, 5);
    // The flow adds a little; the inherited velocity is what moves it.
    expect(pool.x[0]).toBeGreaterThan(10);
    expect(pool.x[0]).toBeLessThan(20);
  });

  it('comes close to a stop within its life: drag leaves a few percent after half a second', () => {
    const pool = one(1, 0);

    for (let n = 0; n < 30; n++) fluidStep(pool, 0, 16.7, noise, n * 16.7, flow);

    expect(pool.vx[0]).toBeLessThan(0.1);
    expect(pool.vx[0]).toBeGreaterThan(0);
  });

  it('takes a longer step on a slow frame and the same path on a fast screen', () => {
    const slow = one(1, 0);
    const fast = one(1, 0);

    fluidStep(slow, 0, 33.4, noise, 0, flow);
    fluidStep(fast, 0, 16.7, noise, 0, flow);
    fluidStep(fast, 0, 16.7, noise, 16.7, flow);

    expect(slow.vx[0]).toBeCloseTo(fast.vx[0], 5);
  });

  it('dies at the end of its life and frees the slot', () => {
    const pool = one(0, 0);
    const life = pool.life[0];

    expect(fluidStep(pool, 0, life - 1, noise, 0, flow)).toBe(true);
    expect(fluidLive(pool, 0)).toBe(true);
    expect(fluidStep(pool, 0, 1, noise, 0, flow)).toBe(false);
    expect(fluidLive(pool, 0)).toBe(false);
    expect(pool.age[0]).toBe(life);
  });

  it('is counted by fluidAdvance, which skips the dead and reports the living', () => {
    const pool = stillPool(8);
    fluidEmit(pool, 0, 0, 10, 0, 0, 0);
    expect(pool.alive).toBe(3);
    pool.life[1] = 10;

    expect(fluidAdvance(pool, 16, noise, 0, flow)).toBe(2);
    expect(pool.alive).toBe(2);
    expect(fluidLive(pool, 1)).toBe(false);
    expect(fluidAdvance(pool, LIFE_MAX, noise, 16, flow)).toBe(0);
  });

  it('starts over empty after a clear', () => {
    const pool = stillPool(8);
    fluidEmit(pool, 0, 0, 10, 0, 0, 0);

    fluidClear(pool);

    expect(pool.alive).toBe(0);
    expect(liveSlots(pool)).toHaveLength(0);
    expect(pool.carry).toBe(0);
    expect(pool.next).toBe(0);
  });
});

describe('fluidCurl', () => {
  const noise = createFluidNoise();
  const out = new Float32Array(2);

  it('is a smooth, bounded flow that is the same for the same place and time', () => {
    fluidCurl(noise, 120, 80, 500, out);
    const [fx, fy] = out;
    fluidCurl(noise, 120, 80, 500, out);

    expect(out[0]).toBe(fx);
    expect(out[1]).toBe(fy);
    expect(Math.hypot(fx, fy)).toBeGreaterThan(0);
    expect(Math.hypot(fx, fy)).toBeLessThan(CURL * 0.05);
  });

  it('neither gathers nor thins the particles: the field has no divergence', () => {
    const h = 0.5;
    const divergence = (x: number, y: number, t: number): number => {
      fluidCurl(noise, x + h, y, t, out);
      const fx1 = out[0];
      fluidCurl(noise, x - h, y, t, out);
      const fx0 = out[0];
      fluidCurl(noise, x, y + h, t, out);
      const fy1 = out[1];
      fluidCurl(noise, x, y - h, t, out);
      const fy0 = out[1];
      return (fx1 - fx0) / (2 * h) + (fy1 - fy0) / (2 * h);
    };
    for (const [x, y, t] of [
      [33, 71, 0],
      [250, 140, 900],
      [610, 95, 2500],
    ]) {
      expect(Math.abs(divergence(x, y, t))).toBeLessThan(1e-4);
    }
  });

  it('changes with time, so a still trail does not sit in one eddy', () => {
    fluidCurl(noise, 200, 200, 0, out);
    const [fx] = out;
    fluidCurl(noise, 200, 200, 3000, out);

    expect(out[0]).not.toBeCloseTo(fx, 4);
  });
});

describe('fluidRadius and fluidAlpha', () => {
  it('grows from birth to death', () => {
    expect(fluidRadius(0, 800)).toBe(RADIUS);
    expect(fluidRadius(400, 800)).toBe((RADIUS + RADIUS_END) / 2);
    expect(fluidRadius(800, 800)).toBe(RADIUS_END);
    expect(fluidRadius(900, 800)).toBe(RADIUS_END);
  });

  it('comes in fast, fades out over its life and is gone at the end', () => {
    expect(fluidAlpha(0, 800)).toBe(0);
    expect(fluidAlpha(FADE_IN / 2, 800)).toBeCloseTo(0.5 * (1 - FADE_IN / 2 / 800) ** 1.6, 5);
    expect(fluidAlpha(FADE_IN, 800)).toBeGreaterThan(0.85);
    expect(fluidAlpha(400, 800)).toBeLessThan(fluidAlpha(FADE_IN, 800));
    expect(fluidAlpha(400, 800)).toBeGreaterThan(fluidAlpha(700, 800));
    expect(fluidAlpha(800, 800)).toBe(0);
    expect(fluidAlpha(-1, 800)).toBe(0);
  });
});

describe('fluidBlend', () => {
  it('adds the particles on a dark surface and lays them over, fainter, on a light one', () => {
    expect(fluidBlend([0.07, 0.08, 0.1])).toEqual({ composite: 'lighter', strength: 0.18 });
    expect(fluidBlend([1, 1, 1])).toEqual({ composite: 'source-over', strength: 0.14 });
    expect(fluidBlend([0.96, 0.97, 0.98]).composite).toBe('source-over');
  });
});

describe('FluidCursor', () => {
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
    fixture.nativeElement.querySelector<HTMLElement>('ngwr-fluid-cursor')!;
  const canvas = (fixture: { nativeElement: HTMLElement }): HTMLCanvasElement =>
    fixture.nativeElement.querySelector<HTMLCanvasElement>('canvas.ngwr-fluid-cursor__canvas')!;

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    const pending = frames;
    frames = [];
    pending.forEach(frame => frame(now));
  };

  /** Sizes the canvas as the browser would: the size notification, then its frame, which is then forgotten. */
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

  const move = (target: HTMLElement, x: number, y: number, pointerType = 'mouse'): void => {
    target.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y, pointerType }));
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

  it('is decorative: hidden from assistive tech, no text, nothing focusable, before the content', async () => {
    const fixture = await render();
    const el = host(fixture);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
    expect(el.querySelector('[tabindex], a, button')).toBeNull();
    expect(el.nextElementSibling?.textContent).toBe('ngwr');
  });

  it('takes a 2D context, watches the host for size and view, and pre-renders one sprite per tint', async () => {
    const fixture = await render();

    expect(getContext).toHaveBeenCalledWith('2d');
    expect(StubResizeObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(StubIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(host(fixture));
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(TINTS);
    expect(ctx.fillRect).toHaveBeenCalledTimes(TINTS);
  });

  it('draws nothing and runs no loop while the pointer has not moved', async () => {
    await render();

    layout(800, 300);
    inView();

    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });

  it('starts the loop on a mouse move and draws one sprite per particle, a continuous run along the stroke', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 200, 100);
    expect(raf).toHaveBeenCalledTimes(1);

    tick(16);
    // One at the stroke's start, then one per gap over the 100px move.
    expect(ctx.drawImage).toHaveBeenCalledTimes(1 + 100 / EMIT_GAP);
    expect(ctx.globalCompositeOperation).toBe('source-over');
    expect(ctx.globalAlpha).toBe(1);
  });

  it('keeps drawing after the mouse stops until the trail has dissolved, then stops on its own', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 120);

    // Two seconds of frames: the trail is gone within about one.
    const asked = settle(125);
    expect(asked).toBeGreaterThan(LIFE_MIN / 16 - 2);
    expect(asked).toBeLessThan(LIFE_MAX / 16 + 5);
    expect(frames).toHaveLength(0);
    expect(caf).not.toHaveBeenCalled();
    // The last frame cleared the canvas and drew nothing.
    const draws = ctx.drawImage.mock.calls.length;
    expect(draws).toBeGreaterThan(0);
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(asked);
  });

  it('never holds more than the cap, however long the stroke', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    // Twenty zigzag moves of about 300px each: far more particles than the pool holds.
    for (let k = 0; k < 20; k++) move(wrap(fixture), 10 + k * 39, (k % 2) * 300);
    tick(16);

    expect(ctx.drawImage.mock.calls.length).toBeLessThanOrEqual(CAP);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThan(CAP / 2);
  });

  it('starts a fresh stroke after the pointer leaves, with no line across the gap', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    wrap(fixture).dispatchEvent(pointer('pointerleave', {}));
    move(wrap(fixture), 700, 100);
    tick(16);

    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
  });

  it('ignores a moving finger, so a touch scroll is never fought, and draws for a pen', async () => {
    const fixture = await render();
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100, 'touch');
    move(wrap(fixture), 200, 100, 'touch');
    expect(raf).not.toHaveBeenCalled();

    move(wrap(fixture), 100, 100, 'pen');
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('does not run off screen, starts when scrolled into view, and pauses while the document is hidden', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(800, 300);

    move(wrap(fixture), 100, 100);
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
    ctx.drawImage.mockClear();
    tick(16);
    expect(ctx.drawImage).toHaveBeenCalled();
    const second = raf.mock.results[raf.mock.results.length - 1].value as number;

    StubIntersectionObserver.instances[0].fire(false);
    expect(caf).toHaveBeenCalledWith(second);
  });

  it('draws nothing and never moves under reduced motion', async () => {
    const fixture = await render([platform(stub(true))]);
    layout(800, 300);
    inView();

    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 100);

    expect(raf).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it('dissolves the trail at once when motion is reduced mid-flight', async () => {
    const page = stub();
    const fixture = await render([platform(page)]);
    layout(800, 300);
    inView();
    move(wrap(fixture), 100, 100);
    move(wrap(fixture), 300, 100);
    settle(5);
    ctx.drawImage.mockClear();
    const loop = raf.mock.results[raf.mock.results.length - 1].value as number;

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();

    expect(caf).toHaveBeenCalledWith(loop);
    expect(ctx.drawImage).not.toHaveBeenCalled();
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
    move(wrap(fixture), 10, 10);
    expect(raf).not.toHaveBeenCalled();
  });

  it('survives a browser that gives it no context', async () => {
    getContext.mockImplementation(() => null);
    const fixture = await render();

    expect(StubResizeObserver.instances).toHaveLength(0);
    move(wrap(fixture), 10, 10);
    expect(raf).not.toHaveBeenCalled();
  });

  it('releases the loop, the observers and the listeners on destroy', async () => {
    const fixture = await render();
    const target = wrap(fixture);
    const removed = vi.spyOn(target, 'removeEventListener');
    layout(800, 300);
    inView();
    move(target, 100, 100);
    expect(raf).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(caf).toHaveBeenCalledTimes(1);
    expect(StubResizeObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(StubIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('pointerleave', expect.any(Function));

    // A frame that was already queued does nothing once destroyed.
    ctx.drawImage.mockClear();
    tick(100);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});
