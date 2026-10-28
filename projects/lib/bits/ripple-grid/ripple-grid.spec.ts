import { Component, ErrorHandler, PLATFORM_ID, type Type, ViewEncapsulation, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrRippleGrid } from './ripple-grid';

@Component({
  imports: [WrRippleGrid],
  template: `
    <div class="stage">
      <wr-ripple-grid
        [cellSize]="cellSize()"
        [lineWidth]="lineWidth()"
        [lineColor]="lineColor()"
        [rippleColor]="rippleColor()"
        [strength]="strength()"
        [speed]="speed()"
        [decay]="decay()"
        [rippleOnMove]="rippleOnMove()"
        [idleInterval]="idleInterval()"
      />
      <p class="copy">Copy in front of the grid</p>
    </div>
  `,
})
class Host {
  readonly cellSize = signal(40);
  readonly lineWidth = signal(1);
  readonly lineColor = signal<string | null>(null);
  readonly rippleColor = signal<string | null>(null);
  readonly strength = signal(10);
  readonly speed = signal(320);
  readonly decay = signal(1.4);
  readonly rippleOnMove = signal(true);
  readonly idleInterval = signal(0);
}

/** The grid as the first child of a shadow root, where it has no parent element. */
@Component({
  selector: 'wr-ripple-grid-shadow-host',
  imports: [WrRippleGrid],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `<wr-ripple-grid />
    <p class="copy">Copy in front of the grid</p>`,
})
class ShadowHost {}

/** A 60 Hz frame, in ms. */
const FRAME = 1000 / 60;

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * Grid lines on a 2D canvas, bent by rings the pointer sends out. jsdom refuses the
 * context, which is the first state this spec is for: `getContext('2d')` returning null
 * is a real browser answer, and the component has to put its canvas up and stop rather
 * than throw. What makes that readable is `.wr-ripple-grid--painted`, which retires the
 * CSS stand-in grid only once the canvas has real pixels — its absence is the
 * null-context path holding.
 *
 * Everything else needs a context, so those tests mount `withContext()`: a recording 2D
 * context that keeps every frame as the strokes it made, each with its colour, alpha,
 * width and the polylines (`moveTo` / `lineTo` points) in its path. The first stroke of
 * a frame is the grid itself, one polyline per line; the rest are the lit stretches, one
 * stroke per alpha step. That is the whole of what a spec can see this component draw,
 * and it is enough: a line no ring reaches is two points, a line a ring bends is many,
 * and which way it bends is the sign of its largest departure from its own position.
 * Every line sits where its stroke's edges fall on whole bitmap pixels, so at 1x a 1px
 * line is half a pixel off its cell: `line()` finds the one within a pixel of a position.
 * `bend()` reads a line's first point as its own position, which holds while no ring's
 * band reaches past the margin to the line's end — true wherever these specs read a bend.
 *
 * `boot()` runs from `afterNextRender`, and what it throws never reaches
 * `detectChanges()` or `whenStable()` — Angular reports it to the `ErrorHandler` and
 * the fixture carries on — so every mount installs a recorder and the tests read it.
 */

interface Stroke {
  readonly color: string;
  readonly alpha: number;
  readonly width: number;
  /** One flat `[x, y, x, y, …]` polyline per subpath. */
  readonly paths: readonly (readonly number[])[];
}

/** Everything `boot()` threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** One entry per pass of the draw — opened by its `clearRect` — holding the strokes it made. */
let drawn: Stroke[][];
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;
/** The callback the component gave its resize observer, for the spec to deliver entries through. */
let observed: ResizeObserverCallback | null;
/** Timers of 500 ms or more — only the idle ring asks for one — held rather than fired, by id. */
let timers: Map<number, { handler: () => void; delay: number }>;

/**
 * A 2D context that records what it was asked to stroke, and nothing more.
 *
 * `clearRect` opens a pass, `beginPath` starts a path, `moveTo` a polyline in it and
 * `lineTo` a point on that polyline, and `stroke` closes the path with the
 * `strokeStyle`, `globalAlpha` and `lineWidth` the component had just assigned.
 * Anything else travels into a no-op. jsdom also has no `ResizeObserver`, which
 * `boot()` installs right after the context, so the spec supplies the smallest one it
 * can disconnect, and keeps its callback so `resized()` can deliver an entry.
 */
