import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrMedia } from './wr-media';

/**
 * Everything here hangs off a stubbed `matchMedia`: jsdom has none, so without
 * one `WrMedia` is untestable rather than merely untested. The stub parses the
 * `(min-width: Npx)` form itself and answers from a viewport width the test
 * controls, which is what makes "resize past a breakpoint" expressible.
 */
describe('WrMedia', () => {
  let width: number;
  let queries: Map<string, { listeners: ((event: MediaQueryListEvent) => void)[]; removed: number }>;

  const matchesAt = (query: string, px: number): boolean => {
    const min = /\(min-width:\s*(\d+)px\)/.exec(query);
    return min ? px >= Number(min[1]) : false;
  };

  const stubMatchMedia = (): void => {
    queries = new Map();
    vi.stubGlobal('matchMedia', (query: string) => {
      const entry = queries.get(query) ?? { listeners: [], removed: 0 };
      queries.set(query, entry);
      return {
        media: query,
        get matches() {
          return matchesAt(query, width);
        },
        addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => entry.listeners.push(fn),
        removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
          entry.listeners = entry.listeners.filter(l => l !== fn);
          entry.removed++;
        },
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      };
    });
  };

  // `vi.stubGlobal` is NOT undone between files unless it is undone here: vitest
  // only auto-restores globals when `unstubGlobals` is configured, and this suite
  // does not set it. The server test below installs a matchMedia that THROWS, and
  // leaving that behind means the next file to construct `WrPlatform` — which
  // reads two media queries in its field initializers — dies with a prerender
  // error from a file that never mentioned matchMedia. That is a red CI run whose
  // stack points at innocent code, and it depends on file order, so it reproduces
  // roughly half the time.
  afterEach(() => vi.unstubAllGlobals());

  /** Move the viewport and fire `change` on every query whose answer flipped. */
  const resizeTo = (px: number): void => {
    const before = [...queries.keys()].map(q => [q, matchesAt(q, width)] as const);
    width = px;
    for (const [query, was] of before) {
      const now = matchesAt(query, px);
      if (was === now) continue;
      for (const fn of queries.get(query)!.listeners) fn({ matches: now } as MediaQueryListEvent);
    }
    TestBed.tick();
  };

  beforeEach(() => {
    width = 1280;
    stubMatchMedia();
    TestBed.resetTestingModule();
  });

  const setup = (): WrMedia => {
    TestBed.configureTestingModule({});
    return TestBed.inject(WrMedia);
  };

  it('resolves a named breakpoint to a min-width query', () => {
    const media = setup();
    width = 500;

    expect(media.matches('md')()).toBe(false);
    expect([...queries.keys()].some(q => /\(min-width:\s*\d+px\)/.test(q))).toBe(true);
  });

  it('passes a raw query through untouched', () => {
    const media = setup();
    media.matches('(prefers-color-scheme: dark)');

    expect([...queries.keys()]).toContain('(prefers-color-scheme: dark)');
  });

  it('shares one listener per query however many callers ask', () => {
    const media = setup();
    const a = media.matches('md');
    const b = media.matches('md');

    // The cache is the whole reason this is a service and not a helper: a
    // component tree asking `matches('md')` in fifty places must not install
    // fifty `matchMedia` listeners.
    expect(a).toBe(b);
    expect([...queries.values()].reduce((n, q) => n + q.listeners.length, 0)).toBe(1);
  });

  it('tracks a resize across the breakpoint, in both directions', () => {
    const media = setup();
    const isMd = media.matches('md');
    expect(isMd()).toBe(true);

    resizeTo(320);
    expect(isMd()).toBe(false);

    resizeTo(1280);
    expect(isMd()).toBe(true);
  });

  it('reports the largest matching breakpoint as current', () => {
    const media = setup();

    resizeTo(320);
    expect(media.current()).toBe('xs');

    resizeTo(800);
    expect(media.current()).toBe('md');

    resizeTo(1600);
    expect(media.current()).toBe('xxl');
  });

  it('tears its listeners down with the injector', () => {
    const media = setup();
    media.matches('md');
    media.matches('(prefers-reduced-motion: reduce)');

    TestBed.resetTestingModule();

    // A service that outlives its listeners keeps a dead closure alive per
    // query, and in a test run that compounds file after file.
    expect([...queries.values()].every(q => q.listeners.length === 0)).toBe(true);
  });

  describe('on the server', () => {
    it('answers false without reaching for matchMedia at all', () => {
      vi.stubGlobal('matchMedia', () => {
        throw new Error('matchMedia must not be called during prerender');
      });
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const media = TestBed.inject(WrMedia);

      // The showcase prerenders every route in Node, where `matchMedia` does
      // not exist — so this is a build failure, not a degraded experience.
      expect(media.matches('md')()).toBe(false);
      expect(media.current()).toBe('xs');
    });
  });
});
