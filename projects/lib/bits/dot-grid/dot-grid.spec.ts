import { Component, ErrorHandler, PLATFORM_ID, type Type, ViewEncapsulation, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDotGrid } from './dot-grid';

@Component({
  imports: [WrDotGrid],
  template: `
    <div class="stage">
      <wr-dot-grid
        [gap]="gap()"
        [dotSize]="dotSize()"
        [dotColor]="dotColor()"
        [activeColor]="activeColor()"
        [radius]="radius()"
        [strength]="strength()"
      />
      <p class="copy">Copy in front of the dots</p>
    </div>
  `,
})
class Host {
  readonly gap = signal(24);
  readonly dotSize = signal(3);
  readonly dotColor = signal<string | null>(null);
  readonly activeColor = signal<string | null>(null);
  readonly radius = signal(120);
  readonly strength = signal(12);
}

/** The grid as the first child of a shadow root, where it has no parent element. */
@Component({
  selector: 'wr-dot-grid-shadow-host',
  imports: [WrDotGrid],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `<wr-dot-grid />
    <p class="copy">Copy in front of the dots</p>`,
})
class ShadowHost {}

/** A 60 Hz frame, in ms — the unit the component's springs are tuned in. */
const FRAME = 1000 / 60;

const reducedMotion = {
  isBrowser: true,
  isServer: false,
  userAgent: null,
  prefersDark: () => false,
  prefersReducedMotion: () => true,
};

/**
 * A dot field on a 2D canvas. jsdom refuses the context, which is the first state
 * this spec is for: `getContext('2d')` returning null is a real browser answer, and
 * the component has to put its canvas up and stop rather than throw. What makes that
 * readable is `.wr-dot-grid--painted`, which retires the CSS stand-in grid only once
 * the canvas has real pixels — its absence is the null-context path holding.
 *
 * Everything else needs a context, so those tests mount `withContext()`: a recording
 * 2D context that keeps every frame as the fills it made, each with the colour, the
 * alpha and the dots (`arc` centres) it filled. That is the whole of what a spec can
 * see this component draw, and it is enough: the resting grid, a dot pushed away from
 * the pointer, the lit pass in the active colour, and the loop going quiet again.
 *
 * `boot()` runs from `afterNextRender`, and what it throws never reaches
 * `detectChanges()` or `whenStable()` — Angular reports it to the `ErrorHandler` and
 * the fixture carries on — so every mount installs a recorder and the tests read it.
 */

interface Fill {
  readonly color: string;
  readonly alpha: number;
  /** Centre of every dot in the path, in CSS pixels. */
  readonly dots: readonly (readonly [number, number])[];
}

/** Everything `boot()` threw — where an `afterNextRender` failure is reported, and the only place. */
let thrown: unknown[];
/** One entry per pass of the draw — opened by its `clearRect` — holding the fills it made. */
let drawn: Fill[][];
/** Frames the page asked for, held rather than fired. */
let frames: FrameRequestCallback[];
/** `disconnect()` calls on the resize observer. */
let disconnects: number;
/** The callback the component gave its resize observer, for the spec to deliver entries through. */
let observed: ResizeObserverCallback | null;

/**
 * A 2D context that records what it was asked to fill, and nothing more.
 *
 * `clearRect` opens a pass, `beginPath` starts a path, `arc` adds a dot to it, and
 * `fill` closes it with the `fillStyle` and `globalAlpha` the component had just
 * assigned. Anything else travels into a no-op. jsdom also has no `ResizeObserver`,
 * which `boot()` installs right after the context, so the spec supplies the smallest
 * one it can disconnect, and keeps its callback so `resized()` can deliver an entry.
 */
