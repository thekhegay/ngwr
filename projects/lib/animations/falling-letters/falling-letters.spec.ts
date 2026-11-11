import { Component, PLATFORM_ID, type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { graphemes } from 'ngwr/animations/core';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BOUNCE_MIN,
  COLUMN,
  DRIFT,
  FALLING_LETTERS_REST,
  WrFallingLetters,
  GRAVITY,
  Heap,
  RELEASE,
  RESTITUTION,
  RETURN,
  RETURN_SPREAD,
  SLACK,
  SLIDE,
  SLIDE_MAX,
  SPIN,
  ink,
  scatter,
  spring,
} from './falling-letters';

@Component({
  imports: [WrFallingLetters],
  template: `<div class="box">
    <p wrFallingLetters>{{ text() }}</p>
  </div>`,
})
class Host {
  readonly text = signal('Héllo wörld 😀!');
}

/** The host is a box-less wrapper and the text sits in a child the host does not own, as on the 404 page. */
@Component({
  imports: [WrFallingLetters],
  template: `<div class="box">
    <div [wrFallingLetters]="selector()" style="display: contents">
      <h2 class="title">404</h2>
      <p class="desc">Nothing here</p>
      <button type="button">Go home</button>
    </div>
  </div>`,
})
class TargetHost {
  readonly selector = signal<string | null>('.desc');
}

@Component({
  imports: [WrFallingLetters],
  template: `<div class="box">
    <div wrFallingLetters=".nope" style="display: contents"><p class="desc">Nothing here</p></div>
  </div>`,
})
class MissingHost {}

@Component({
  imports: [WrFallingLetters],
  template: `<div class="box">
    <p wrFallingLetters>Go <code>home</code> now</p>
  </div>`,
})
class InlineHost {}

@Component({
  imports: [WrFallingLetters],
  template: `<div class="arena">
    <div class="box"><p wrFallingLetters floor=".arena" rest="1000">abc</p></div>
  </div>`,
})
class FloorHost {}

/** `requestAnimationFrame` by hand: frames run when the spec says, at the time the spec says. */
class Frames {
  private readonly queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  readonly request = vi.fn((cb: FrameRequestCallback): number => {
    this.queue.set(++this.id, cb);
    return this.id;
  });
  readonly cancel = vi.fn((id: number): void => {
    this.queue.delete(id);
  });
  get pending(): number {
    return this.queue.size;
  }
  at(now: number): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    callbacks.forEach(cb => cb(now));
  }
}

interface PlatformStub {
  readonly prefersReducedMotion: WritableSignal<boolean>;
  readonly pageVisible: WritableSignal<boolean>;
}

const stub = (reduced = false): PlatformStub => ({ prefersReducedMotion: signal(reduced), pageVisible: signal(true) });

const platform = (value: PlatformStub): unknown => ({ provide: WrPlatform, useValue: value });

interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The target's box on the page, and one glyph's size. */
const EL: Box = { left: 100, top: 100, width: 300, height: 20 };
const GLYPH = { width: 10, height: 20 };
/** The box the letters fall in: its bottom is 500px under the target's top, its walls 100px out each way. */
const BOX: Box = { left: 0, top: 0, width: 400, height: 600 };
const ARENA: Box = { left: 50, top: 50, width: 300, height: 250 };
const FLOOR = BOX.top + BOX.height - EL.top;
const MIN_X = BOX.left - EL.left;
const MAX_X = BOX.left + BOX.width - EL.left;

const FRAME = 16;

/** Where glyph `i` sits on the page: one line by default, three to a line when the spec says. */
const layout = { lines: false };

const glyphBox = (i: number): Box =>
  layout.lines
    ? { left: EL.left + (i % 3) * GLYPH.width, top: EL.top + Math.floor(i / 3) * GLYPH.height, ...GLYPH }
    : { left: EL.left + i * GLYPH.width, top: EL.top, ...GLYPH };

