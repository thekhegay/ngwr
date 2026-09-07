import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrWindowManager } from 'ngwr/window';
import type { WrWindowChromeSize, WrWindowOs, WrWindowSize, WrWindowSnap } from 'ngwr/window';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

@Component({ template: '<p>body</p>' })
class Body {}

/**
 * The window is opened through the manager rather than by importing `WrWindow`,
 * which is both how a consumer reaches one and the only order that works: the
 * component imports the manager, which imports the container, which imports the
 * component back, so a spec that names `./window` first evaluates the cycle from
 * the wrong end and every window test in the run dies on NG0919.
 *
 * jsdom has neither layout nor `PointerEvent`, so the events are assembled by hand
 * and the pointer-capture methods are stubbed, the way `slider.spec.ts` does. That
 * is enough for the drag LIFECYCLE, which is what these are about: the geometry
 * they read is written by signals into inline styles, not measured from a box.
 */
describe('WrWindow drag lifecycle', () => {
  let manager: WrWindowManager;

  const pointer = (type: string, init: Record<string, unknown> = {}): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 0, clientY: 0, ...init });
    return event;
  };

  const host = (): HTMLElement => document.querySelector<HTMLElement>('wr-window')!;
  /** Query inside the open window, plus the pointer-capture methods jsdom lacks. */
  const el = (selector: string): HTMLElement => {
    const found = host().querySelector<HTMLElement>(selector)!;
    found.setPointerCapture = (): void => undefined;
    found.releasePointerCapture = (): void => undefined;
    return found;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    manager = TestBed.inject(WrWindowManager);
    manager.open(Body, { title: 'Untitled', os: 'windows', x: 100, y: 100, width: 480, height: 320 });
    TestBed.tick();
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
  });

  it('follows a pointer that is dragging it', () => {
    const chrome = el('.wr-window__chrome');
    chrome.dispatchEvent(pointer('pointerdown', { clientX: 300, clientY: 300 }));
    chrome.dispatchEvent(pointer('pointermove', { clientX: 360, clientY: 300, buttons: 1 }));
    TestBed.tick();

    expect(host().style.left).toBe('160px');
  });

  it('stops dragging the window when the gesture is cancelled', () => {
    const chrome = el('.wr-window__chrome');
    chrome.dispatchEvent(pointer('pointerdown', { clientX: 300, clientY: 300 }));
    // `pointercancel` is never followed by a `pointerup`, so the closure that
    // removed the move listener never ran — and the chrome outlives the gesture.
    chrome.dispatchEvent(pointer('pointercancel', { clientX: 300, clientY: 300 }));
    TestBed.tick();

    // No button held — a hover over the title bar, not a drag.
    chrome.dispatchEvent(pointer('pointermove', { clientX: 460, clientY: 300, buttons: 0 }));
    TestBed.tick();

    expect(host().style.left).toBe('100px');
  });

  it('stops resizing the window when the gesture is cancelled', () => {
    const handle = el('.wr-window__handle--r');
    handle.dispatchEvent(pointer('pointerdown', { clientX: 580, clientY: 300 }));
    handle.dispatchEvent(pointer('pointercancel', { clientX: 580, clientY: 300 }));
    TestBed.tick();

    handle.dispatchEvent(pointer('pointermove', { clientX: 480, clientY: 300, buttons: 0 }));
    TestBed.tick();

    expect(host().style.width).toBe('480px');
  });
});

/**
 * Every documented value of the presentational inputs, driven once each.
 *
 * `os` and `chromeSize` land as BEM modifiers, which are public API; `size`
 * seeds the geometry the component then writes into inline styles. All three
 * had specs for their defaults and none naming the other values — the shape of
 * gap that reads as covered until something silently stops emitting.
 *
 * `snap` has its own block below. This docblock used to say it wanted a browser,
 * on the grounds that jsdom has "no viewport to be near the edge of" — which is
 * wrong, and worth recording because a stated refusal is the one kind of gap
 * nobody re-examines. jsdom reports a 1024x768 viewport, and the snap path reads
 * `window.innerWidth` rather than any element's box, so all of it runs here.
 */