const withContext = (): void => {
  let path: [number, number][] = [];
  const ctx: Record<string, unknown> = {
    fillStyle: '#000',
    globalAlpha: 1,
    clearRect: () => {
      drawn.push([]);
    },
    beginPath: () => {
      path = [];
    },
    arc: (x: number, y: number) => {
      path.push([x, y]);
    },
    fill: () => {
      drawn.at(-1)!.push({ color: String(ctx['fillStyle']), alpha: Number(ctx['globalAlpha']), dots: path });
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

/** Run frames until one paints nothing; returns how many painted. Fails rather than spin forever. */
const settle = (): number => {
  for (let ran = 0; ran < 1000; ran++) {
    const before = drawn.length;
    runFrame();
    if (drawn.length === before) return ran;
  }
  throw new Error('the dot grid never stopped asking for frames');
};

/** The dot nearest `(x, y)` in a fill. */
const nearest = (fill: Fill, x: number, y: number): readonly [number, number] =>
  fill.dots.reduce((best, dot) =>
    Math.hypot(dot[0] - x, dot[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? dot : best
  );

describe('WrDotGrid', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const canvas = (): HTMLCanvasElement | null => root().querySelector('canvas');
  const grid = (): HTMLElement => root().querySelector<HTMLElement>('wr-dot-grid')!;
  const stage = (): HTMLElement => root().querySelector<HTMLElement>('.stage')!;
  const pointer = (type: string, target: Element, x = 0, y = 0): void => {
    target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true }));
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
    expect(grid().classList.contains('wr-dot-grid--painted')).toBe(false);
  });

  it('takes input changes and a pointer without reaching for a context it never got', () => {
    fixture.componentInstance.gap.set(40);
    fixture.componentInstance.dotColor.set('rgb(1, 2, 3)');
    fixture.detectChanges();
    pointer('pointermove', stage(), 10, 10);

    expect(thrown).toEqual([]);
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
    expect(grid().classList.contains('wr-dot-grid--painted')).toBe(false);
    expect(grid().style.getPropertyValue('--wr-dot-grid-gap')).toBe('24px');
    expect(grid().style.getPropertyValue('--wr-dot-grid-dot-size')).toBe('3px');
    expect(thrown).toEqual([]);
  });

  it('publishes the pitch, the size and an explicit colour for the stand-in', () => {
    fixture.componentInstance.gap.set(2);
    fixture.componentInstance.dotSize.set(5);
    fixture.componentInstance.dotColor.set('rgb(1, 2, 3)');
    fixture.detectChanges();

    // Floored at 4px, the pitch the canvas is laid out at, so the two agree.
    expect(grid().style.getPropertyValue('--wr-dot-grid-gap')).toBe('4px');
    expect(grid().style.getPropertyValue('--wr-dot-grid-dot-size')).toBe('5px');
    expect(grid().style.getPropertyValue('--wr-dot-grid-dot-color')).toBe('rgb(1, 2, 3)');

    // Unset, the hook is the stylesheet's again.
    fixture.componentInstance.dotColor.set(null);
    fixture.detectChanges();
    expect(grid().style.getPropertyValue('--wr-dot-grid-dot-color')).toBe('');
  });

  it('draws the resting grid, centred, then asks for no more frames', async () => {
    withContext();
    box(240, 240);
    await mount();

    expect(drawn.length, 'nothing is drawn inside boot() itself').toBe(0);
    runFrame();
    fixture.detectChanges();

    expect(drawn.length).toBe(1);
    expect(grid().classList.contains('wr-dot-grid--painted')).toBe(true);
    const [base] = drawn[0];
    // A dot on the centre, the rest a pitch apart, one ring past each edge:
    // 13 × 13 over a 240px box at 24px.
    expect(base.dots).toContainEqual([120, 120]);
    expect(base.dots).toContainEqual([144, 96]);
    expect(base.dots.length).toBe(169);
    expect(drawn[0].length, 'nothing is lit with no pointer').toBe(1);

    // Nothing moves, so the loop sleeps rather than redrawing a still grid.
    runFrame();
    runFrame();
    expect(drawn.length).toBe(1);
  });

  it('paints with the colours resolved from their tokens against the host', async () => {
    withContext();
    box(240, 240);
    await mount();
    // The theme declares tokens with `light-dark()`, which no canvas reads.
    // jsdom resolves the light half, as a browser does with no dark scheme.
    grid().style.setProperty('--wr-dot-grid-dot-color', 'light-dark(rgb(1, 2, 3), rgb(4, 5, 6))');
    grid().style.setProperty('--wr-color-success', 'rgb(0, 128, 0)');
    fixture.componentInstance.activeColor.set('var(--wr-color-success)');
    fixture.detectChanges();
    await fixture.whenStable();

    runFrame();
    expect(drawn.at(-1)![0].color).toBe('rgb(1, 2, 3)');

    pointer('pointermove', stage(), 130, 120);
    runFrame();

    const lit = drawn.at(-1)!.slice(1);
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every(fill => fill.color === 'rgb(0, 128, 0)')).toBe(true);
  });

  it('pushes the dots near the pointer away and lights them, followed on the parent', async () => {
    withContext();
    box(240, 240);
    await mount();
    grid().style.setProperty('--wr-dot-grid-active-color', 'rgb(9, 9, 9)');
    runFrame();

    // Over the copy in front of the canvas, not over the canvas: the event reaches
    // the parent by bubbling, which is the only way it can reach the dots.
    pointer('pointermove', root().querySelector('.copy')!, 130, 120);
    for (let i = 0; i < 12; i++) runFrame();

    const [base, ...lit] = drawn.at(-1)!;
    // The centre dot sits 10px left of the pointer, so it goes further left; the
    // one 14px right of it goes further right; one far outside the radius stays.
    expect(nearest(base, 120, 120)[0]).toBeLessThan(118);
    expect(nearest(base, 144, 120)[0]).toBeGreaterThan(146);
    expect(base.dots).toContainEqual([-24, -24]);
    // And lit, in the active colour, more strongly the closer they are.
    expect(lit.length).toBeGreaterThan(1);
    expect(lit.every(fill => fill.color === 'rgb(9, 9, 9)')).toBe(true);
    expect(lit.at(-1)!.alpha).toBeGreaterThan(lit[0].alpha);
    expect(lit.at(-1)!.dots).toContainEqual(nearest(base, 120, 120));
  });

  it('springs back, goes dark and falls asleep once the pointer has left', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();
    const rest = drawn[0][0].dots;

    pointer('pointermove', stage(), 130, 120);
    for (let i = 0; i < 12; i++) runFrame();
    pointer('pointerleave', stage());
    expect(settle()).toBeGreaterThan(10);

    const [base, ...lit] = drawn.at(-1)!;
    expect(lit).toEqual([]);
    base.dots.forEach(([x, y], i) => {
      expect(Math.abs(x - rest[i][0])).toBeLessThan(0.05);
      expect(Math.abs(y - rest[i][1])).toBeLessThan(0.05);
    });
    const asleep = drawn.length;
    runFrame();
    expect(drawn.length).toBe(asleep);
  });

  it('only lights the dots when strength is 0', async () => {
    withContext();
    box(240, 240);
    await mount();
    fixture.componentInstance.strength.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    runFrame();

    pointer('pointermove', stage(), 130, 120);
    for (let i = 0; i < 12; i++) runFrame();

    const [base, ...lit] = drawn.at(-1)!;
    expect(base.dots).toContainEqual([120, 120]);
    expect(lit.length).toBeGreaterThan(0);
  });

  it('draws one still grid and follows no pointer for someone who asked for less motion', async () => {
    const listen = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    withContext();
    box(240, 240);
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);

    expect(drawn.length).toBe(1);
    expect(grid().classList.contains('wr-dot-grid--painted')).toBe(true);
    expect(listen).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything());

    pointer('pointermove', stage(), 130, 120);
    runFrame();
    runFrame();

    expect(drawn.length).toBe(1);
    expect(drawn[0].length, 'nothing is lit').toBe(1);
    expect(drawn[0][0].dots).toContainEqual([120, 120]);
  });

  it('redraws the still grid in the new colour when the scheme switches', async () => {
    withContext();
    await mount([{ provide: WrPlatform, useValue: reducedMotion }]);
    // jsdom resolves every `light-dark()` to its light half, so the switch is
    // staged on the hook: the new value is in place BEFORE the scheme moves, and
    // only the scheme switch may bring it to the canvas.
    grid().style.setProperty('--wr-dot-grid-dot-color', 'rgb(255, 0, 0)');
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
    grid().style.setProperty('--wr-dot-grid-dot-color', 'rgb(0, 0, 255)');
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

  it('repaints when an input changes, and lays the grid out again for a new gap', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();

    fixture.componentInstance.dotColor.set('rgb(7, 7, 7)');
    fixture.componentInstance.gap.set(60);
    fixture.detectChanges();
    await fixture.whenStable();
    runFrame();

    const [base] = drawn.at(-1)!;
    expect(base.color).toBe('rgb(7, 7, 7)');
    expect(base.dots).toContainEqual([180, 120]);
    expect(base.dots).not.toContainEqual([144, 120]);
  });

  it('follows reduced motion switched on and off while the page is open', async () => {
    const reduce = signal(false);
    withContext();
    box(240, 240);
    await mount([{ provide: WrPlatform, useValue: { ...reducedMotion, prefersReducedMotion: reduce } }]);
    runFrame();
    pointer('pointermove', stage(), 130, 120);
    runFrame();
    expect(drawn.at(-1)!.length, 'lit while motion is allowed').toBeGreaterThan(1);

    // Switched on: the pointer listeners go, and one still, unlit grid is drawn.
    const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
    reduce.set(true);
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(drawn.at(-1)!.length).toBe(1);
    expect(drawn.at(-1)![0].dots).toContainEqual([120, 120]);
    const still = drawn.length;
    // The frame the loop had asked for was cancelled; this mock cannot withdraw it.
    frames = [];
    pointer('pointermove', stage(), 130, 120);
    runFrame();
    expect(drawn.length).toBe(still);

    // And off again: the pointer is followed once more.
    reduce.set(false);
    await fixture.whenStable();
    runFrame();
    pointer('pointermove', stage(), 130, 120);
    runFrame();
    expect(drawn.at(-1)!.length).toBeGreaterThan(1);
  });

  it('asks for no frames off screen, and picks up where it left off in view', async () => {
    withContext();
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

    flush();
    expect(drawn.length, 'nothing is drawn before the observer says the grid is in view').toBe(0);

    report!([{ isIntersecting: true }]);
    flush();
    expect(drawn.length).toBe(1);

    pointer('pointermove', stage(), 130, 120);
    report!([{ isIntersecting: false }]);
    flush();
    expect(drawn.length, 'off screen, the frame the pointer asked for is withdrawn').toBe(1);

    report!([{ isIntersecting: true }]);
    report!([{ isIntersecting: true }]);
    flush();
    expect(drawn.length, 'one loop, not a second beside the first').toBe(2);

    fixture.destroy();
    expect(report).toBeNull();
  });

  it('backs the canvas at 2x, and steps down on a box too large for the pixel budget', async () => {
    withContext();
    vi.stubGlobal('devicePixelRatio', 2);

    box(1280, 450);
    await mount();
    expect([canvas()!.width, canvas()!.height]).toEqual([2560, 900]);

    fixture.destroy();
    box(1728, 560);
    await mount();
    expect(canvas()!.width * canvas()!.height).toBeLessThanOrEqual(2_500_000 + 1728 + 560);
    expect(canvas()!.width).toBeGreaterThan(1728);
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
    box(300, 240);
    const asked = frames.length;
    resized(300, 240);
    expect(drawn.length).toBe(2);
    expect(frames.length, 'nothing left for a frame to do').toBe(asked);
    expect([canvas()!.width, canvas()!.height]).toEqual([300, 240]);
    // Centred on the new box, which puts the columns 6px off the old ones.
    expect(drawn[1][0].dots).toContainEqual([150, 120]);
    expect(drawn[1][0].dots).not.toContainEqual([120, 120]);
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
    expect(drawn[1][0].dots).toContainEqual([120, 120]);

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
    fixture.componentInstance.strength.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    runFrame();

    expect([canvas()!.width, canvas()!.height]).toEqual([1000, 450]);
    expect(drawn.at(-1)![0].dots).toContainEqual([500, 225]);

    // The dot at 884 shows at 20 + 884 × 0.96 on screen. A pointer there is on it,
    // so it alone is fully lit (its neighbours, 24px out, stop two steps short).
    pointer('pointermove', stage(), 20 + 884 * 0.96, 9 + 225 * 0.96);
    for (let i = 0; i < 12; i++) runFrame();
    expect(drawn.at(-1)!.at(-1)!.dots).toEqual([[884, 225]]);

    // The animation ends: the same layout box, the rect at full size, no entry.
    // Nothing is laid out again, and the pointer maps one to one.
    box(1000, 450);
    pointer('pointermove', stage(), 596, 225);
    for (let i = 0; i < 12; i++) runFrame();
    expect([canvas()!.width, canvas()!.height]).toEqual([1000, 450]);
    expect(drawn.at(-1)!.at(-1)!.dots).toEqual([[596, 225]]);
  });

  it('steps the springs by the time that passed, not by the frames that ran', async () => {
    withContext();
    box(240, 240);

    /** Hold the pointer on the centre dot for `count` frames `spacing` ms apart, after the first. */
    const hold = async (spacing: number, count: number): Promise<{ alpha: number; pushed: number }> => {
      await mount();
      runFrame();
      pointer('pointermove', stage(), 120, 120);
      for (let i = 0; i <= count; i++) runFrame(1000 + i * spacing);
      const [base, ...lit] = drawn.at(-1)!;
      // The dot under the pointer is lit and never pushed; its neighbour is pushed right.
      const under = lit.find(fill => fill.dots.some(([x, y]) => x === 120 && y === 120));
      return { alpha: under!.alpha, pushed: nearest(base, 150, 120)[0] - 144 };
    };

    // The same 83 ms after the first frame, at 60 Hz and at 120 Hz.
    const at60 = await hold(FRAME, 5);
    const at120 = await hold(FRAME / 2, 10);
    expect(at120.alpha).toBe(at60.alpha);
    expect(at60.pushed).toBeGreaterThan(5);
    expect(Math.abs(at120.pushed - at60.pushed)).toBeLessThan(0.5);

    // One 200 ms stall advances three frames, not twelve.
    const stalled = await hold(200, 1);
    const three = await hold(FRAME, 3);
    expect(stalled.alpha).toBe(three.alpha);
    expect(stalled.alpha).toBeLessThan(1);
  });

  it('follows the pointer on the shadow host when it sits directly in a shadow root', async () => {
    withContext();
    box(240, 240);
    await mount([], ShadowHost);
    const shadow = (fixture.nativeElement as HTMLElement).shadowRoot!;
    const inner = shadow.querySelector<HTMLElement>('wr-dot-grid')!;
    expect(inner.parentElement).toBeNull();
    runFrame();

    shadow
      .querySelector('.copy')!
      .dispatchEvent(new PointerEvent('pointermove', { clientX: 130, clientY: 120, bubbles: true, composed: true }));
    for (let i = 0; i < 12; i++) runFrame();
    expect(drawn.at(-1)!.length, 'lit by a pointer over the copy beside it').toBeGreaterThan(1);

    // And it hears the pointer leave the shadow host.
    (fixture.nativeElement as HTMLElement).dispatchEvent(new PointerEvent('pointerleave'));
    settle();
    expect(drawn.at(-1)!.length).toBe(1);
  });

  it('tears down the listeners, the observer and the frame it installed', async () => {
    withContext();
    box(240, 240);
    await mount();
    runFrame();
    pointer('pointermove', stage(), 130, 120);
    const removeFromWindow = vi.spyOn(window, 'removeEventListener');
    const removeFromParent = vi.spyOn(stage(), 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    fixture.destroy();

    // A background is one per route and nothing else would notice a leak: a
    // resize listener, four pointer listeners on the parent, an observer and a
    // running frame per instance.
    expect(removeFromWindow).toHaveBeenCalledWith('resize', expect.any(Function));
    for (const type of ['pointermove', 'pointerdown', 'pointerleave', 'pointercancel']) {
      expect(removeFromParent).toHaveBeenCalledWith(type, expect.any(Function));
    }
    expect(cancel).toHaveBeenCalled();
    expect(disconnects).toBe(1);
  });
});