/** jsdom has no layout: the target, its glyphs during the measurement and the floor's box are given rects by class. */
function rectOf(el: Element): DOMRect {
  let box: Box = { left: 0, top: 0, width: 0, height: 0 };
  if (el.classList.contains('wr-falling-letters__glyph')) {
    box = glyphBox(Array.prototype.indexOf.call(el.parentElement!.children, el));
  } else if (el.classList.contains('wr-falling-letters')) {
    box = EL;
  } else if (el.classList.contains('box')) {
    box = BOX;
  } else if (el.classList.contains('arena')) {
    box = ARENA;
  }
  return {
    ...box,
    x: box.left,
    y: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    toJSON: () => box,
  };
}

interface Pose {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

const pose = (piece: HTMLElement): Pose => {
  // A serialiser may drop a zero y or a zero's unit.
  const m = /^translate\((-?[\d.]+)(?:px)?(?:, (-?[\d.]+)(?:px)?)?\) rotate\((-?[\d.]+)deg\)$/.exec(
    piece.style.transform
  );
  expect(m, piece.style.transform).not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2] ?? 0), angle: Number(m![3]) };
};

/**
 * The metrics the canvas stub answers `measureText` with. The default makes
 * the ink the whole line box: an ascent and a descent that add up to the
 * glyph's height, and ink that fills them, so a piece's body is its box and a
 * spec can reason in boxes. One spec narrows the ink to see the body follow it.
 */
const metrics = {
  fontBoundingBoxAscent: 15,
  fontBoundingBoxDescent: 5,
  actualBoundingBoxAscent: 15,
  actualBoundingBoxDescent: 5,
  actualBoundingBoxLeft: 0,
  actualBoundingBoxRight: GLYPH.width,
};

