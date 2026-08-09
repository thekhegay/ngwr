import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrHaptics } from './wr-haptics';
import { WrPlatform } from './wr-platform';
import { WrVisualViewport } from './wr-visual-viewport';

/**
 * Three thin wrappers over host capabilities that are routinely missing:
 * `matchMedia` and `visualViewport` do not exist in Node — where every showcase
 * route is prerendered — and `navigator.vibrate` does not exist on iOS Safari at
 * all. So "the API is absent" is the ordinary case here, not the edge, and it is
 * what most of these tests are about.
 */
describe('platform services', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  describe('WrPlatform', () => {
    let listeners: Map<string, ((event: MediaQueryListEvent) => void)[]>;
    let removed: number;

    const stubMatchMedia = (answers: Record<string, boolean>): void => {
      listeners = new Map();
      removed = 0;
      vi.stubGlobal('matchMedia', (query: string) => {
        const bucket = listeners.get(query) ?? [];
        listeners.set(query, bucket);
        return {
          media: query,
          matches: answers[query] ?? false,
          addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => bucket.push(fn),
          removeEventListener: () => removed++,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
          onchange: null,
        };
      });
    };

    const setup = (platform: 'browser' | 'server' = 'browser'): WrPlatform => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : [],
      });
      return TestBed.inject(WrPlatform);
    };

    beforeEach(() => stubMatchMedia({}));

    it('reports the platform both ways round', () => {
      const platform = setup();
      expect([platform.isBrowser, platform.isServer]).toEqual([true, false]);

      const server = setup('server');
      expect([server.isBrowser, server.isServer]).toEqual([false, true]);
    });

    it('mirrors the queries it was asked about', () => {
      stubMatchMedia({ '(prefers-color-scheme: dark)': true });
      const platform = setup();

      expect([platform.prefersDark(), platform.prefersReducedMotion()]).toEqual([true, false]);
    });

    it('tracks a live preference change', () => {
      const platform = setup();
      expect(platform.prefersReducedMotion()).toBe(false);

      for (const fn of listeners.get('(prefers-reduced-motion: reduce)') ?? []) {
        fn({ matches: true } as MediaQueryListEvent);
      }

      // The whole point of a signal here: a user turning on Reduce Motion mid-
      // session must reach the components, not wait for a reload.
      expect(platform.prefersReducedMotion()).toBe(true);
    });

    it('drops its listeners with the injector', () => {
      setup();
      TestBed.resetTestingModule();

      expect(removed).toBe(2);
    });

    it('answers false on the server without calling matchMedia', () => {
      vi.stubGlobal('matchMedia', () => {
        throw new Error('matchMedia must not be called during prerender');
      });
      const platform = setup('server');

      expect([platform.prefersDark(), platform.prefersReducedMotion(), platform.userAgent]).toEqual([
        false,
        false,
        null,
      ]);
    });
  });

  describe('WrHaptics', () => {
    const setup = (vibrate: unknown, platform: 'browser' | 'server' = 'browser'): WrHaptics => {
      TestBed.resetTestingModule();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      TestBed.configureTestingModule({
        providers: platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : [],
      });
      return TestBed.inject(WrHaptics);
    };

    afterEach(() => {
      Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    });

    it('reports unsupported and stays silent where there is no Vibration API', () => {
      const haptics = setup(undefined);

      // iOS Safari, every desktop browser, and the prerenderer. A haptics call
      // is decoration on top of an action — it must never be the thing that
      // throws in the middle of one.
      expect(haptics.supported).toBe(false);
      expect([haptics.impact(), haptics.selection(), haptics.success(), haptics.error()]).toEqual([
        false,
        false,
        false,
        false,
      ]);
      expect(() => haptics.stop()).not.toThrow();
    });

    it('passes the pattern through when the API is there', () => {
      const vibrate = vi.fn().mockReturnValue(true);
      const haptics = setup(vibrate);

      expect(haptics.supported).toBe(true);
      expect(haptics.impact('heavy')).toBe(true);
      expect(vibrate).toHaveBeenCalledWith(40);

      haptics.success();
      // Cloned, not handed over: the shared pattern constant would otherwise be
      // exposed to a caller that mutates it.
      const [pattern] = vibrate.mock.calls[1] as [number[]];
      expect(pattern).toEqual([15, 60, 30]);
      pattern.push(999);
      haptics.success();
      expect(vibrate.mock.calls[2][0]).toEqual([15, 60, 30]);
    });

    it('distinguishes the impact strengths', () => {
      const vibrate = vi.fn().mockReturnValue(true);
      const haptics = setup(vibrate);

      haptics.impact('light');
      haptics.impact();
      haptics.impact('heavy');

      expect(vibrate.mock.calls.map(call => call[0] as number)).toEqual([10, 20, 40]);
    });

    it('reports false instead of propagating a throwing implementation', () => {
      const haptics = setup(
        vi.fn(() => {
          // Chrome throws here when the document has never been interacted with.
          throw new Error('vibration blocked');
        })
      );

      expect(haptics.impact()).toBe(false);
    });

    it('is inert on the server', () => {
      const vibrate = vi.fn();
      const haptics = setup(vibrate, 'server');

      expect(haptics.supported).toBe(false);
      expect(haptics.impact()).toBe(false);
      expect(vibrate).not.toHaveBeenCalled();
    });
  });

  describe('WrVisualViewport', () => {
    let handlers: Map<string, (() => void)[]>;
    let removedCount: number;
    let viewport: { height: number; offsetTop: number } | null;

    const stubViewport = (initial: { height: number; offsetTop: number } | null): void => {
      handlers = new Map();
      removedCount = 0;
      viewport = initial;
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value:
          initial === null
            ? undefined
            : {
                get height() {
                  return viewport!.height;
                },
                get offsetTop() {
                  return viewport!.offsetTop;
                },
                addEventListener: (type: string, fn: () => void) => {
                  handlers.set(type, [...(handlers.get(type) ?? []), fn]);
                },
                removeEventListener: () => removedCount++,
              },
      });
    };

    const inset = (): string => document.documentElement.style.getPropertyValue('--wr-keyboard-inset');

    const setup = (platform: 'browser' | 'server' = 'browser'): WrVisualViewport => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : [],
      });
      return TestBed.inject(WrVisualViewport);
    };

    beforeEach(() => {
      // jsdom reports 0 for `clientHeight`, so the layout viewport is stubbed
      // too — without it every inset computes to 0 and the maths is untestable.
      Object.defineProperty(document.documentElement, 'clientHeight', { value: 800, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
      document.documentElement.style.removeProperty('--wr-keyboard-inset');
    });

    it('publishes the keyboard band as a custom property', () => {
      stubViewport({ height: 500, offsetTop: 0 });
      const vv = setup();

      // 800 layout - 500 visible = a 300px keyboard. Overlays read this to sit
      // above it, so a wrong number puts a bottom sheet under the keyboard.
      expect(vv.bottomInset()).toBe(300);
      expect(inset()).toBe('300px');
    });

    it('reports no inset when nothing is covering the viewport', () => {
      stubViewport({ height: 800, offsetTop: 0 });
      const vv = setup();

      expect([vv.bottomInset(), inset()]).toEqual([0, '0px']);
    });

    it('follows the keyboard opening and closing again', () => {
      stubViewport({ height: 800, offsetTop: 0 });
      const vv = setup();

      viewport = { height: 460, offsetTop: 0 };
      for (const fn of handlers.get('resize') ?? []) fn();
      expect([vv.bottomInset(), inset()]).toEqual([340, '340px']);

      viewport = { height: 800, offsetTop: 0 };
      for (const fn of handlers.get('resize') ?? []) fn();
      // Left stale, every overlay keeps a 340px gap at the bottom of the screen
      // after the keyboard is gone.
      expect([vv.bottomInset(), inset()]).toEqual([0, '0px']);
    });

    it('counts the offset when the page is scrolled under the viewport', () => {
      stubViewport({ height: 500, offsetTop: 100 });
      const vv = setup();

      expect([vv.bottomInset(), vv.offsetTop()]).toEqual([200, 100]);
    });

    it('never reports a negative inset', () => {
      // A visual viewport taller than the layout one happens on desktop Safari
      // with the URL bar collapsing; a negative custom property is a broken
      // `calc()` everywhere it is used.
      stubViewport({ height: 900, offsetTop: 0 });

      expect(setup().bottomInset()).toBe(0);
    });

    it('cleans up its listeners and its custom property', () => {
      stubViewport({ height: 500, offsetTop: 0 });
      setup();
      expect(inset()).toBe('300px');

      TestBed.resetTestingModule();

      expect(removedCount).toBe(2);
      expect(inset()).toBe('');
    });

    it('stays at zero where there is no visualViewport at all', () => {
      stubViewport(null);
      const vv = setup();

      expect([vv.bottomInset(), vv.offsetTop(), inset()]).toEqual([0, 0, '']);
    });

    it('writes nothing during prerender', () => {
      stubViewport({ height: 500, offsetTop: 0 });
      const vv = setup('server');

      expect([vv.bottomInset(), inset()]).toEqual([0, '']);
    });
  });
});
