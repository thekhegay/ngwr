import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrHaptics } from './wr-haptics';
import { WrPlatform } from './wr-platform';

/**
 * Two thin wrappers over host capabilities that are routinely missing:
 * `matchMedia` does not exist in Node — where every showcase route is
 * prerendered — and `navigator.vibrate` does not exist on iOS Safari at all.
 * So "the API is absent" is the ordinary case here, not the edge, and it is
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
});
