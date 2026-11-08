import { ErrorHandler, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONFETTI_CONE,
  CONFETTI_COUNT,
  CONFETTI_DRAG,
  CONFETTI_GRAVITY,
  CONFETTI_LIFE_MS,
  CONFETTI_LIFE_SPREAD_MS,
  CONFETTI_STRIP_EVERY,
  Confetti,
  type ConfettiPiece,
  confettiAlive,
  confettiAlpha,
  confettiLaunch,
  confettiRandom,
  confettiStep,
} from './confetti';

/** jsdom has no 2D context; this one records what gets drawn. */
class FakeContext {
  readonly setTransform = vi.fn();
  readonly clearRect = vi.fn();
  readonly rotate = vi.fn();
  readonly scale = vi.fn();
  readonly fillRect = vi.fn();
  readonly fills: string[] = [];
  globalAlpha = 1;
  set fillStyle(value: string) {
    this.fills.push(value);
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

const RECT = { left: 100, top: 400, width: 40, height: 20 };
const PALETTE = ['red', 'green', 'blue'];

/** Runs `piece` on at `dt` ms a frame, `frames` times; returns the lowest point it reached (the smallest `y`). */
const fly = (piece: ConfettiPiece, frames: number, dt = 16): number => {
  let top = piece.y;
  for (let i = 0; i < frames; i++) {
    confettiStep(piece, dt);
    top = Math.min(top, piece.y);
  }
  return top;
};

describe('confettiRandom', () => {
  it('gives the same sequence for the same seed and another for another', () => {
    const a = confettiRandom(7);
    const b = confettiRandom(7);
    const c = confettiRandom(8);
    const first = Array.from({ length: 5 }, () => a());

    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(first);
  });

  it('stays inside 0–1 and survives a zero seed', () => {
    const zero = confettiRandom(0);
    for (let i = 0; i < 100; i++) {
      const value = zero();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(zero()).not.toBe(zero());
  });
});

describe('confettiLaunch', () => {
  it('makes the asked count, every fifth a thin strip, coloured from the palette in turn', () => {
    const pieces = confettiLaunch(RECT, 1, CONFETTI_COUNT, PALETTE);

    expect(pieces).toHaveLength(CONFETTI_COUNT);
    pieces.forEach((piece, i) => {
      const strip = i % CONFETTI_STRIP_EVERY === CONFETTI_STRIP_EVERY - 1;
      expect(piece.width < piece.height).toBe(strip);
      expect(piece.color).toBe(PALETTE[i % PALETTE.length]);
    });
    expect(confettiLaunch(RECT, 1, 10, PALETTE)).toHaveLength(10);
    expect(confettiLaunch(RECT, 1, 0, PALETTE)).toHaveLength(0);
  });

  it('starts every piece inside the rect, thrown upward inside the cone', () => {
    const half = (CONFETTI_CONE / 2) * (Math.PI / 180);

    for (const piece of confettiLaunch(RECT, 3, CONFETTI_COUNT, PALETTE)) {
      expect(piece.x).toBeGreaterThanOrEqual(RECT.left);
      expect(piece.x).toBeLessThanOrEqual(RECT.left + RECT.width);
      expect(piece.y).toBeGreaterThanOrEqual(RECT.top);
      expect(piece.y).toBeLessThanOrEqual(RECT.top + RECT.height);
      expect(piece.vy).toBeLessThan(0);
      expect(Math.abs(Math.atan2(piece.vx, -piece.vy))).toBeLessThanOrEqual(half + 1e-9);
      expect(piece.life).toBeGreaterThanOrEqual(CONFETTI_LIFE_MS);
      expect(piece.life).toBeLessThanOrEqual(CONFETTI_LIFE_MS + CONFETTI_LIFE_SPREAD_MS);
    }
  });

  it('is the same burst for the same seed and another for another', () => {
    const first = confettiLaunch(RECT, 42, 20, PALETTE);

    expect(confettiLaunch(RECT, 42, 20, PALETTE)).toEqual(first);
    expect(confettiLaunch(RECT, 43, 20, PALETTE)).not.toEqual(first);
  });
});

describe('confettiStep', () => {
  it('sends a piece up first, then brings it down past where it started, no faster than terminal speed', () => {
    const [piece] = confettiLaunch(RECT, 5, 1, PALETTE);
    const start = piece.y;
    const terminal = CONFETTI_GRAVITY / CONFETTI_DRAG;

    const top = fly(piece, 150);

    expect(top).toBeLessThan(start - 50);
    expect(piece.y).toBeGreaterThan(start);
    expect(piece.vy).toBeGreaterThan(0);
    expect(piece.vy).toBeLessThanOrEqual(terminal + 1e-6);
  });

  it('slows a piece sideways with drag, turns it, flips it and runs its life down', () => {
    const [piece] = confettiLaunch(RECT, 9, 1, PALETTE);
    const { vx, angle, phase, life } = piece;

    confettiStep(piece, 100);

    expect(Math.abs(piece.vx)).toBeLessThan(Math.abs(vx));
    expect(piece.angle).not.toBe(angle);
    expect(piece.phase).toBeGreaterThan(phase);
    expect(piece.life).toBe(life - 100);
  });

  it('moves nothing on a zero frame', () => {
    const [piece] = confettiLaunch(RECT, 2, 1, PALETTE);
    const { vy, ...before } = piece;

    confettiStep(piece, 0);

    expect(piece).toMatchObject(before);
    expect(piece.vy).toBeCloseTo(vy, 9);
  });
});

describe('confettiAlive and confettiAlpha', () => {
  it('ends a piece when its life is out or it has dropped off the bottom', () => {
    const [piece] = confettiLaunch(RECT, 4, 1, PALETTE);

    expect(confettiAlive(piece, 800)).toBe(true);
    expect(confettiAlive({ ...piece, y: 820 }, 800)).toBe(false);
    expect(confettiAlive({ ...piece, life: 0 }, 800)).toBe(false);
  });

  it('has every piece gone inside two and a half seconds', () => {
    const pieces = confettiLaunch(RECT, 11, CONFETTI_COUNT, PALETTE);

    for (const piece of pieces) fly(piece, 2500 / 20, 20);

    expect(pieces.some(piece => confettiAlive(piece, 10_000))).toBe(false);
  });

  it('is solid, then fades over the last stretch', () => {
    const [piece] = confettiLaunch(RECT, 4, 1, PALETTE);

    expect(confettiAlpha(piece)).toBe(1);
    expect(confettiAlpha({ ...piece, life: 300 })).toBeCloseTo(0.5);
    expect(confettiAlpha({ ...piece, life: -10 })).toBe(0);
  });
});

describe('Confetti', () => {
  let ctx: FakeContext;
  let getContext: MockInstance<HTMLCanvasElement['getContext']>;
  /** Every frame callback waiting, Angular's own scheduler's among them; a cancel takes its callback out. */
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;
  let clock: MockInstance<() => number>;
  let thrown: unknown[];
  let dpr: PropertyDescriptor | undefined;
  let innerWidth: PropertyDescriptor | undefined;

  const setup = (providers: unknown[] = [platform(stub())]): Confetti => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...(providers as never[]),
      ],
    });
    const confetti = TestBed.inject(Confetti);
    TestBed.tick();
    return confetti;
  };