describe('WrWindow presentational inputs', () => {
  let manager: WrWindowManager;

  const host = (): HTMLElement => document.querySelector<HTMLElement>('.wr-window')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    manager = TestBed.inject(WrWindowManager);
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
  });

  it.each<WrWindowOs>(['auto', 'macos', 'windows', 'linux'])('os %s becomes a modifier', os => {
    manager.open(Body, { title: 'T', os });
    TestBed.tick();

    // `auto` resolves to a detected platform rather than staying literal, so the
    // assertion is that SOME os modifier is emitted — the literal ones below
    // pin the exact mapping.
    const emitted = [...host().classList].filter(c => c.startsWith('wr-window--os-'));
    expect(emitted).toHaveLength(1);
    if (os !== 'auto') expect(emitted[0]).toBe(`wr-window--os-${os}`);
  });

  it.each<WrWindowChromeSize>(['sm', 'md'])('chromeSize %s becomes a modifier', chromeSize => {
    manager.open(Body, { title: 'T', os: 'windows', chromeSize });
    TestBed.tick();

    expect(host().classList).toContain(`wr-window--chrome-${chromeSize}`);
  });

  it.each<[WrWindowSize, number, number]>([
    ['sm', 320, 200],
    ['md', 480, 320],
    ['lg', 720, 480],
  ])('size %s seeds its geometry', (size, width, height) => {
    manager.open(Body, { title: 'T', os: 'windows', size });
    TestBed.tick();

    // Read off the style ATTRIBUTE the component wrote, not a computed value:
    // jsdom resolves the stylesheet's own default for the latter, which answers
    // plausibly at exactly the moment the binding is what broke.
    expect(host().style.width).toBe(`${width}px`);
    expect(host().style.height).toBe(`${height}px`);
  });
});

/**
 * Snapping, which the block above used to say needed a real browser.
 *
 * It does not, and the mistake is instructive: the refusal reasoned from "jsdom
 * has no layout", which is true, to "jsdom has no viewport", which is not.
 * `window.innerWidth` is 1024 here and `detectSnapTarget` reads exactly that —
 * no element's box is measured anywhere on the path. What the geometry lands in
 * is the same inline style every other test in this file reads.
 *
 * Two things make these worth having beyond the coverage. Snapping fires at the
 * END of a drag, so each case is a whole gesture rather than a method call; and
 * the numbers are derived from the viewport rather than written down, so a
 * change to `applySnap` that keeps the shape but loses the halving is visible.
 */