const withContext = (): void => {
  let paths: number[][] = [];
  const ctx: Record<string, unknown> = {
    strokeStyle: '#000',
    globalAlpha: 1,
    lineWidth: 1,
    clearRect: () => {
      drawn.push([]);
    },
    beginPath: () => {
      paths = [];
    },
    moveTo: (x: number, y: number) => {
      paths.push([x, y]);
    },
    lineTo: (x: number, y: number) => {
      paths.at(-1)!.push(x, y);
    },
    stroke: () => {
      drawn.at(-1)!.push({
        color: String(ctx['strokeStyle']),
        alpha: Number(ctx['globalAlpha']),
        width: Number(ctx['lineWidth']),
        paths,
      });
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

  // Frames are held, not fired: whether one was SCHEDULED is the difference
  // between a loop that sleeps and one that does not, and running them by hand
  // keeps that off the clock. Angular's scheduler races rAF against a
  // `setTimeout`, so holding the frame does not stall the fixture.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => frames.push(frame));
};

/**
 * Hold every timer of 500 ms or more, by id, and let the rest run: Angular's own
 * scheduler and the spec's `setTimeout(resolve)` ask for 0 ms, while the idle ring is
 * never armed for less than 500.
 */
const holdTimers = (): void => {
  const realSet = window.setTimeout.bind(window);
  const realClear = window.clearTimeout.bind(window);
  let lastId = 1_000_000;
  vi.spyOn(window, 'setTimeout').mockImplementation(((handler: () => void, delay = 0, ...args: unknown[]) => {
    if (delay < 500) return realSet(handler, delay, ...args);
    timers.set(++lastId, { handler, delay });
    return lastId;
  }) as never);
  vi.spyOn(window, 'clearTimeout').mockImplementation(((id?: number) => {
    if (id !== undefined && timers.has(id)) timers.delete(id);
    else realClear(id);
  }) as never);
};

/** Fire every held timer once. */
const fireTimers = (): void => {
  const pending = [...timers.values()];
  timers.clear();
  for (const timer of pending) timer.handler();
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

/** Run every frame the page is currently holding, once, stamped `time`. */
const runFrame = (time = 16): void => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(time);
};

/** Run `count` frames, each one 60 Hz frame after the one before. */
const runFrames = (count: number): void => {
  for (let i = 0; i < count; i++) runFrame();
};

/** Run frames until one paints nothing; returns how many painted. Fails rather than spin forever. */
const settle = (): number => {
  for (let ran = 0; ran < 1000; ran++) {
    const before = drawn.length;
    runFrame();
    if (drawn.length === before) return ran;
  }
  throw new Error('the ripple grid never stopped asking for frames');
};

/** Whether a polyline runs top to bottom rather than left to right: its ends are a line's length apart. */
const isVertical = (path: readonly number[]): boolean =>
  Math.abs(path.at(-2)! - path[0]) < Math.abs(path.at(-1)! - path[1]);

/** The vertical line within a pixel of `x = at`, or the horizontal one within a pixel of `y = at`. */
const line = (stroke: Stroke, at: number, vertical = true): readonly number[] => {
  const found = stroke.paths.find(path => isVertical(path) === vertical && Math.abs(path[vertical ? 0 : 1] - at) <= 1);
  if (!found) throw new Error(`no ${vertical ? 'vertical' : 'horizontal'} line at ${at}`);
  return found;
};

/** A line's largest departure from its own position, across it, with its sign. */
const bend = (path: readonly number[]): number => {
  const vertical = isVertical(path);
  const home = path[vertical ? 0 : 1];
  let most = 0;
  for (let i = vertical ? 0 : 1; i < path.length; i += 2) {
    if (Math.abs(path[i] - home) > Math.abs(most)) most = path[i] - home;
  }
  return most;
};

/** Every line in the stroke drawn as its two ends alone, which is what a line no ring reaches is. */
const allStraight = (stroke: Stroke): boolean => stroke.paths.every(path => path.length === 4);

/** Every line in the stroke on its own position, however many points it was drawn through. */
const allFlat = (stroke: Stroke): boolean => stroke.paths.every(path => bend(path) === 0);

/** The positions of the vertical lines in a grid stroke, in order. */
const columns = (stroke: Stroke): number[] =>
  stroke.paths
    .filter(isVertical)
    .map(path => path[0])
    .sort((a, b) => a - b);

/** The largest departure of any line in the stroke from its own position. */
const mostBent = (stroke: Stroke): number => Math.max(...stroke.paths.map(path => Math.abs(bend(path))));

/** Point `k` of a line as `[along, across]`: y then x for a vertical line, x then y for a horizontal one. */
const at = (path: readonly number[], k: number, vertical: boolean): [number, number] =>
  vertical ? [path[2 * k + 1], path[2 * k]] : [path[2 * k], path[2 * k + 1]];

/** Where a line that never runs back crosses `along`, across itself, between the two points either side. */
const acrossAt = (path: readonly number[], along: number, vertical: boolean): number => {
  const points = path.length / 2;
  for (let k = 1; k < points; k++) {
    const [a1, c1] = at(path, k, vertical);
    if (a1 < along && k < points - 1) continue;
    const [a0, c0] = at(path, k - 1, vertical);
    return a1 === a0 ? c1 : c0 + ((along - a0) / (a1 - a0)) * (c1 - c0);
  }
  return at(path, 0, vertical)[1];
};

/**
 * What folds in a grid stroke, or `null` when nothing does: a line that runs back
 * along itself between two of its points, or two neighbouring parallel lines that
 * cross, checked at every point of either.
 */
const folds = (stroke: Stroke): string | null => {
  for (const vertical of [true, false]) {
    const lines = stroke.paths
      .filter(path => isVertical(path) === vertical)
      .sort((a, b) => a[vertical ? 0 : 1] - b[vertical ? 0 : 1]);
    for (const path of lines) {
      for (let k = 1; k < path.length / 2; k++) {
        if (at(path, k, vertical)[0] < at(path, k - 1, vertical)[0]) {
          return `the line at ${path[vertical ? 0 : 1]} runs back at point ${k}`;
        }
      }
    }
    for (let i = 1; i < lines.length; i++) {
      const [before, after] = [lines[i - 1], lines[i]];
      for (const path of [before, after]) {
        for (let k = 0; k < path.length / 2; k++) {
          const along = at(path, k, vertical)[0];
          if (acrossAt(before, along, vertical) >= acrossAt(after, along, vertical)) {
            return `the lines at ${before[vertical ? 0 : 1]} and ${after[vertical ? 0 : 1]} cross at ${along}`;
          }
        }
      }
    }
  }
  return null;
};

describe('WrRippleGrid', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const canvas = (): HTMLCanvasElement | null => root().querySelector('canvas');
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('wr-ripple-grid')!;
  const stage = (): HTMLElement => root().querySelector<HTMLElement>('.stage')!;
  const copy = (): HTMLElement => root().querySelector<HTMLElement>('.copy')!;
  const pointer = (type: string, target: Element, x = 0, y = 0): void => {
    target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true }));
  };
  const set = async (apply: (host: Host) => void): Promise<void> => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const mount = async (providers: unknown[] = [], component: Type<unknown> = Host): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => thrown.push(error) } },
        ...providers,
      ] as never[],
    });
    // Only the shadow-root spec mounts another host, and it reads no input off it.
    fixture = TestBed.createComponent(component) as ComponentFixture<Host>;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    thrown = [];
    drawn = [];
    frames = [];
    disconnects = 0;
    observed = null;
    timers = new Map();
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
    expect(grid().hasAttribute('role')).toBe(false);
    expect(grid().hasAttribute('tabindex')).toBe(false);
    expect(grid().querySelector('[tabindex], a, button, input')).toBeNull();
  });

  it('survives a browser that will not give it a 2d context', () => {
    // Stopped quietly — asked of the handler, the only place an `afterNextRender`
    // failure is reported — with the stand-in still up, since nothing painted.
    expect(thrown).toEqual([]);
    expect(canvas()).not.toBeNull();
    expect(grid().classList.contains('wr-ripple-grid--painted')).toBe(false);
  });

  it('takes input changes and a pointer without reaching for a context it never got', async () => {
    await set(host => {
      host.cellSize.set(60);
      host.lineColor.set('rgb(1, 2, 3)');
      host.idleInterval.set(1000);
      host.rippleOnMove.set(false);
    });
    pointer('pointerdown', stage(), 10, 10);
    pointer('pointermove', stage(), 90, 10);

    expect(thrown).toEqual([]);
    expect(grid().classList.contains('wr-ripple-grid--painted')).toBe(false);
  });

  it('renders on the server without drawing, with the stand-in published', async () => {
    // A context and a box, so only the platform guard keeps it from booting.
    withContext();
    box(240, 240);
    await mount([{ provide: PLATFORM_ID, useValue: 'server' }]);
    runFrame();
    runFrame();
    fixture.detectChanges();

    expect(drawn, 'no frame drawn and no observer installed').toEqual([]);
    expect(observed).toBeNull();
    expect(canvas()).not.toBeNull();
    expect(grid().classList.contains('wr-ripple-grid--painted')).toBe(false);
    expect(grid().style.getPropertyValue('--wr-ripple-grid-cell-size')).toBe('40px');
    expect(grid().style.getPropertyValue('--wr-ripple-grid-line-width')).toBe('1px');
    expect(thrown).toEqual([]);
  });

  it('publishes the cell, the width and an explicit colour for the stand-in', async () => {
    await set(host => {
      host.cellSize.set(4);
      host.lineWidth.set(0);
      host.lineColor.set('rgb(1, 2, 3)');
    });

    // Floored where the canvas floors them, so the two agree.
    expect(grid().style.getPropertyValue('--wr-ripple-grid-cell-size')).toBe('12px');
    expect(grid().style.getPropertyValue('--wr-ripple-grid-line-width')).toBe('0.25px');
    expect(grid().style.getPropertyValue('--wr-ripple-grid-line-color')).toBe('rgb(1, 2, 3)');

    // An expression built on the hook would be a cycle written onto the hook itself,
    // and unset, the hook is the stylesheet's again.
    await set(host => host.lineColor.set('color-mix(in srgb, var(--wr-ripple-grid-line-color) 50%, transparent)'));
    expect(grid().style.getPropertyValue('--wr-ripple-grid-line-color')).toBe('');
    await set(host => host.lineColor.set(null));
    expect(grid().style.getPropertyValue('--wr-ripple-grid-line-color')).toBe('');
  });

  it('draws the resting grid, a cell centred on the box, then asks for no more frames', async () => {
    withContext();
    box(240, 240);
    await mount();

    expect(drawn.length, 'nothing is drawn inside boot() itself').toBe(0);
    runFrame();
    fixture.detectChanges();

    expect(drawn.length).toBe(1);
    expect(grid().classList.contains('wr-ripple-grid--painted')).toBe(true);
    expect(drawn[0].length, 'nothing is lit with no ring').toBe(1);
    const [base] = drawn[0];
    expect(base.width).toBe(1);
    // A cell centred on the box — lines at 100 and 140, none at 120 — each moved half
    // a pixel so a 1px stroke covers one whole pixel rather than two at half alpha,
    // and every line straight, past both edges, so a bend never pulls an end into view.
    expect(columns(base)).toEqual([-59.5, -19.5, 20.5, 60.5, 100.5, 140.5, 180.5, 220.5, 260.5, 300.5]);
    expect(base.paths.length).toBe(20);
    expect(allStraight(base)).toBe(true);
    const [x0, y0, x1, y1] = line(base, 100);
    expect([x0, x1]).toEqual([100.5, 100.5]);
    expect(y0).toBeLessThan(-40);
    expect(y1).toBeGreaterThan(280);

    // Nothing moves, so the loop sleeps rather than redrawing a still grid.
    runFrame();
    runFrame();
    expect(drawn.length).toBe(1);
  });

  it('leaves an empty or blank colour to the hooks, as it does an unset one', async () => {
    withContext();
    box(480, 480);
    await mount();
    grid().style.setProperty('--wr-ripple-grid-line-color', 'rgb(1, 2, 3)');
    grid().style.setProperty('--wr-ripple-grid-ripple-color', 'rgb(4, 5, 6)');
    // An empty form value or a bare attribute: not the hard-coded fallback, which is
    // a light grey that would draw a bright grid on a dark surface.
    await set(host => {
      host.lineColor.set('');
      host.rippleColor.set('  ');
    });
    runFrame();

    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    const [base, ...lit] = drawn.at(-1)!;
    expect(base.color).toBe('rgb(1, 2, 3)');
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every(stroke => stroke.color === 'rgb(4, 5, 6)')).toBe(true);
  });

  it('paints with the colours resolved from their tokens against the host', async () => {
    withContext();
    box(240, 240);
    await mount();
    // The theme declares tokens with `light-dark()`, which no canvas reads.
    // jsdom resolves the light half, as a browser does with no dark scheme.
    grid().style.setProperty('--wr-ripple-grid-line-color', 'light-dark(rgb(1, 2, 3), rgb(4, 5, 6))');
    grid().style.setProperty('--wr-color-success', 'rgb(0, 128, 0)');
    await set(host => host.rippleColor.set('var(--wr-color-success)'));

    runFrame();
    expect(drawn.at(-1)![0].color).toBe('rgb(1, 2, 3)');

    pointer('pointerdown', stage(), 120, 120);
    runFrames(6);

    const lit = drawn.at(-1)!.slice(1);
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every(stroke => stroke.color === 'rgb(0, 128, 0)')).toBe(true);
  });

  it('sends a ring out from a press that bends the lines near it outward and lights them', async () => {
    withContext();
    box(480, 480);
    await mount();
    grid().style.setProperty('--wr-ripple-grid-ripple-color', 'rgb(9, 9, 9)');
    runFrame();

    // Over the copy in front of the canvas, not over the canvas: the event reaches
    // the parent by bubbling, which is the only way it can reach the grid.
    pointer('pointerdown', copy(), 240, 240);
    // The frame that places the ring, then 100 ms: the crest 32px out.
    runFrames(7);

    const [base, ...lit] = drawn.at(-1)!;
    // Away from where it started: the line right of the press goes right, the one
    // left of it left, the one below it down.
    expect(bend(line(base, 260))).toBeGreaterThan(2);
    expect(bend(line(base, 220))).toBeLessThan(-2);
    expect(bend(line(base, 260, false))).toBeGreaterThan(2);
    // A line the ring cannot reach yet is still its two ends.
    expect(line(base, 460)).toHaveLength(4);
    // And lit, in the ripple colour, more strongly at the crest than at its edges.
    expect(lit.length).toBeGreaterThan(1);
    expect(lit.every(stroke => stroke.color === 'rgb(9, 9, 9)')).toBe(true);
    expect(lit.at(-1)!.alpha).toBeGreaterThan(lit[0].alpha);
  });

  it('travels outward and fades, then leaves the grid straight and falls asleep', async () => {
    withContext();
    box(480, 480);
    await mount();
    runFrame();

    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    const early = bend(line(drawn.at(-1)![0], 260));
    // By 500 ms the crest is 160px out: the near line is behind it, the far one bent.
    runFrames(24);
    const later = drawn.at(-1)![0];
    expect(Math.abs(bend(line(later, 260)))).toBeLessThan(early);
    expect(bend(line(later, 380))).toBeGreaterThan(0.5);
    // Faded on the way: the crest bends the far line less than it bent the near one.
    expect(bend(line(later, 380))).toBeLessThan(early);

    expect(settle()).toBeGreaterThan(10);
    const [base, ...lit] = drawn.at(-1)!;
    expect(allStraight(base)).toBe(true);
    expect(lit).toEqual([]);
    const asleep = drawn.length;
    runFrame();
    expect(drawn.length).toBe(asleep);
  });

  it('only lights the lines when strength is 0, and bends them inward when it is negative', async () => {
    withContext();
    box(480, 480);
    await mount();
    await set(host => host.strength.set(0));
    runFrame();

    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    // Sampled, since the lit stretches follow the ring, and every point on its line.
    expect(allStraight(drawn.at(-1)![0])).toBe(false);
    expect(allFlat(drawn.at(-1)![0])).toBe(true);
    expect(drawn.at(-1)!.length).toBeGreaterThan(1);

    settle();
    await set(host => host.strength.set(-10));
    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    expect(bend(line(drawn.at(-1)![0], 260))).toBeLessThan(-2);
  });

  it('leaves softer rings behind a moving pointer, one per stretch it travels', async () => {
    withContext();
    box(480, 480);
    await mount();
    runFrame();

    // The first move only marks where the pointer came in, and a short one after it
    // is under the spacing: neither sends a ring, so the loop stays asleep.
    pointer('pointermove', stage(), 80, 240);
    pointer('pointermove', stage(), 150, 240);
    runFrame();
    expect(drawn.length).toBe(1);

    // Two cells from the mark: a ring, where the pointer is now.
    pointer('pointermove', stage(), 160, 240);
    runFrames(7);
    const moved = bend(line(drawn.at(-1)![0], 180));
    expect(moved).toBeGreaterThan(1);
    settle();

    // 40% as strong as a press, at the same age and distance.
    pointer('pointerdown', stage(), 160, 240);
    runFrames(7);
    expect(moved / bend(line(drawn.at(-1)![0], 180))).toBeCloseTo(0.4, 5);
    settle();

    // Leaving forgets the mark, so coming back in somewhere else is not a stretch travelled.
    pointer('pointerleave', stage());
    const asleep = drawn.length;
    pointer('pointermove', stage(), 400, 400);
    runFrame();
    expect(drawn.length).toBe(asleep);
  });

  it('ripples only for a press, and listens for no move, when rippleOnMove is off', async () => {
    withContext();
    box(480, 480);
    await mount();
    runFrame();
    const listen = vi.spyOn(stage(), 'addEventListener');
    await set(host => host.rippleOnMove.set(false));
    runFrame();

    // Passive: a background must never hold up a scroll or a tap waiting on its listener.
    expect(listen).toHaveBeenCalledWith('pointerdown', expect.any(Function), { passive: true });
    expect(listen).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything());
    const asleep = drawn.length;
    pointer('pointermove', stage(), 100, 240);
    pointer('pointermove', stage(), 300, 240);
    runFrame();
    expect(drawn.length).toBe(asleep);

    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    expect(bend(line(drawn.at(-1)![0], 260))).toBeGreaterThan(2);
  });

  it('sends a ring out from the centre every idleInterval, and none by default', async () => {
    withContext();
    holdTimers();
    box(480, 480);
    await mount();
    runFrame();
    expect(timers.size, 'no idle ring by default').toBe(0);

    // Floored at 500 ms.
    await set(host => host.idleInterval.set(200));
    expect([...timers.values()].map(timer => timer.delay)).toEqual([500]);
    await set(host => host.idleInterval.set(1000));
    expect([...timers.values()].map(timer => timer.delay)).toEqual([1000]);

    fireTimers();
    // The next one is armed by the frame that places this ring, not by the timer:
    // a background tab with no frames must not queue one per interval.
    expect(timers.size).toBe(0);
    runFrames(7);
    expect(timers.size).toBe(1);
    const base = drawn.at(-1)![0];
    // Around the centre, both ways, softer than a press.
    expect(bend(line(base, 260))).toBeGreaterThan(1);
    expect(bend(line(base, 220))).toBeLessThan(-1);
    expect(bend(line(base, 260))).toBeLessThan(5);

    // Between rings, the loop sleeps until the timer brings the next one.
    settle();
    const asleep = drawn.length;
    runFrame();
    expect(drawn.length).toBe(asleep);
    fireTimers();
    runFrame();
    expect(drawn.length).toBe(asleep + 1);
  });

  it('draws one still grid, and follows no pointer and keeps no timer, for someone who asked for less motion', async () => {
    const listen = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    withContext();
    holdTimers();
    box(240, 240);
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    await set(host => host.idleInterval.set(1000));

    expect(drawn.length).toBeGreaterThan(0);
    expect(grid().classList.contains('wr-ripple-grid--painted')).toBe(true);
    expect(listen).not.toHaveBeenCalledWith('pointerdown', expect.any(Function), expect.anything());
    expect(listen).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything());
    expect(timers.size).toBe(0);

    const still = drawn.length;
    pointer('pointerdown', stage(), 120, 120);
    runFrame();
    runFrame();

    expect(drawn.length).toBe(still);
    expect(drawn.at(-1)!.length, 'nothing is lit').toBe(1);
    expect(allStraight(drawn.at(-1)![0])).toBe(true);
  });

  it('redraws the still grid in the new colour when the scheme switches', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    // jsdom resolves every `light-dark()` to its light half, so the switch is
    // staged on the hook: the new value is in place BEFORE the scheme moves, and
    // only the scheme switch may bring it to the canvas.
    grid().style.setProperty('--wr-ripple-grid-line-color', 'rgb(255, 0, 0)');
    runFrame();
    expect(drawn.length, 'a still grid schedules nothing on its own').toBe(1);

    document.documentElement.style.colorScheme = 'dark';
    try {
      await new Promise(resolve => setTimeout(resolve));

      expect(drawn.length).toBe(2);
      expect(drawn.at(-1)![0].color).toBe('rgb(255, 0, 0)');
    } finally {
      document.documentElement.style.removeProperty('color-scheme');
    }
  });

  it('wakes a sleeping loop to repaint when the scheme switches', async () => {
    withContext();
    await mount();
    runFrame();
    grid().style.setProperty('--wr-ripple-grid-line-color', 'rgb(0, 0, 255)');
    runFrame();
    expect(drawn.length, 'asleep, the new hook value has not been drawn').toBe(1);

    document.documentElement.style.colorScheme = 'dark';
    try {
      await new Promise(resolve => setTimeout(resolve));
      runFrame();

      expect(drawn.length).toBe(2);
      expect(drawn.at(-1)![0].color).toBe('rgb(0, 0, 255)');
    } finally {
      document.documentElement.style.removeProperty('color-scheme');
    }
  });

  it('repaints when an input changes, and lays the grid out again for a new cell', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();

    await set(host => {
      host.lineColor.set('rgb(7, 7, 7)');
      host.lineWidth.set(2);
      host.cellSize.set(60);
    });
    runFrame();

    const [base] = drawn.at(-1)!;
    expect(base.color).toBe('rgb(7, 7, 7)');
    expect(base.width).toBe(2);
    expect(columns(base)).toContain(150);
    expect(columns(base)).not.toContain(140);
  });

  it('follows reduced motion switched on and off while the page is open', async () => {
    const reduce = signal(false);
    withContext();
    box(480, 480);
    await mount([{ provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: reduce } }]);
    runFrame();
    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    expect(allStraight(drawn.at(-1)![0]), 'bent while motion is allowed').toBe(false);

    // Switched on: the listeners go, the ring in flight is dropped, and one still,
    // straight grid is drawn.
    const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
    reduce.set(true);
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(allStraight(drawn.at(-1)![0])).toBe(true);
    expect(drawn.at(-1)!.length).toBe(1);
    const still = drawn.length;
    // The frame the loop had asked for was cancelled; this mock cannot withdraw it.
    frames = [];
    pointer('pointerdown', stage(), 240, 240);
    runFrame();
    expect(drawn.length).toBe(still);

    // And off again: a press ripples once more.
    reduce.set(false);
    await fixture.whenStable();
    runFrame();
    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    expect(allStraight(drawn.at(-1)![0])).toBe(false);
  });

  it('asks for no frames and keeps no timer off screen, and picks up where it left off in view', async () => {
    withContext();
    holdTimers();
    box(240, 240);
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
          report = null;
        }
      }
    );
    // Frames by id, so a cancelled one is really withdrawn.
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
    await set(host => host.idleInterval.set(1000));

    flush();
    expect(drawn.length, 'nothing is drawn before the observer says the grid is in view').toBe(0);
    expect(timers.size, 'and no idle ring is armed').toBe(0);

    report!([{ isIntersecting: true }]);
    flush();
    expect(drawn.length).toBe(1);
    expect(timers.size).toBe(1);

    pointer('pointerdown', stage(), 120, 120);
    report!([{ isIntersecting: false }]);
    flush();
    expect(drawn.length, 'off screen, the frame the press asked for is withdrawn').toBe(1);
    expect(timers.size, 'and the idle timer cleared').toBe(0);
    pointer('pointerdown', stage(), 60, 60);
    expect(held.size, 'a press off screen asks for nothing').toBe(0);

    report!([{ isIntersecting: true }]);
    report!([{ isIntersecting: true }]);
    flush();
    expect(drawn.length, 'one loop, not a second beside the first').toBe(2);
    // The ring is the press made in view, just placed around (120, 120); the one made
    // off screen at (60, 60) was never queued, so the line beside it is still straight.
    expect(line(drawn.at(-1)![0], 140).length).toBeGreaterThan(4);
    expect(line(drawn.at(-1)![0], 20)).toHaveLength(4);
    expect(held.size).toBe(1);
    expect(timers.size).toBe(1);
    // The timer fires and the grid leaves the screen before a frame places the ring:
    // back in view, the ring is still owed, and the next timer waits for it.
    fireTimers();
    report!([{ isIntersecting: false }]);
    report!([{ isIntersecting: true }]);
    expect(timers.size).toBe(0);
    flush();
    expect(timers.size).toBe(1);
    fixture.destroy();
    expect(report).toBeNull();
  });

  it('backs the canvas at 2x, and steps down to 1x outright on a box too large for the pixel budget', async () => {
    withContext();
    vi.stubGlobal('devicePixelRatio', 2);

    box(1280, 450);
    await mount();
    expect([canvas()!.width, canvas()!.height]).toEqual([2560, 900]);

    // 1.61x would fit the budget, and a bitmap resampled onto the screen by a fraction
    // draws neighbouring hairlines at different weights: half the screen's ratio does not.
    fixture.destroy();
    box(1728, 560);
    await mount();
    expect([canvas()!.width, canvas()!.height]).toEqual([1728, 560]);
    runFrame();
    const base = drawn.at(-1)![0];
    expect(base.width).toBe(1);
    expect(base.paths.every(path => Number.isInteger(path[isVertical(path) ? 0 : 1] - 0.5))).toBe(true);
  });

  it('puts the edges of every line on whole bitmap pixels, at the screen ratio or a whole fraction of it', async () => {
    withContext();
    // [screen ratio, the bitmap's, the stroke in bitmap pixels]: a 3x screen is backed
    // at 1.5, half of it, under the cap of 2; a 1.5x screen at its own ratio, where a
    // 1px line is 1.5 device pixels and rounds to 2.
    for (const [screen, bitmap, pixels] of [
      [1, 1, 1],
      [2, 2, 2],
      [1.5, 1.5, 2],
      [3, 1.5, 2],
    ]) {
      vi.stubGlobal('devicePixelRatio', screen);
      box(240, 240);
      drawn = [];
      await mount();
      runFrame();
      expect(canvas()!.width / 240, `backed at ${bitmap} on a ${screen}x screen`).toBe(bitmap);
      const base = drawn.at(-1)![0];
      expect(base.width * bitmap).toBeCloseTo(pixels, 9);
      for (const path of base.paths) {
        const left = path[isVertical(path) ? 0 : 1] * bitmap - pixels / 2;
        expect(Math.abs(left - Math.round(left)), `a line at ${screen}x`).toBeLessThan(1e-9);
      }
      fixture.destroy();
    }

    // Under a bitmap pixel the width is kept, so a thin line stays faint, centred in one
    // pixel: a canvas draws it as a one-pixel hairline at reduced alpha.
    vi.stubGlobal('devicePixelRatio', 1);
    drawn = [];
    await mount();
    await set(host => host.lineWidth.set(0.25));
    runFrame();
    const thin = drawn.at(-1)![0];
    expect(thin.width).toBe(0.25);
    expect(thin.paths.every(path => Number.isInteger(path[isVertical(path) ? 0 : 1] - 0.5))).toBe(true);
  });

  it('lays the grid out again for a new box, and repaints it inside the observer callback', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();
    const widths = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');

    // The observer's first entry repeats the box boot() measured: writing the
    // canvas size would clear the bitmap for nothing.
    resized(240, 240);
    expect(widths).not.toHaveBeenCalled();
    expect(drawn.length).toBe(1);

    // Entries arrive after the frame's own callbacks and before its paint, so the
    // repaint happens here and now, not in a frame that would leave this one blank.
    const asked = frames.length;
    resized(300, 240);
    expect(drawn.length).toBe(2);
    expect(frames.length, 'nothing left for a frame to do').toBe(asked);
    expect([canvas()!.width, canvas()!.height]).toEqual([300, 240]);
    // Centred on the new box, which puts the columns 10px off the old ones.
    expect(columns(drawn[1][0])).toContain(130.5);
    expect(columns(drawn[1][0])).not.toContain(140.5);
  });

  it('backs the canvas again when the pixel ratio changes, and repaints at once', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();

    // Browser zoom or a move to another screen: a window resize and no new box.
    vi.stubGlobal('devicePixelRatio', 2);
    window.dispatchEvent(new Event('resize'));
    expect([canvas()!.width, canvas()!.height]).toEqual([480, 480]);
    expect(drawn.length).toBe(2);
    expect(columns(drawn[1][0])).toContain(140);

    // Nothing changed this time, so nothing is cleared or drawn.
    window.dispatchEvent(new Event('resize'));
    expect(drawn.length).toBe(2);
  });

  it('lays the grid out in the box before transforms, and maps the pointer back through them', async () => {
    withContext();
    // A dialog scaling in from 0.96: the layout box is 1000 × 450, the rect as painted
    // 960 × 432 and centred on it. No resize observer hears of a transform.
    box(1000, 450, { left: 20, top: 9, width: 960, height: 432 });
    await mount();
    runFrame();

    expect([canvas()!.width, canvas()!.height]).toEqual([1000, 450]);
    expect(columns(drawn.at(-1)![0])).toContain(840.5);

    // Box point (860.5, 225) shows at 20 + 860.5 × 0.96 on screen. A press there is
    // midway between the lines at 840.5 and 880.5, so it bends them apart by the same amount.
    pointer('pointerdown', stage(), 20 + 860.5 * 0.96, 9 + 225 * 0.96);
    runFrames(7);
    const base = drawn.at(-1)![0];
    const left = bend(line(base, 840));
    const right = bend(line(base, 880));
    expect(left).toBeLessThan(-1);
    expect(right).toBeCloseTo(-left, 6);
  });

  it('ages the rings by the time that passed, not by the frames that ran', async () => {
    withContext();
    box(480, 480);

    /** Press the centre and run `count` frames `spacing` ms apart after the one that places the ring. */
    const hold = async (spacing: number, count: number): Promise<{ bent: number; alpha: number }> => {
      await mount();
      runFrame();
      pointer('pointerdown', stage(), 240, 240);
      for (let i = 0; i <= count; i++) runFrame(1000 + i * spacing);
      const [base, ...lit] = drawn.at(-1)!;
      return { bent: bend(line(base, 260)), alpha: lit.at(-1)!.alpha };
    };

    // The same 100 ms after the ring was placed, at 60 Hz and at 120 Hz.
    const at60 = await hold(FRAME, 6);
    const at120 = await hold(FRAME / 2, 12);
    expect(at60.bent).toBeGreaterThan(2);
    expect(at120.bent).toBeCloseTo(at60.bent, 6);
    expect(at120.alpha).toBe(at60.alpha);

    // One 200 ms stall advances three frames, not twelve.
    const stalled = await hold(200, 1);
    const three = await hold(FRAME, 3);
    expect(stalled.bent).toBeCloseTo(three.bent, 6);
  });

  it('keeps overlapping rings from folding the grid over', async () => {
    withContext();
    box(480, 480);
    await mount();
    runFrame();
    pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    const one = mostBent(drawn.at(-1)![0]);
    settle();

    // Twelve presses before one frame: twelve rings with one crest. Summed point by
    // point and clamped, they doubled the line beside the press back by 15px.
    for (let i = 0; i < 12; i++) pointer('pointerdown', stage(), 240, 240);
    for (let i = 0; i < 40; i++) {
      runFrame();
      expect(folds(drawn.at(-1)![0]), `frame ${i}`).toBeNull();
    }
    settle();
    for (let i = 0; i < 12; i++) pointer('pointerdown', stage(), 240, 240);
    runFrames(7);
    // They still add up, to the budget at most: 0.39 of the 30px half-width a 40px cell rings at.
    const twelve = mostBent(drawn.at(-1)![0]);
    expect(twelve).toBeGreaterThan(one * 1.2);
    expect(twelve).toBeLessThanOrEqual(0.39 * 30 + 1e-9);
  });

  it('never folds a line under one ring, however strong, either way', async () => {
    withContext();
    box(480, 480);
    await mount();
    // A 16px cell rings at a 16px half-width, which the playground's 30px strength
    // folded at once.
    await set(host => {
      host.cellSize.set(16);
      host.strength.set(200);
    });
    for (const strength of [200, -200]) {
      await set(host => host.strength.set(strength));
      runFrame();
      pointer('pointerdown', stage(), 240, 240);
      let most = 0;
      for (let i = 0; i < 40; i++) {
        runFrame();
        expect(folds(drawn.at(-1)![0]), `strength ${strength}, frame ${i}`).toBeNull();
        most = Math.max(most, mostBent(drawn.at(-1)![0]));
      }
      expect(most).toBeGreaterThan(3);
      expect(most).toBeLessThanOrEqual(0.39 * 16 + 1e-9);
      settle();
    }
  });

  it('leaves a ring that meets no other its full bend', async () => {
    withContext();
    box(960, 480);
    await mount();
    runFrame();
    pointer('pointerdown', stage(), 120, 240);
    runFrames(7);
    const alone = bend(line(drawn.at(-1)![0], 140));
    settle();

    // A second press 720px off: the bands, 122px out, never meet, so neither gives way.
    pointer('pointerdown', stage(), 120, 240);
    pointer('pointerdown', stage(), 840, 240);
    runFrames(7);
    expect(bend(line(drawn.at(-1)![0], 140))).toBe(alone);
    expect(bend(line(drawn.at(-1)![0], 860))).toBe(alone);
    settle();

    // 260px off, the bands are 16px apart, under a half-width: the pair already counts in
    // part, so the moment they meet does not shrink both by a step in one frame.
    pointer('pointerdown', stage(), 120, 240);
    pointer('pointerdown', stage(), 380, 240);
    runFrames(7);
    const near = bend(line(drawn.at(-1)![0], 140));
    expect(near).toBeLessThan(alone * 0.98);
    expect(near).toBeGreaterThan(alone * 0.85);
  });

  it('takes nothing from the rings a new one overlaps on the frame it arrives', async () => {
    withContext();
    box(480, 480);

    /** Press the centre, run seven frames, press it again unless told not to, and run one more. */
    const second = async (again: boolean): Promise<number> => {
      drawn = [];
      await mount();
      runFrame();
      pointer('pointerdown', stage(), 240, 240);
      runFrames(7);
      if (again) pointer('pointerdown', stage(), 240, 240);
      runFrame();
      return bend(line(drawn.at(-1)![0], 260));
    };

    // Born at full strength, it would take its share of the budget in one frame and the
    // first ring would shrink by a step; it ramps in, and the first gives way smoothly.
    const before = await second(false);
    expect(Math.abs(before)).toBeGreaterThan(1);
    expect(await second(true)).toBe(before);
  });

  it('keeps at most sixteen rings, replacing the oldest of the faintest', async () => {
    withContext();
    box(4800, 480);
    await mount();
    runFrame();
    // Presses 280px apart: a ring's band is 122px out by the time it is read, so no
    // two meet and none reaches the line beside another's origin.
    const origin = (k: number): number => 200 + 280 * k;
    const beside = (k: number): readonly number[] => line(drawn.at(-1)![0], origin(k) + 20);

    // Seventeen presses before one frame, all as strong: the first is the one that goes.
    for (let k = 0; k <= 16; k++) pointer('pointerdown', stage(), origin(k), 240);
    runFrames(7);
    expect(beside(0)).toHaveLength(4);
    expect(beside(1).length).toBeGreaterThan(4);
    expect(beside(16).length).toBeGreaterThan(4);

    // Sixteen rings light more stretches than the lit buffers start out holding, and
    // every point of every one still lies on the grid line it lights.
    const [base, ...lit] = drawn.at(-1)!;
    const onGrid = new Set<string>();
    for (const path of base.paths) for (let i = 0; i < path.length; i += 2) onGrid.add(`${path[i]},${path[i + 1]}`);
    const points = lit.flatMap(stroke => stroke.paths.flatMap(path => path.filter((_, i) => i % 2 === 0)));
    expect(points.length).toBeGreaterThan(256);
    expect(Math.max(...lit.map(stroke => stroke.paths.length))).toBeGreaterThan(32);
    for (const stroke of lit) {
      for (const path of stroke.paths) {
        expect(path.length).toBeGreaterThanOrEqual(4);
        for (let i = 0; i < path.length; i += 2) expect(onGrid.has(`${path[i]},${path[i + 1]}`)).toBe(true);
      }
    }
  });

  it('replaces a faint trail ring before a stronger press, and drops a trail ring fainter than every live one', async () => {
    withContext();
    box(4800, 480);
    await mount();
    runFrame();
    const origin = (k: number): number => 200 + 280 * k;
    const beside = (k: number): readonly number[] => line(drawn.at(-1)![0], origin(k) + 20);

    // The oldest ring a press, then fourteen more, then a move that leaves a trail ring
    // at 40%: sixteen alive.
    pointer('pointerdown', stage(), origin(0), 240);
    runFrame();
    for (let k = 1; k <= 14; k++) pointer('pointerdown', stage(), origin(k), 240);
    pointer('pointermove', stage(), origin(15), 240);
    runFrames(3);

    // A seventeenth: the trail ring is the faintest, and the oldest press stays.
    pointer('pointerdown', stage(), origin(16), 240);
    runFrame();
    // And a trail ring now, fainter than every press alive, is dropped rather than placed.
    pointer('pointermove', stage(), origin(15), 240);
    runFrames(6);
    expect(beside(0).length).toBeGreaterThan(4);
    expect(beside(14).length).toBeGreaterThan(4);
    expect(beside(15)).toHaveLength(4);
    expect(beside(16).length).toBeGreaterThan(4);
  });

  it('ends a ring that neither travels nor fades, fading it out over its last second', async () => {
    withContext();
    box(240, 240);
    await mount();
    await set(host => {
      host.speed.set(0);
      host.decay.set(0);
    });
    runFrame();

    pointer('pointerdown', stage(), 120, 120);
    // The frame that places it, then past the 100 ms it takes to reach its full bend.
    runFrames(8);
    const placed = bend(line(drawn.at(-1)![0], 140));
    runFrames(113);
    // Two seconds in, exactly where and as strong as it was once it had grown in.
    expect(Math.abs(placed)).toBeGreaterThan(0.5);
    expect(bend(line(drawn.at(-1)![0], 140))).toBe(placed);
    // Five and a half seconds in, halfway through fading out rather than about to vanish.
    runFrames(210);
    expect(bend(line(drawn.at(-1)![0], 140)) / placed).toBeCloseTo(0.5, 5);
    // Six seconds at most: 360 frames, give or take the one that places it.
    expect(settle()).toBeGreaterThan(20);
    expect(settle()).toBe(0);
    expect(allStraight(drawn.at(-1)![0])).toBe(true);
  });

  it('follows the pointer on the shadow host when it sits directly in a shadow root', async () => {
    withContext();
    box(240, 240);
    await mount([], ShadowHost);
    const shadow = (fixture.nativeElement as HTMLElement).shadowRoot!;
    const inner = shadow.querySelector<HTMLElement>('wr-ripple-grid')!;
    expect(inner.parentElement).toBeNull();
    runFrame();

    shadow
      .querySelector('.copy')!
      .dispatchEvent(new PointerEvent('pointerdown', { clientX: 120, clientY: 120, bubbles: true, composed: true }));
    runFrames(7);
    expect(allStraight(drawn.at(-1)![0]), 'bent by a press on the copy beside it').toBe(false);
  });

  it('tears down the listeners, the observer, the timer and the frame it installed', async () => {
    withContext();
    holdTimers();
    box(240, 240);
    await mount();
    await set(host => host.idleInterval.set(1000));
    runFrame();
    pointer('pointerdown', stage(), 120, 120);
    const removeFromWindow = vi.spyOn(window, 'removeEventListener');
    const removeFromParent = vi.spyOn(stage(), 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    expect(timers.size).toBe(1);

    fixture.destroy();

    // A background is one per route and nothing else would notice a leak: a
    // resize listener, four pointer listeners on the parent, an observer, an idle
    // timer and a running frame per instance.
    expect(removeFromWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    for (const type of ['pointerdown', 'pointermove', 'pointerleave', 'pointercancel']) {
      expect(removeFromParent).toHaveBeenCalledWith(type, expect.any(Function));
    }
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
    expect(timers.size).toBe(0);
  });
});
