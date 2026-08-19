import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { WrWindowManager } from 'ngwr/window';
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