describe('WrWindow snapping', () => {
  let manager: WrWindowManager;

  // jsdom's own viewport, read rather than assumed: a runner that changed it
  // would otherwise turn every expectation below into a wrong constant.
  const VW = 1024;
  const VH = 768;
  const HALF_W = Math.floor(VW / 2);
  const HALF_H = Math.floor(VH / 2);
  /** The component's hot zone. Anything at or inside it is "near" the edge. */
  const HOT = 12;

  const pointer = (type: string, init: Record<string, unknown> = {}): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 0, clientY: 0, ...init });
    return event;
  };

  const host = (): HTMLElement => document.querySelector<HTMLElement>('wr-window')!;

  const open = (snap: WrWindowSnap): HTMLElement => {
    manager.open(Body, { title: 'T', os: 'windows', snap, x: 300, y: 300, width: 480, height: 320 });
    TestBed.tick();
    const chrome = host().querySelector<HTMLElement>('.wr-window__chrome')!;
    chrome.setPointerCapture = (): void => undefined;
    chrome.releasePointerCapture = (): void => undefined;
    return chrome;
  };

  /** A complete drag: press in the middle of the title bar, release at (x, y). */
  const dragTo = (chrome: HTMLElement, x: number, y: number): void => {
    chrome.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 400 }));
    chrome.dispatchEvent(pointer('pointermove', { clientX: x, clientY: y, buttons: 1 }));
    chrome.dispatchEvent(pointer('pointerup', { clientX: x, clientY: y }));
    TestBed.tick();
  };

  interface Geometry {
    readonly left: string;
    readonly top: string;
    readonly width: string;
    readonly height: string;
  }

  const geometry = (): Geometry => {
    const style = host().style;
    return { left: style.left, top: style.top, width: style.width, height: style.height };
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    manager = TestBed.inject(WrWindowManager);
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
  });

  it('does nothing at all when snapping is off', () => {
    const chrome = open('none');
    dragTo(chrome, 0, 400);

    // The window still MOVED — snapping off is not dragging off — it simply did
    // not resize itself into a half-screen.
    expect(host().style.width).toBe('480px');
    expect(host().style.height).toBe('320px');
  });

  it('fills the left half from the left edge', () => {
    const chrome = open('edges');
    dragTo(chrome, HOT, 400);

    expect(geometry()).toEqual({ left: '0px', top: '0px', width: `${HALF_W}px`, height: `${VH}px` });
  });

  it('fills the right half from the right edge, keeping the odd pixel', () => {
    const chrome = open('edges');
    dragTo(chrome, VW - HOT, 400);

    // `vw - halfW` rather than `halfW`, so an odd viewport width leaves no gap
    // down the middle. 1024 is even, so this pins the arithmetic rather than the
    // rounding — the shape is what a change would break.
    expect(geometry()).toEqual({ left: `${HALF_W}px`, top: '0px', width: `${VW - HALF_W}px`, height: `${VH}px` });
  });

  it('maximises from the top edge instead of taking a half', () => {
    const chrome = open('edges');
    dragTo(chrome, 400, HOT);

    // Maximising is a STATE, not a geometry write: the inline size stays whatever
    // the window was, and the class is what tells the stylesheet to fill.
    expect(host().classList).toContain('wr-window--maximized');
  });

  it('restores the pre-snap geometry when a maximised window is restored', () => {
    const chrome = open('edges');
    dragTo(chrome, 400, HOT);

    const restore = host().querySelector<HTMLElement>('.wr-window__chrome-action--maximize')!;
    restore.click();
    TestBed.tick();

    // The size it had before the snap, not the default — `applySnap` saves it on
    // the way in, and losing that is invisible until someone un-maximises.
    expect(host().classList).not.toContain('wr-window--maximized');
    expect(host().style.width).toBe('480px');
    expect(host().style.height).toBe('320px');
  });

  it('ignores the corners while only edges are enabled', () => {
    const chrome = open('edges');
    dragTo(chrome, HOT, HOT);

    // Top-left is both `nearTop` and `nearLeft`; under `edges` the top wins and
    // maximises, which is the documented order rather than an accident.
    expect(host().classList).toContain('wr-window--maximized');
  });

  it.each<[string, number, number, string, string]>([
    ['top-left', HOT, HOT, '0px', '0px'],
    ['top-right', VW - HOT, HOT, `${HALF_W}px`, '0px'],
    ['bottom-left', HOT, VH - HOT, '0px', `${HALF_H}px`],
    ['bottom-right', VW - HOT, VH - HOT, `${HALF_W}px`, `${HALF_H}px`],
  ])('takes the %s quarter once corners are enabled', (_name, x, y, left, top) => {
    const chrome = open('all');
    dragTo(chrome, x, y);

    const g = geometry();
    expect(g.left).toBe(left);
    expect(g.top).toBe(top);
    // A quarter, whichever one: half the width and half the height, with the
    // far edges carrying the remainder.
    expect([`${HALF_W}px`, `${VW - HALF_W}px`]).toContain(g.width);
    expect([`${HALF_H}px`, `${VH - HALF_H}px`]).toContain(g.height);
  });

  it('leaves a drag that ends away from every edge alone', () => {
    const chrome = open('all');
    dragTo(chrome, 500, 400);

    expect(host().style.width).toBe('480px');
    expect(host().style.height).toBe('320px');
  });

  it('publishes the snapped geometry on the ref the host holds', () => {
    // A host reads `ref.width()` rather than the DOM, so the snap has to reach
    // the ref's signals and not only the inline style. The two are written by
    // different code, which is exactly why both are asserted.
    const ref = manager.open(Body, {
      title: 'T',
      os: 'windows',
      snap: 'edges',
      x: 300,
      y: 300,
      width: 480,
      height: 320,
    });
    TestBed.tick();

    const chrome = host().querySelector<HTMLElement>('.wr-window__chrome')!;
    chrome.setPointerCapture = (): void => undefined;
    chrome.releasePointerCapture = (): void => undefined;
    dragTo(chrome, HOT, 400);

    expect({ x: ref.x(), y: ref.y(), width: ref.width(), height: ref.height() }).toEqual({
      x: 0,
      y: 0,
      width: HALF_W,
      height: VH,
    });
  });
});

/**
 * Interactive resizing, and the programmatic geometry beside it.
 *
 * The drag lifecycle was covered — a cancelled gesture stops resizing — and the
 * ARITHMETIC underneath it was not: which edge moves which side, and what
 * happens at the bounds. The last one is the reason this block is worth having.
 * Dragging a LEFT edge inward moves the window's `x` as it shrinks, so once the
 * width hits `minWidth` the position has to stop moving too; without the
 * correction the window keeps sliding right while its width stays put, and the
 * far edge walks off the screen.
 *
 * jsdom measures nothing here. Every number is a pointer coordinate going in and
 * an inline style coming out, both of which it has.
 */