  const canvases = (): HTMLCanvasElement[] =>
    Array.from(document.body.querySelectorAll<HTMLCanvasElement>('canvas.ngwr-confetti'));

  const button = (): HTMLElement => {
    const el = document.createElement('button');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 300, top: 500, width: 32, height: 32 } as DOMRect);
    return el;
  };

  /** Runs every frame callback queued so far, once, at `now`. */
  const tick = (now: number): void => {
    clock.mockReturnValue(now);
    const pending = Array.from(frames.values());
    frames.clear();
    pending.forEach(frame => frame(now));
  };

  /** Frames 16ms apart from `from` until the canvas is gone or `until` is reached; returns when it went. */
  const runOut = (from = 0, until = 4000): number => {
    let now = from;
    while (canvases().length > 0 && now < until) {
      now += 16;
      tick(now);
    }
    return now;
  };

  /** The positions the frames since the last reset drew, as the translation of each piece's transform. */
  const drawn = (): number[][] => {
    const calls = ctx.setTransform.mock.calls as number[][];
    return calls.filter(call => call.length === 6 && call[4] !== 0).map(call => [call[4], call[5]]);
  };

  /** How many pieces the frames since the last reset painted. */
  const painted = (): number => ctx.fillRect.mock.calls.length;

  beforeEach(() => {
    thrown = [];
    ctx = new FakeContext();
    getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
    frames = new Map();
    frameId = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((frame: FrameRequestCallback) => {
        frames.set(++frameId, frame);
        return frameId;
      })
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => frames.delete(id))
    );
    clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    dpr = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    innerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  });

  afterEach(() => {
    if (dpr) Object.defineProperty(window, 'devicePixelRatio', dpr);
    else Reflect.deleteProperty(window, 'devicePixelRatio');
    if (innerWidth) Object.defineProperty(window, 'innerWidth', innerWidth);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    for (const canvas of canvases()) canvas.remove();
    expect(thrown).toEqual([]);
  });

  it('adds nothing to the body until a burst', () => {
    const confetti = setup();

    tick(0);

    expect(canvases()).toHaveLength(0);
    expect(confetti.active).toBe(false);
    expect(getContext).not.toHaveBeenCalled();
    expect(painted()).toBe(0);
  });

  it('mounts one hidden canvas over the viewport at the device ratio, capped at two, and starts a loop', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    const confetti = setup();

    confetti.burst(button());

    const [canvas] = canvases();
    expect(canvases()).toHaveLength(1);
    expect(canvas.parentElement).toBe(document.body);
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.width).toBe(window.innerWidth * 2);
    expect(canvas.height).toBe(window.innerHeight * 2);
    expect(getContext).toHaveBeenCalledWith('2d');
    expect(confetti.active).toBe(true);

    tick(0);
    expect(painted()).toBe(CONFETTI_COUNT);
  });

  it('draws every piece each frame, in the hook colours, and takes the canvas out when the last piece is gone', () => {
    const confetti = setup();
    confetti.burst(button());

    tick(0);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(painted()).toBe(CONFETTI_COUNT);
    expect(new Set(ctx.fills)).toEqual(new Set(['#3969e2', '#008800', '#ffba00', '#dc3137', '#3472d9']));

    const gone = runOut();

    expect(canvases()).toHaveLength(0);
    expect(confetti.active).toBe(false);
    expect(gone).toBeLessThanOrEqual(2500);
    expect(gone).toBeGreaterThan(1500);

    ctx.fillRect.mockClear();
    tick(gone + 16);
    expect(painted()).toBe(0);
  });

  it('shares one canvas and one loop between overlapping bursts', () => {
    const confetti = setup();

    confetti.burst(button());
    tick(0);
    confetti.burst(button(), { count: 10 });
    ctx.fillRect.mockClear();
    ctx.clearRect.mockClear();
    tick(16);

    expect(canvases()).toHaveLength(1);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(painted()).toBe(CONFETTI_COUNT + 10);
  });

  it('takes a rect as well as an element and lays the same burst for the same seed', () => {
    const confetti = setup();

    confetti.burst(RECT, { seed: 1, count: 5 });
    tick(0);
    const first = drawn();
    ctx.setTransform.mockClear();
    confetti.clear();

    confetti.burst(RECT, { seed: 1, count: 5 });
    tick(0);
    const second = drawn();
    ctx.setTransform.mockClear();
    confetti.clear();

    confetti.burst(RECT, { seed: 2, count: 5 });
    tick(0);

    expect(first).toHaveLength(5);
    expect(second).toEqual(first);
    expect(drawn()).not.toEqual(first);
  });

  it('pauses while the document is hidden and resumes where it stopped', () => {
    const page = stub();
    const confetti = setup([platform(page)]);
    confetti.burst(button());
    tick(0);
    ctx.setTransform.mockClear();
    tick(16);
    const before = drawn();
    ctx.setTransform.mockClear();
    ctx.fillRect.mockClear();

    page.pageVisible.set(false);
    TestBed.tick();
    tick(32);
    tick(48);

    expect(painted()).toBe(0);
    expect(canvases()).toHaveLength(1);
    expect(confetti.active).toBe(true);

    clock.mockReturnValue(5000);
    page.pageVisible.set(true);
    TestBed.tick();
    tick(5000);

    expect(painted()).toBe(CONFETTI_COUNT);
    expect(drawn()).toEqual(before);
  });

  it('follows a resize while pieces are in the air', () => {
    const confetti = setup();
    confetti.burst(button());
    const [canvas] = canvases();
    const width = canvas.width;

    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true, writable: true });
    window.dispatchEvent(new Event('resize'));

    expect(canvas.width).not.toBe(width);
    expect(canvas.width).toBe(500);
  });

  it('does nothing under reduced motion, and clears at once when it flips on mid-burst', () => {
    const page = stub(true);
    const confetti = setup([platform(page)]);

    confetti.burst(button());
    expect(canvases()).toHaveLength(0);

    page.prefersReducedMotion.set(false);
    TestBed.tick();
    confetti.burst(button());
    tick(0);
    expect(canvases()).toHaveLength(1);
    ctx.fillRect.mockClear();

    page.prefersReducedMotion.set(true);
    TestBed.tick();

    expect(canvases()).toHaveLength(0);
    expect(confetti.active).toBe(false);
    tick(16);
    expect(painted()).toBe(0);
  });

  it('does nothing under forced colours', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(forced-colors: active)' }))
    );
    const confetti = setup();

    confetti.burst(button());

    expect(canvases()).toHaveLength(0);
    expect(getContext).not.toHaveBeenCalled();
  });

  it('does nothing on the server', () => {
    const confetti = setup([platform(stub()), { provide: PLATFORM_ID, useValue: 'server' }]);

    confetti.burst(RECT);
    tick(0);

    expect(canvases()).toHaveLength(0);
    expect(getContext).not.toHaveBeenCalled();
    expect(painted()).toBe(0);
  });

  it('survives a browser that gives it no context', () => {
    getContext.mockImplementation(() => null);
    const confetti = setup();

    confetti.burst(button());
    tick(0);

    expect(canvases()).toHaveLength(0);
    expect(confetti.active).toBe(false);
    expect(painted()).toBe(0);
  });

  it('cancels its loop and takes the canvas out when the app is torn down mid-burst', () => {
    const confetti = setup();
    confetti.burst(button());
    tick(0);
    expect(canvases()).toHaveLength(1);
    ctx.fillRect.mockClear();

    TestBed.resetTestingModule();
    tick(16);

    expect(canvases()).toHaveLength(0);
    expect(confetti.active).toBe(false);
    expect(painted()).toBe(0);
  });
});
