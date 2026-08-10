import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrScroll } from './wr-scroll';

/**
 * jsdom has no scrolling — `window.scrollTo` exists and does nothing — which is
 * exactly right here: what this service decides is the ARGUMENTS, and those are
 * what a caller depends on. Element geometry is stubbed per test, since there is
 * no layout to measure.
 */
describe('WrScroll', () => {
  let scroll: WrScroll;
  let calls: ScrollToOptions[];

  const setup = (platform?: unknown): WrScroll => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: platform ? [platform as never] : [] });
    return TestBed.inject(WrScroll);
  };

  /** An element at `top`, in a page scrolled to `scrollY`. */
  const elementAt = (top: number, id = 'target'): HTMLElement => {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'target';
    el.getBoundingClientRect = (): DOMRect => ({ top, left: 0, width: 100, height: 50 }) as DOMRect;
    document.body.appendChild(el);
    return el;
  };

  beforeEach(() => {
    calls = [];
    vi.spyOn(window, 'scrollTo').mockImplementation(((options: ScrollToOptions) => {
      calls.push(options);
    }) as typeof window.scrollTo);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    document.body.innerHTML = '';
    scroll = setup();
  });

  afterEach(() => vi.restoreAllMocks());

  it('scrolls the page to an absolute position', () => {
    scroll.to({ top: 400 });

    expect(calls).toEqual([{ top: 400, left: 0, behavior: 'smooth' }]);
  });

  it('subtracts the offset, for a sticky header', () => {
    scroll.to({ top: 400 }, { offset: 80 });

    expect(calls[0].top).toBe(320);
  });

  it('resolves an id, adding whatever the page is already scrolled by', () => {
    // `getBoundingClientRect` is relative to the viewport, so the page's own
    // scroll position has to be added back to get an absolute target.
    elementAt(500);
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });

    scroll.to('#target');
    expect(calls[0].top).toBe(700);
  });

  it('resolves a plain selector too', () => {
    elementAt(120);

    scroll.to('.target');
    expect(calls[0].top).toBe(120);
  });

  it('accepts an element directly, and through intoView', () => {
    const el = elementAt(300);

    scroll.to(el, { offset: 50 });
    scroll.intoView(el, { offset: 50 });

    expect(calls.map(c => c.top)).toEqual([250, 250]);
  });

  it('goes to the very top', () => {
    scroll.toTop();

    expect(calls[0].top).toBe(0);
  });

  it('does nothing for a target that is not on the page', () => {
    scroll.to('#nowhere');
    scroll.to('.missing');

    expect(calls).toEqual([]);
  });

  it('does nothing for a selector that is not valid, rather than throwing', () => {
    // The argument often comes from a URL fragment, which can be anything.
    expect(() => scroll.to('#not a selector!!')).not.toThrow();
    expect(() => scroll.to(':::')).not.toThrow();
    expect(calls).toEqual([]);
  });

  it('scrolls instantly when asked', () => {
    scroll.to({ top: 100 }, { smooth: false });

    expect(calls[0].behavior).toBe('auto');
  });

  it('scrolls instantly for someone who asked for less motion', () => {
    const platform = {
      isBrowser: true,
      isServer: false,
      userAgent: null,
      prefersDark: { subscribe: () => undefined },
      prefersReducedMotion: () => true,
    };
    scroll = setup({ provide: WrPlatform, useValue: platform });

    scroll.to({ top: 100 });
    expect(calls[0].behavior).toBe('auto');
  });

  it('scrolls a container instead of the page when given one', () => {
    const container = document.createElement('div');
    container.getBoundingClientRect = (): DOMRect => ({ top: 100, left: 0, width: 300, height: 300 }) as DOMRect;
    Object.defineProperty(container, 'scrollTop', { value: 40, configurable: true });
    const containerCalls: ScrollToOptions[] = [];
    container.scrollTo = ((options: ScrollToOptions) => containerCalls.push(options)) as typeof container.scrollTo;
    document.body.appendChild(container);

    const el = elementAt(250);
    container.appendChild(el);

    scroll.to(el, { container });

    // 250 (element) − 100 (container) + 40 (already scrolled) — the page's own
    // scroll position has nothing to do with it.
    expect(containerCalls).toEqual([{ top: 190, left: 0, behavior: 'smooth' }]);
    expect(calls).toEqual([]);
  });

  it('does nothing at all on the server', () => {
    scroll = setup({ provide: PLATFORM_ID, useValue: 'server' });
    scroll.to({ top: 100 });
    scroll.toTop();

    expect(calls).toEqual([]);
  });
});