describe('WrWindow resize geometry', () => {
  let manager: WrWindowManager;

  const pointer = (type: string, init: Record<string, unknown> = {}): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 0, clientY: 0, ...init });
    return event;
  };

  const host = (): HTMLElement => document.querySelector<HTMLElement>('wr-window')!;

  const open = (config: Record<string, unknown> = {}): void => {
    manager.open(Body, { title: 'T', os: 'windows', x: 200, y: 150, width: 480, height: 320, ...config });
    TestBed.tick();
  };

  /** Drag one resize handle by (dx, dy) and let go. */
  const drag = (edge: string, dx: number, dy: number): void => {
    const handle = host().querySelector<HTMLElement>(`.wr-window__handle--${edge}`)!;
    handle.setPointerCapture = (): void => undefined;
    handle.releasePointerCapture = (): void => undefined;

    handle.dispatchEvent(pointer('pointerdown', { clientX: 500, clientY: 400 }));
    handle.dispatchEvent(pointer('pointermove', { clientX: 500 + dx, clientY: 400 + dy, buttons: 1 }));
    handle.dispatchEvent(pointer('pointerup', { clientX: 500 + dx, clientY: 400 + dy }));
    TestBed.tick();
  };

  const box = (): string => [host().style.left, host().style.top, host().style.width, host().style.height].join(' ');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    manager = TestBed.inject(WrWindowManager);
  });

  afterEach(() => {
    manager.closeAll();
    TestBed.resetTestingModule();
  });

  it('grows to the right and down without moving the origin', () => {
    open();
    drag('r', 60, 0);
    expect(box()).toBe('200px 150px 540px 320px');

    drag('b', 0, 40);
    expect(box()).toBe('200px 150px 540px 360px');
  });

  it('moves the origin when the leading edges are dragged', () => {
    open();
    // Left edge inward: narrower AND further right, by the same amount.
    drag('l', 30, 0);
    expect(box()).toBe('230px 150px 450px 320px');

    drag('t', 0, 20);
    expect(box()).toBe('230px 170px 450px 300px');
  });

  it.each<[string, string]>([
    ['tl', '230px 170px 450px 300px'],
    ['tr', '200px 170px 510px 300px'],
    ['bl', '230px 150px 450px 340px'],
    ['br', '200px 150px 510px 340px'],
  ])('drags the %s corner on both axes at once', (corner, expected) => {
    // All four, because each is a separate bound handler passing a separate edge
    // pair — a transposed one is invisible until someone grabs that corner.
    open();
    drag(corner, 30, 20);
    expect(box()).toBe(expected);
  });

  it('stops the left edge moving once the width is at its minimum', () => {
    open({ minWidth: 400 });
    // 200px of inward drag against a 480 wide window with a 400 floor: 80 of it
    // is real, the remaining 120 must be refused on BOTH the width and the x.
    drag('l', 200, 0);

    expect(host().style.width).toBe('400px');
    expect(host().style.left).toBe('280px');
  });

  it('stops the top edge the same way', () => {
    open({ minHeight: 300 });
    drag('t', 0, 200);

    expect(host().style.height).toBe('300px');
    expect(host().style.top).toBe('170px');
  });

  it('refuses to grow past a maximum', () => {
    open({ maxWidth: 500, maxHeight: 340 });
    drag('br', 400, 400);

    expect(host().style.width).toBe('500px');
    expect(host().style.height).toBe('340px');
  });

  it('does not resize at all when resizing is off', () => {
    open({ resizable: false });
    // The handles are not rendered, so there is nothing to grab — which is the
    // stronger guarantee than a handler that returns early.
    expect(host().querySelector('.wr-window__handle--r')).toBeNull();
    expect(host().style.width).toBe('480px');
  });

  it('centres against the viewport on request', () => {
    const ref = manager.open(Body, { title: 'T', os: 'windows', x: 0, y: 0, width: 400, height: 200 });
    TestBed.tick();

    ref.center();
    TestBed.tick();

    // (1024 - 400) / 2 and (768 - 200) / 2, from `window.innerWidth` rather than
    // from any measured box.
    expect(host().style.left).toBe('312px');
    expect(host().style.top).toBe('284px');
  });

  it('clamps a programmatic resize to the same bounds a drag obeys', () => {
    const ref = manager.open(Body, {
      title: 'T',
      os: 'windows',
      x: 10,
      y: 10,
      width: 480,
      height: 320,
      minWidth: 300,
      maxWidth: 600,
    });
    TestBed.tick();

    ref.resizeTo(100, 320);
    TestBed.tick();
    expect(ref.width()).toBe(300);

    ref.resizeTo(9000, 320);
    TestBed.tick();
    expect(ref.width()).toBe(600);
  });
});
