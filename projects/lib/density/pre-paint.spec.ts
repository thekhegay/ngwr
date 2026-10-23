import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { WrStorage, withStorage } from 'ngwr/storage';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDensity } from './density';
import type { WrDensityValue } from './density-config';
import { wrDensityPrePaintScript } from './pre-paint';
import { withDensity } from './with-density';

/**
 * The density twin of `theme/pre-paint.spec.ts`, and worth shipping for the same
 * reason: the script has to agree with `WrDensity` and `WrStorage` about a format
 * neither advertises — the envelope, the prefix, the expiry, the default — in the
 * one code path that runs before anything can report an error.
 *
 * So the assertions EXECUTE the emitted source and read the attribute it leaves
 * on `<html>`, the one thing the density stylesheet selects on, and the last of
 * them run it against what a real `WrStorage` wrote.
 */
describe('wrDensityPrePaintScript', () => {
  const html = (): HTMLElement => document.documentElement;

  const reset = (): void => {
    html().removeAttribute('data-wr-density');
    html().removeAttribute('data-size');
  };

  /**
   * Run a script the way a `<script>` in `<head>` would, and report the density
   * it left — `null` when it wrote none. The Function constructor is the point:
   * what ships is SOURCE, and a syntax error in it is the failure this module
   * can actually have.
   */
  const run = (source: string, attribute = 'data-wr-density'): string | null => {
    reset();
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- executing the emitted source is the assertion
    new Function(source)();
    return html().getAttribute(attribute);
  };

  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  afterEach(() => {
    localStorage.clear();
    reset();
  });

  describe('reading the persisted density', () => {
    it('unwraps the envelope rather than the raw string', () => {
      localStorage.setItem('wr-density', JSON.stringify({ v: 'touch' }));

      expect(run(wrDensityPrePaintScript())).toBe('touch');
    });

    it('treats an expired envelope as absent', () => {
      localStorage.setItem('wr-density', JSON.stringify({ v: 'touch', e: Date.now() - 1000 }));

      expect(run(wrDensityPrePaintScript())).toBe('md');
    });

    it('honours a live expiry', () => {
      localStorage.setItem('wr-density', JSON.stringify({ v: 'sm', e: Date.now() + 60_000 }));

      expect(run(wrDensityPrePaintScript())).toBe('sm');
    });

    it('accepts the bare string `json: false` writes', () => {
      localStorage.setItem('wr-density', 'lg');

      expect(run(wrDensityPrePaintScript({ json: false }))).toBe('lg');
      expect(run(wrDensityPrePaintScript())).toBe('lg');
    });

    it('falls back to the default on a value that is not a density', () => {
      localStorage.setItem('wr-density', JSON.stringify({ v: 'cosy' }));

      expect(run(wrDensityPrePaintScript({ defaultDensity: 'sm' }))).toBe('sm');
      expect(run(wrDensityPrePaintScript())).toBe('md');
    });

    it('reads through the storage prefix', () => {
      localStorage.setItem('app:wr-density', JSON.stringify({ v: 'touch' }));

      expect(run(wrDensityPrePaintScript()), 'an unprefixed reader found a prefixed key').toBe('md');
      expect(run(wrDensityPrePaintScript({ storagePrefix: 'app:' }))).toBe('touch');
    });

    it('reads nothing when persistence is switched off', () => {
      localStorage.setItem('wr-density', JSON.stringify({ v: 'touch' }));

      expect(run(wrDensityPrePaintScript({ storageKey: null, defaultDensity: 'lg' }))).toBe('lg');
    });
  });

  describe('what it writes', () => {
    it('writes the default when nothing is stored, as the service does', () => {
      // `WrDensity` never leaves the attribute unset, so neither may the script:
      // a page painted without it and then given one would move anyway.
      expect(run(wrDensityPrePaintScript())).toBe('md');
      expect(run(wrDensityPrePaintScript({ defaultDensity: 'touch' }))).toBe('touch');
    });

    it('honours a custom attribute name', () => {
      localStorage.setItem('wr-density', JSON.stringify({ v: 'sm' }));

      expect(run(wrDensityPrePaintScript({ attribute: 'data-size' }), 'data-size')).toBe('sm');
      expect(html().hasAttribute('data-wr-density')).toBe(false);
    });

    it('accepts every density there is', () => {
      for (const density of ['sm', 'md', 'lg', 'touch'] satisfies WrDensityValue[]) {
        localStorage.setItem('wr-density', JSON.stringify({ v: density }));
        expect(run(wrDensityPrePaintScript({ defaultDensity: density === 'md' ? 'sm' : 'md' }))).toBe(density);
      }
    });
  });

  describe('when storage is unreachable', () => {
    it('writes the default instead of throwing', () => {
      const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get(): never {
          throw new Error('SecurityError');
        },
      });

      try {
        expect(() => run(wrDensityPrePaintScript({ defaultDensity: 'lg' }))).not.toThrow();
        expect(html().getAttribute('data-wr-density')).toBe('lg');
      } finally {
        if (real) Object.defineProperty(window, 'localStorage', real);
      }
    });
  });

  /**
   * The agreement, end to end: what `WrStorage` wrote, read back by the script,
   * compared against the attribute `WrDensity` painted.
   */
  describe('against the services it mirrors', () => {
    afterEach(() => TestBed.resetTestingModule());

    const boot = (prefix = ''): WrDensity => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWr(withStorage({ prefix }), withDensity())] });
      const density = TestBed.inject(WrDensity);
      TestBed.tick();
      return density;
    };

    it('writes what WrDensity wrote, from what WrStorage wrote', () => {
      const density = boot();

      for (const value of ['touch', 'sm', 'lg', 'md'] satisfies WrDensityValue[]) {
        density.set(value);
        TestBed.tick();

        expect(localStorage.getItem('wr-density'), 'WrStorage wrote nothing to read').not.toBeNull();
        const fromService = html().getAttribute('data-wr-density');
        expect(run(wrDensityPrePaintScript()), `disagreed on ${value}`).toBe(fromService);
      }
    });

    it('agrees through a storage prefix and a TTL', () => {
      boot('myapp:');
      TestBed.inject(WrStorage).set('wr-density', 'touch', { ttl: 60_000 });
      boot('myapp:');

      const fromService = html().getAttribute('data-wr-density');
      expect(fromService).toBe('touch');
      expect(run(wrDensityPrePaintScript({ storagePrefix: 'myapp:' }))).toBe(fromService);
    });
  });

  /**
   * The docs site is prerendered and carries a hand-written copy in its `<head>`
   * (index.html cannot import). Compared by BEHAVIOUR, the way the theme's twin
   * is, so the site runs the recipe it publishes.
   */
  it('answers exactly as the showcase index.html does', () => {
    const page = readFileSync(join(process.cwd(), 'projects/showcase/index.html'), 'utf8');
    const site = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map(match => match[1])
      .find(source => source.includes('data-wr-density'));
    expect(site, 'no density script in the showcase index.html').toBeTruthy();

    const shipped = wrDensityPrePaintScript();
    const cases: readonly (string | null)[] = [
      null,
      JSON.stringify({ v: 'sm' }),
      JSON.stringify({ v: 'md' }),
      JSON.stringify({ v: 'lg' }),
      JSON.stringify({ v: 'touch' }),
      JSON.stringify({ v: 'touch', e: Date.now() - 1000 }),
      JSON.stringify({ v: 'touch', e: Date.now() + 60_000 }),
      JSON.stringify({ v: 'cosy' }),
      'lg',
      'not json at all',
      '',
    ];
    const seen = new Set<string | null>();

    for (const stored of cases) {
      localStorage.clear();
      if (stored !== null) localStorage.setItem('wr-density', stored);

      const fromSite = run(site!);
      const fromLibrary = run(shipped);
      seen.add(fromSite);

      expect(fromLibrary, `disagreed on ${JSON.stringify(stored)}`).toBe(fromSite);
    }

    // Two scripts that never ran would agree on every case; the table holds
    // every density, so a site script that ran wrote each of them.
    expect([...seen].sort(), 'the showcase script never wrote a density').toEqual(['lg', 'md', 'sm', 'touch']);
  });
});