/** The body of a glyph's piece: its ink inside the line box, from the metrics above. */
const body = (): { left: number; top: number; width: number; height: number } => {
  const baseline =
    (GLYPH.height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
  const left = -metrics.actualBoundingBoxLeft || 0;
  const top = baseline - metrics.actualBoundingBoxAscent;
  return {
    left,
    top,
    width: metrics.actualBoundingBoxRight - left,
    height: baseline + metrics.actualBoundingBoxDescent - top,
  };
};

/** The axis-aligned box of a glyph's body at its pose, for the heap and the walls. */
const aabb = (p: Pose): { left: number; right: number; top: number; bottom: number } => {
  const b = body();
  const rad = (p.angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const hw = (b.width * cos + b.height * sin) / 2;
  const hh = (b.height * cos + b.width * sin) / 2;
  const cx = p.x + b.left + b.width / 2;
  const cy = p.y + b.top + b.height / 2;
  return { left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh };
};

describe('falling letters model', () => {
  it('scatters each letter the same way every time, inside (0, 1), with no two neighbours alike', () => {
    for (const k of [0, 1, 2] as const) {
      const values = Array.from({ length: 40 }, (_, i) => scatter(i, k));
      for (const v of values) {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(1);
      }
      for (let i = 1; i < values.length; i++) expect(Math.abs(values[i] - values[i - 1])).toBeGreaterThan(0.1);
      expect(values).toEqual(Array.from({ length: 40 }, (_, i) => scatter(i, k)));
    }
    // Three channels, three orders: the first to let go is neither the widest drift nor the fastest spin.
    const order = (k: 0 | 1 | 2): number[] =>
      Array.from({ length: 8 }, (_, i) => i).sort((a, b) => scatter(a, k) - scatter(b, k));
    expect(order(0)).not.toEqual(order(1));
    expect(order(1)).not.toEqual(order(2));
  });

  it('springs past the target once, by under a tenth, and is there at the end', () => {
    expect(spring(0)).toBe(0);
    expect(spring(1)).toBe(1);
    expect(spring(2)).toBe(1);
    let peak = 0;
    let dips = 0;
    let above = false;
    for (let t = 0; t <= 1; t += 0.01) {
      const s = spring(t);
      peak = Math.max(peak, s);
      if (s > 1 !== above) {
        above = s > 1;
        if (!above) dips++;
      }
    }
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.1);
    // Over the target, back under it, and at most once more over: a settle, not a wobble.
    expect(dips).toBeGreaterThanOrEqual(1);
    expect(dips).toBeLessThanOrEqual(2);
    expect(Math.abs(spring(0.99) - 1)).toBeLessThan(0.01);
  });

  it('lands a body on the highest top among its columns, so a later body sits on an earlier one', () => {
    const heap = new Heap(0, 80, 500);
    expect(heap.top(0, 10)).toBe(500);

    heap.settle(0, 10, 480);
    expect(heap.top(0, 10)).toBe(480);
    expect(heap.top(5, 30)).toBe(480);
    expect(heap.top(16, 30)).toBe(500);

    heap.settle(16, 24, 490);
    expect(heap.top(12, 20)).toBe(480);
    expect(heap.top(20, 30)).toBe(490);
    // A body settling under an existing top never lowers it; one out of range lands on the edge columns.
    heap.settle(0, 10, 495);
    expect(heap.top(0, 10)).toBe(480);
    expect(heap.top(-50, -40)).toBe(480);
    expect(heap.top(200, 300)).toBe(500);
    expect(COLUMN).toBeLessThan(GLYPH.width);
  });

  it('offers a body only the tops under it: a neighbour it is level with is beside it, not a floor', () => {
    const heap = new Heap(0, 80, 500);
    heap.settle(0, 10, 480);
    // Coming down from above the neighbour, the body lands on it.
    expect(heap.top(5, 30, 470)).toBe(480);
    // Already lower than its top, the body is beside it and falls on past to the floor.
    expect(heap.top(5, 30, 490)).toBe(500);
    // With every column of the span above the body, the floor itself.
    expect(heap.top(0, 10, 490)).toBe(500);
    // At the top exactly, within the slack: on it.
    expect(heap.top(5, 30, 480 - SLACK)).toBe(480);
    expect(SLACK).toBeLessThan(1);
  });

  it('tells a body lying against a neighbour which side it stands on', () => {
    const heap = new Heap(0, 80, 500);
    heap.settle(0, 16, 480);
    // Lying on the floor with the neighbour under its left part, or its right part.
    expect(heap.beside(8, 30, 500)).toEqual({ left: 2, right: 0 });
    heap.settle(64, 80, 480);
    expect(heap.beside(50, 72, 500)).toEqual({ left: 0, right: 2 });
    // Clear of both, and on top of one: nothing beside it.
    expect(heap.beside(24, 44, 500)).toBeNull();
    expect(heap.beside(0, 16, 480)).toBeNull();
    // Between the two: both sides.
    heap.settle(24, 40, 470);
    expect(heap.beside(16, 48, 500)).toEqual({ left: 3, right: 1 });
    expect(heap.beside(12, 28, 500)).toEqual({ left: 2, right: 1 });
    expect(SLIDE_MAX).toBeGreaterThan(4 * GLYPH.width);
    expect(SLIDE).toBeGreaterThan(DRIFT);
  });

  it('measures a glyph by its ink about the baseline of its line box, and gives up without metrics', () => {
    const ctx = (m: Partial<TextMetrics>): CanvasRenderingContext2D =>
      ({ measureText: () => m }) as unknown as CanvasRenderingContext2D;
    // A 36px line box over a font of 18 up and 6 down: 6px of leading each side, the baseline at 24.
    const font = { fontBoundingBoxAscent: 18, fontBoundingBoxDescent: 6 };
    expect(
      ink(
        ctx({
          ...font,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
          actualBoundingBoxLeft: -1,
          actualBoundingBoxRight: 9,
        }),
        'a',
        { height: 36 }
      )
    ).toEqual({ left: 1, top: 14, width: 8, height: 12 });
    expect(ink(null, 'a', { height: 36 })).toBeNull();
    expect(ink(ctx({ actualBoundingBoxAscent: 10, actualBoundingBoxRight: 9 }), 'a', { height: 36 })).toBeNull();
    expect(
      ink(
        ctx({
          ...font,
          actualBoundingBoxAscent: 0,
          actualBoundingBoxDescent: 0,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: 9,
        }),
        ' ',
        { height: 36 }
      )
    ).toBeNull();
  });

  it('keeps the numbers a fall is made of', () => {
    expect(GRAVITY).toBe(2400);
    expect(DRIFT).toBe(80);
    expect(SPIN).toBe(160);
    expect(RELEASE).toBe(240);
    expect(RESTITUTION).toBe(0.25);
    expect(BOUNCE_MIN).toBe(300);
    expect(RETURN).toBe(700);
    expect(RETURN_SPREAD).toBe(300);
    expect(FALLING_LETTERS_REST).toBe(4000);
  });
});

describe('WrFallingLetters', () => {
  let frames: Frames;

  const render = async <T>(
    host: new () => T,
    providers: unknown[] = [platform(stub())]
  ): Promise<ReturnType<typeof TestBed.createComponent<T>>> => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await fixture.whenStable();
    // Fake only now, and only the timer: the frames are the spec's own stub.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    return fixture;
  };

  const target = (fixture: { nativeElement: HTMLElement }, selector = 'p'): HTMLElement =>
    fixture.nativeElement.querySelector<HTMLElement>(selector)!;

  const pieces = (el: HTMLElement): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>('.wr-falling-letters__piece'));

  const layer = (el: HTMLElement): HTMLElement | null => el.querySelector<HTMLElement>('.wr-falling-letters__pieces');

  const wrapper = (el: HTMLElement): HTMLElement | null => el.querySelector<HTMLElement>('.wr-falling-letters__text');

  const out = (el: HTMLElement): boolean => el.classList.contains('wr-falling-letters--out');

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  /** `count` frames of `FRAME` ms from `from`, or until the loop idles. Returns the time of the last one. */
  const run = (count: number, from = 0): number => {
    let now = from;
    for (let i = 0; i < count && frames.pending > 0; i++) {
      now += FRAME;
      frames.at(now);
    }
    return now;
  };

  /** Click, then frames until every letter has settled and the loop idles. */
  const settle = (el: HTMLElement): number => {
    click(el);
    frames.at(0);
    const now = run(600);
    expect(frames.pending).toBe(0);
    return now;
  };

  beforeEach(() => {
    layout.lines = false;
    Object.assign(metrics, {
      fontBoundingBoxAscent: 15,
      fontBoundingBoxDescent: 5,
      actualBoundingBoxAscent: 15,
      actualBoundingBoxDescent: 5,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: GLYPH.width,
    });
    frames = new Frames();
    vi.stubGlobal('requestAnimationFrame', frames.request);
    vi.stubGlobal('cancelAnimationFrame', frames.cancel);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return rectOf(this);
    });
    // jsdom has no canvas: the text metrics come from the stub, the same for every glyph.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ font: '', measureText: () => ({ ...metrics }) }) as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('marks the target and sits still until a click', async () => {
    const fixture = await render(Host);
    const el = target(fixture);

    expect(el.className).toBe('wr-falling-letters');
    expect(el.getAttribute('style')).toBeNull();
    expect(el.children).toHaveLength(0);
    expect(frames.pending).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(pieces(el)).toHaveLength(0);
  });

  it('splits the text into one piece per grapheme, spaces aside, over the authored nodes kept in place', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const nodes = Array.from(el.childNodes);
    const text = el.textContent;

    click(el);

    const expected = graphemes(text).filter(g => g.trim() !== '');
    expect(pieces(el).map(p => p.textContent)).toEqual(expected);
    expect(expected).toContain('😀');
    expect(expected).toContain('é');
    expect(out(el)).toBe(true);
    // The line: the same node objects, in order, in the wrapper, which holds their space; no inline style on the target.
    expect(Array.from(wrapper(el)!.childNodes)).toEqual(nodes);
    expect(el.getAttribute('style')).toBeNull();
    expect(Array.from(el.children)).toEqual([wrapper(el), layer(el)]);
    // No probe survives the measurement.
    expect(el.querySelector('.wr-falling-letters__glyph')).toBeNull();
    // The pieces are not for a reader or a pointer; the wrapper is the real text and stays in the tree.
    expect(layer(el)!.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper(el)!.hasAttribute('aria-hidden')).toBe(false);
    // Each piece starts exactly over its letter: the glyph's top-left from the target's box, no turn.
    pieces(el).forEach((piece, i) => {
      const box = glyphBox(i);
      expect(pose(piece)).toEqual({ x: box.left - EL.left, y: box.top - EL.top, angle: 0 });
    });
    expect(frames.pending).toBe(1);
  });

  it('falls the same way every time', async () => {
    const trace = async (): Promise<string[][]> => {
      const fixture = await render(Host);
      const el = target(fixture);
      const seen: string[][] = [];
      click(el);
      let now = 0;
      for (let i = 0; i < 40; i++) {
        frames.at(now);
        seen.push(pieces(el).map(p => p.style.transform));
        now += FRAME;
      }
      fixture.destroy();
      TestBed.resetTestingModule();
      return seen;
    };

    const first = await trace();
    const second = await trace();
    expect(second).toEqual(first);
    // And it is a fall: the letters are lower at the end than at the start.
    const ys = (frame: string[]): number[] => frame.map(t => Number(/, (-?[\d.]+)px\)/.exec(t)![1]));
    expect(Math.max(...ys(first[39]))).toBeGreaterThan(Math.max(...ys(first[0])) + 100);
  });

  it('lets the letters go over the release spread, not all at once', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    frames.at(0);
    frames.at(FRAME);
    frames.at(2 * FRAME);
    const moved = pieces(el).filter(p => pose(p).y !== 0).length;
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(pieces(el).length);

    run(Math.ceil(RELEASE / FRAME) + 2, 2 * FRAME);
    expect(pieces(el).every(p => pose(p).y > 0)).toBe(true);
  });

  it('keeps every letter above the floor and between the walls on every frame, then idles on the heap', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    frames.at(0);
    let now = 0;
    let lowest = 0;
    while (frames.pending > 0 && now < 20_000) {
      now += FRAME;
      frames.at(now);
      for (const piece of pieces(el)) {
        const box = aabb(pose(piece));
        expect(box.bottom).toBeLessThanOrEqual(FLOOR + 0.01);
        expect(box.left).toBeGreaterThanOrEqual(MIN_X - 0.01);
        expect(box.right).toBeLessThanOrEqual(MAX_X + 0.01);
        lowest = Math.max(lowest, box.bottom);
      }
    }
    expect(frames.pending).toBe(0);
    // Somebody reached the floor, and the fall and the settling on it, with
    // thirteen letters sliding and climbing clear of one another on a floor
    // the width of the line, took under two and a half seconds.
    expect(lowest).toBeGreaterThan(FLOOR - 0.01);
    expect(now).toBeLessThan(2500);
    // Letters tumbled: not every one lies flat.
    expect(pieces(el).some(p => Math.abs(pose(p).angle) > 10)).toBe(true);
    // Settled: the next frame of the clock changes nothing and asks for nothing.
    const before = pieces(el).map(p => p.style.transform);
    vi.advanceTimersByTime(FALLING_LETTERS_REST - 1);
    expect(pieces(el).map(p => p.style.transform)).toEqual(before);
    expect(frames.pending).toBe(0);
  });

  it('never jumps a letter up on to a neighbour: a letter rises a hop or a climb at a time', async () => {
    // Two letters reach the floor side by side, their boxes overlapping once
    // turned. The first to settle used to raise the columns under both, and
    // the second, already as low, was snapped up on to it in one frame, and
    // the next on to that: a tower of letters hanging over the line, built in
    // a frame and jerking as it went. A letter may rise only by a hop, which
    // gives back a quarter of the fastest it came down, or by a climb, which
    // is slower than that.
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    frames.at(0);
    let now = 0;
    const last = pieces(el).map(p => pose(p).y);
    const fastest = pieces(el).map(() => 0);
    let rises = 0;
    while (frames.pending > 0 && now < 20_000) {
      now += FRAME;
      frames.at(now);
      pieces(el).forEach((piece, i) => {
        const y = pose(piece).y;
        const dy = y - last[i];
        last[i] = y;
        fastest[i] = Math.max(fastest[i], dy);
        if (dy < -0.01) {
          rises++;
          expect(-dy, `piece ${i} rose ${-dy}px at ${now}ms`).toBeLessThanOrEqual(RESTITUTION * fastest[i] + 1);
        }
      });
    }
    expect(frames.pending).toBe(0);
    expect(rises).toBeGreaterThan(0);
  });

  it('falls and lands on the ink of the glyph, not on the air of its line box', async () => {
    // A lowercase letter in a line box: 8px of ink standing on the baseline,
    // 7px of air over it and 5px under. Its piece turns about the ink, and the
    // ink is what meets the floor: the box pokes under the floor by the
    // descender space, as the letter sits on the floor and not above it.
    metrics.actualBoundingBoxAscent = 8;
    metrics.actualBoundingBoxDescent = 0;
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    const b = body();
    expect(b).toEqual({ left: 0, top: 7, width: GLYPH.width, height: 8 });
    for (const piece of pieces(el)) expect(piece.style.transformOrigin).toBe('5px 11px');
    // Over its letter at the start all the same: the box's top-left is unchanged.
    pieces(el).forEach((piece, i) => {
      const box = glyphBox(i);
      expect(pose(piece)).toEqual({ x: box.left - EL.left, y: box.top - EL.top, angle: 0 });
    });

    frames.at(0);
    run(600);
    expect(frames.pending).toBe(0);
    const bottoms = pieces(el).map(p => aabb(pose(p)).bottom);
    expect(Math.max(...bottoms)).toBeGreaterThan(FLOOR - 0.01);
    expect(Math.max(...bottoms)).toBeLessThanOrEqual(FLOOR + 0.01);
    // The line box of a letter on the floor reaches under the floor: by the 5px
    // of descender space when it lies flat, by less as it turns.
    const boxBottom = (p: Pose): number => {
      const rad = (p.angle * Math.PI) / 180;
      const corners = [
        [-b.width / 2, -b.top - b.height / 2],
        [GLYPH.width - b.width / 2, -b.top - b.height / 2],
        [-b.width / 2, GLYPH.height - b.top - b.height / 2],
        [GLYPH.width - b.width / 2, GLYPH.height - b.top - b.height / 2],
      ];
      const cy = p.y + b.top + b.height / 2;
      return cy + Math.max(...corners.map(([x, y]) => x * Math.sin(rad) + y * Math.cos(rad)));
    };
    expect(Math.max(...pieces(el).map(p => boxBottom(pose(p))))).toBeGreaterThan(FLOOR + 2);
  });

  it('takes the whole box as the body of an inline element, and of a glyph without metrics', async () => {
    metrics.actualBoundingBoxAscent = 8;
    metrics.actualBoundingBoxDescent = 0;
    const fixture = await render(InlineHost);
    const el = target(fixture);
    click(el);
    const origins = pieces(el).map(p => p.style.transformOrigin);
    // 'G', 'o', 'home', 'n', 'o', 'w': the chip is the third piece.
    expect(origins[2]).toBe('5px 10px');
    expect(origins[0]).toBe('5px 11px');
    fixture.destroy();
    TestBed.resetTestingModule();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const plain = await render(Host);
    const text = target(plain);
    click(text);
    for (const piece of pieces(text)) expect(piece.style.transformOrigin).toBe('5px 10px');
  });

  it('piles letters on one another: a later letter in a column sits on the earlier one or slides clear, never inside it', async () => {
    layout.lines = true;
    const fixture = await render(Host);
    const el = target(fixture);
    settle(el);

    const boxes = pieces(el).map(p => aabb(pose(p)));
    // Twelve letters start in three columns, four to a column, and every one
    // comes to rest: on the floor, on another, or slid clear along one.
    expect(boxes.every(b => b.bottom <= FLOOR + 0.01)).toBe(true);
    expect(boxes.some(b => b.bottom > FLOOR - 0.01)).toBe(true);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = 0; j < boxes.length; j++) {
        if (i === j) continue;
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        if (overlapX <= 0.01) continue;
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        expect(overlapY, `pieces ${i} and ${j} interpenetrate`).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it('springs every letter back to its place on a second click, in a short stagger, and puts the same nodes back', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const nodes = Array.from(el.childNodes);
    click(el);
    const home = pieces(el).map(p => p.style.transform);
    let now = run(600);
    expect(frames.pending).toBe(0);

    click(el);
    expect(frames.pending).toBe(1);
    frames.at(now);
    let last = pieces(el).map(p => p.style.transform);
    let highest = Infinity;
    const started = now;
    while (frames.pending > 0 && now - started < 10_000) {
      now += FRAME;
      frames.at(now);
      const current = pieces(el);
      if (current.length === 0) break;
      last = current.map(p => p.style.transform);
      for (const p of current) highest = Math.min(highest, pose(p).y);
    }

    // Home: the frame before the restoring one has each piece within a pixel of where it started (that
    // one paints the exact place and puts the line back in the same tick), then the line is whole again.
    last.forEach((transform, i) => {
      const was = pose({ style: { transform } } as HTMLElement);
      const now = pose({ style: { transform: home[i] } } as HTMLElement);
      expect(Math.abs(was.x - now.x)).toBeLessThan(1);
      expect(Math.abs(was.y - now.y)).toBeLessThan(1);
      expect(Math.abs(was.angle - now.angle)).toBeLessThan(1);
    });
    // Springy: the letters passed above the line on the way.
    expect(highest).toBeLessThan(-5);
    // Within the flight plus the stagger, and not before the flight itself.
    expect(now - started).toBeGreaterThanOrEqual(RETURN);
    expect(now - started).toBeLessThan(RETURN + RETURN_SPREAD + 3 * FRAME);
    expect(pieces(el)).toHaveLength(0);
    expect(layer(el)).toBeNull();
    expect(wrapper(el)).toBeNull();
    expect(out(el)).toBe(false);
    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(el.textContent).toBe('Héllo wörld 😀!');
    expect(frames.pending).toBe(0);
  });

  it('springs back on its own after the rest time', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const now = settle(el);

    vi.advanceTimersByTime(FALLING_LETTERS_REST - 1);
    expect(frames.pending).toBe(0);
    expect(out(el)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(frames.pending).toBe(1);
    run(600, now);
    expect(out(el)).toBe(false);
    expect(pieces(el)).toHaveLength(0);
  });

  it('reads the rest time and the floor from the inputs', async () => {
    const fixture = await render(FloorHost);
    const el = target(fixture);
    const now = settle(el);

    const bottoms = pieces(el).map(p => aabb(pose(p)).bottom);
    const floor = ARENA.top + ARENA.height - EL.top;
    expect(Math.max(...bottoms)).toBeGreaterThan(floor - 0.01);
    expect(Math.max(...bottoms)).toBeLessThanOrEqual(floor + 0.01);

    vi.advanceTimersByTime(999);
    expect(frames.pending).toBe(0);
    vi.advanceTimersByTime(1);
    expect(frames.pending).toBe(1);
    run(600, now);
    expect(out(el)).toBe(false);
  });

  it('springs back from mid-air when clicked during the fall', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    frames.at(0);
    const now = run(12);
    const falling = pieces(el).map(p => pose(p));
    expect(falling.some(p => p.y > 0)).toBe(true);
    expect(falling.every(p => aabb(p).bottom < FLOOR)).toBe(true);

    click(el);
    run(600, now);
    expect(out(el)).toBe(false);
    expect(pieces(el)).toHaveLength(0);
    expect(frames.pending).toBe(0);
  });

  it('ignores a click during the flight back', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const now = settle(el);
    click(el);
    frames.at(now);
    frames.at(now + FRAME);
    const before = pieces(el).map(p => p.style.transform);

    click(el);
    expect(pieces(el).map(p => p.style.transform)).toEqual(before);
    expect(frames.pending).toBe(1);
  });

  it('pauses where it is while the document is hidden and resumes from there', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    click(el);
    frames.at(0);
    const now = run(20);
    const paused = pieces(el).map(p => p.style.transform);

    page.pageVisible.set(false);
    fixture.detectChanges();
    expect(frames.cancel).toHaveBeenCalled();
    expect(frames.pending).toBe(0);
    expect(pieces(el).map(p => p.style.transform)).toEqual(paused);

    page.pageVisible.set(true);
    fixture.detectChanges();
    expect(frames.pending).toBe(1);
    // The first frame back has no length: a minute away moved nothing.
    frames.at(now + 60_000);
    expect(pieces(el).map(p => p.style.transform)).toEqual(paused);
    frames.at(now + 60_000 + FRAME);
    expect(pieces(el).map(p => p.style.transform)).not.toEqual(paused);
  });

  it('puts the text back at once when motion is reduced mid-fall, and does nothing under reduced motion', async () => {
    const page = stub();
    const fixture = await render(Host, [platform(page)]);
    const el = target(fixture);
    const nodes = Array.from(el.childNodes);
    click(el);
    frames.at(0);
    run(10);
    expect(out(el)).toBe(true);

    page.prefersReducedMotion.set(true);
    fixture.detectChanges();
    expect(out(el)).toBe(false);
    expect(pieces(el)).toHaveLength(0);
    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(frames.pending).toBe(0);

    click(el);
    expect(pieces(el)).toHaveLength(0);
    expect(frames.pending).toBe(0);
  });

  it('does nothing under reduced motion from the start', async () => {
    const fixture = await render(Host, [platform(stub(true))]);
    const el = target(fixture);

    click(el);
    expect(el.children).toHaveLength(0);
    expect(frames.pending).toBe(0);
  });

  it('does nothing on the server', async () => {
    const fixture = await render(Host, [{ provide: PLATFORM_ID, useValue: 'server' }]);
    const el = target(fixture);

    expect(el.classList.contains('wr-falling-letters')).toBe(false);
    click(el);
    expect(el.children).toHaveLength(0);
    expect(frames.pending).toBe(0);
  });

  it('does nothing when the target has no box', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rectOf(document.body));

    click(el);
    expect(el.children).toHaveLength(0);
    expect(out(el)).toBe(false);
    expect(frames.pending).toBe(0);
  });

  it('targets one descendant of a box-less host by selector, and leaves the rest alone', async () => {
    const fixture = await render(TargetHost);
    const desc = target(fixture, '.desc');
    const title = target(fixture, '.title');
    const button = target(fixture, 'button');

    expect(desc.classList.contains('wr-falling-letters')).toBe(true);
    expect(title.classList.contains('wr-falling-letters')).toBe(false);

    click(button);
    click(title);
    expect(pieces(desc)).toHaveLength(0);

    click(desc);
    expect(
      pieces(desc)
        .map(p => p.textContent)
        .join('')
    ).toBe('Nothinghere');
    expect(title.children).toHaveLength(0);
    // The floor is the host's parent, the box around the wrapper, not the wrapper itself.
    frames.at(0);
    run(600);
    expect(frames.pending).toBe(0);
    expect(Math.max(...pieces(desc).map(p => aabb(pose(p)).bottom))).toBeGreaterThan(FLOOR - 0.01);
  });

  it('does nothing when the selector matches nothing', async () => {
    const fixture = await render(MissingHost);
    const desc = target(fixture, '.desc');
    expect(desc.classList.contains('wr-falling-letters')).toBe(false);

    click(desc);
    expect(desc.children).toHaveLength(0);
    expect(frames.pending).toBe(0);
  });

  it('moves an inline element as one piece and puts the same element back', async () => {
    const fixture = await render(InlineHost);
    const el = target(fixture);
    const code = el.querySelector('code')!;
    const nodes = Array.from(el.childNodes);

    click(el);
    expect(pieces(el).map(p => p.textContent)).toEqual(['G', 'o', 'home', 'n', 'o', 'w']);
    expect(pieces(el)[2].firstElementChild?.tagName).toBe('CODE');
    expect(pieces(el)[2].firstElementChild).not.toBe(code);
    expect(wrapper(el)!.contains(code)).toBe(true);

    run(600);
    click(el);
    run(600, 10_000);
    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(el.querySelector('code')).toBe(code);
  });

  it('keeps a binding live inside the line while the letters are out', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    click(el);
    frames.at(0);
    run(10);

    fixture.componentInstance.text.set('Changed');
    fixture.detectChanges();

    expect(wrapper(el)!.textContent).toBe('Changed');
    expect(out(el)).toBe(true);
    click(el);
    run(600, 10_000);
    expect(el.textContent).toBe('Changed');
  });

  it('puts the text back, cancels the loop and drops the listener on destroy mid-fall', async () => {
    const fixture = await render(Host);
    const el = target(fixture);
    const nodes = Array.from(el.childNodes);
    click(el);
    frames.at(0);
    run(10);
    expect(out(el)).toBe(true);

    fixture.destroy();

    expect(frames.cancel).toHaveBeenCalled();
    expect(frames.pending).toBe(0);
    expect(pieces(el)).toHaveLength(0);
    expect(Array.from(el.childNodes)).toEqual(nodes);
    expect(el.className).toBe('');
    click(el);
    expect(el.children).toHaveLength(0);
    expect(frames.pending).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(frames.pending).toBe(0);
  });
});
