import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { WrStorage, withStorage } from 'ngwr/storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrThemePrePaintScript } from './pre-paint';
import { WrTheme } from './services/wr-theme';

/**
 * The pre-paint script exists because nothing inside the application can close
 * the SSR flash of a CHOSEN scheme: the server has no `localStorage`, so a
 * prerendered page follows the OS for everybody and the visitor's own choice
 * arrives after the first paint. `auto` needs no script at all — the stylesheet
 * declares `color-scheme: light dark` — which is why the script writes nothing
 * for it.
 *
 * What makes the script worth SHIPPING rather than describing is that it has to
 * agree with two services at once about a format neither of them advertises —
 * `WrStorage`'s JSON envelope, its prefix, its expiry, and `WrTheme`'s default
 * mode. A hand-copied version is correct on the day it is pasted and wrong
 * after the upgrade that changes any of them, silently, in the one code path
 * that runs before anything can report an error.
 *
 * So the assertions here EXECUTE the emitted source and read the inline
 * `color-scheme` it leaves on `<html>` — the one property the stylesheet answers
 * to — and the last of them runs it against a value written by a real
 * `WrStorage`, which is the agreement itself rather than a restatement of it.
 */
describe('wrThemePrePaintScript', () => {
  let systemDark: boolean;

  /**
   * jsdom implements no `matchMedia` at all. The script must not need one, and
   * a stub that answers "dark" is how the specs below show it never asks.
   */
  const stubMatchMedia = (): void => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      matches: query.includes('prefers-color-scheme: dark') ? systemDark : false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }));
  };

  const reset = (): void => {
    document.documentElement.style.removeProperty('color-scheme');
    document.documentElement.removeAttribute('style');
  };

  /**
   * Run a script the way a `<script>` in `<head>` would, and report the inline
   * scheme it left — `''` when it wrote none.
   *
   * The Function constructor is the point rather than a shortcut: what ships is
   * SOURCE, so a spec that imported the logic as TypeScript would be checking a
   * different artefact from the one a consumer pastes — and would pass over a
   * syntax error, which is the failure this module can actually have.
   */
  const run = (source: string): string => {
    reset();
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- executing the emitted source is the assertion
    new Function(source)();
    return document.documentElement.style.colorScheme;
  };

  beforeEach(() => {
    systemDark = false;
    stubMatchMedia();
    localStorage.clear();
    reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    reset();
  });

  describe('reading the persisted mode', () => {
    it('unwraps the envelope rather than the raw string', () => {
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'dark' }));

      // The whole reason this ships: `'dark'` is stored as `{"v":"dark"}`, and a
      // consumer writing the script by hand reads the key, gets an object, and
      // decides the library stores a bare string.
      expect(run(wrThemePrePaintScript())).toBe('dark');
    });

    it('treats an expired envelope as absent', () => {
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'dark', e: Date.now() - 1000 }));

      expect(run(wrThemePrePaintScript())).toBe('');
    });

    it('honours a live expiry', () => {
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'dark', e: Date.now() + 60_000 }));

      expect(run(wrThemePrePaintScript())).toBe('dark');
    });

    it('accepts the bare string `json: false` writes', () => {
      localStorage.setItem('wr-theme', 'dark');

      expect(run(wrThemePrePaintScript({ json: false }))).toBe('dark');
      // And the envelope reader falls through to the same answer, which is what
      // `WrStorage.get` does — so turning the envelope off cannot break a script
      // generated before it was.
      expect(run(wrThemePrePaintScript())).toBe('dark');
    });

    it('falls back to the default mode on a value that is not a mode', () => {
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'purple' }));

      expect(run(wrThemePrePaintScript({ defaultMode: 'dark' }))).toBe('dark');
      expect(run(wrThemePrePaintScript()), 'the default mode is auto, which writes nothing').toBe('');
    });

    it('applies an explicit default mode when nothing is persisted', () => {
      // `WrTheme` applies its `defaultMode` on boot; a script that did not would
      // paint the OS scheme first and hand over a page the app then repaints.
      expect(run(wrThemePrePaintScript({ defaultMode: 'light' }))).toBe('light');
    });

    it('reads through the storage prefix', () => {
      localStorage.setItem('app:wr-theme', JSON.stringify({ v: 'dark' }));

      expect(run(wrThemePrePaintScript()), 'an unprefixed reader found a prefixed key').toBe('');
      expect(run(wrThemePrePaintScript({ storagePrefix: 'app:' }))).toBe('dark');
    });
  });

  describe('what it writes', () => {
    it('writes nothing for auto, whatever the system prefers', () => {
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'auto' }));

      // Writing the resolved scheme would PIN the page: an inline `dark`
      // outranks the stylesheet's `light dark`, so a visitor who switches their
      // OS back to light mid-session would stay dark.
      for (const dark of [true, false]) {
        systemDark = dark;
        expect(run(wrThemePrePaintScript()), `systemDark=${dark}`).toBe('');
      }
    });

    it('never asks the system at all', () => {
      const matchMedia = vi.fn();
      vi.stubGlobal('matchMedia', matchMedia);

      for (const stored of [null, 'auto', 'light', 'dark']) {
        localStorage.clear();
        if (stored !== null) localStorage.setItem('wr-theme', JSON.stringify({ v: stored }));
        run(wrThemePrePaintScript());
      }

      // The stylesheet answers `prefers-color-scheme` already; a script that
      // asked too would be a second answer to one question, and the first
      // place the two could disagree.
      expect(matchMedia).not.toHaveBeenCalled();
    });

    it('lets an explicit choice outrank the system', () => {
      systemDark = true;
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'light' }));

      expect(run(wrThemePrePaintScript())).toBe('light');
    });

    it('writes the scheme and nothing else onto <html>', () => {
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'dark' }));
      run(wrThemePrePaintScript());

      expect(document.documentElement.getAttribute('style')).toBe('color-scheme: dark;');
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });
  });

  describe('when storage is unreachable', () => {
    /**
     * Private mode, a sandboxed iframe, cookies off. This script runs before
     * anything else on the page, so a throw here is not a degraded theme — it is
     * a `<head>` that stopped executing.
     */
    it('leaves the page on the OS scheme instead of throwing', () => {
      const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get(): never {
          throw new Error('SecurityError');
        },
      });

      try {
        expect(() =>
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- as above: the emitted source is what is under test
          new Function(wrThemePrePaintScript())()
        ).not.toThrow();
        expect(document.documentElement.style.colorScheme).toBe('');
      } finally {
        if (real) Object.defineProperty(window, 'localStorage', real);
      }
    });
  });

  /**
   * The agreement, end to end: what `WrStorage` actually wrote, read back by the
   * script, compared against what `WrTheme` actually painted. Every case above
   * asserts against a format spelled out in the spec file; this one asserts
   * against the services, so a change to the envelope fails here rather than in
   * a consumer's `<head>`.
   */
  describe('against the services it mirrors', () => {
    afterEach(() => TestBed.resetTestingModule());

    /** `WrTheme` needs no provider — only storage is configured, the way an app would. */
    const boot = (prefix = ''): WrTheme => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWr(withStorage({ prefix }))] });
      const theme = TestBed.inject(WrTheme);
      TestBed.tick();
      return theme;
    };

    /** What the service left on `<html>`, before `run()` clears it. */
    const painted = (): string => document.documentElement.style.colorScheme;

    it('writes what WrTheme wrote, from what WrStorage wrote', () => {
      const theme = boot();

      for (const mode of ['dark', 'light', 'auto'] as const) {
        theme.set(mode);
        TestBed.tick();

        const raw = localStorage.getItem('wr-theme');
        expect(raw, 'WrStorage wrote nothing to read').not.toBeNull();

        const fromService = painted();
        expect(run(wrThemePrePaintScript()), `disagreed on ${mode}`).toBe(fromService);
      }
    });

    it('agrees through a storage prefix and a TTL', () => {
      const theme = boot('myapp:');
      theme.set('dark');
      TestBed.tick();
      // A default TTL means every key carries an expiry, including this one.
      TestBed.inject(WrStorage).set('wr-theme', 'dark', { ttl: 60_000 });

      const fromService = painted();
      expect(fromService).toBe('dark');
      expect(run(wrThemePrePaintScript({ storagePrefix: 'myapp:' }))).toBe(fromService);
    });
  });

  /**
   * The docs site is prerendered and hit this first; its `<head>` has carried a
   * hand-written copy of this logic since before the library shipped one.
   *
   * Compared by BEHAVIOUR rather than by text, because the two are formatted by
   * different tools and a byte comparison would fail on a line break. What has
   * to hold is that the site is running the recipe it publishes — the drift this
   * whole module exists to prevent, demonstrated on the one page that would
   * otherwise be the reference implementation.
   */
  it('answers exactly as the showcase index.html does', () => {
    const html = readFileSync(join(process.cwd(), 'projects/showcase/index.html'), 'utf8');
    const site = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(site, 'no inline script in the showcase index.html').toBeTruthy();

    const shipped = wrThemePrePaintScript();
    const cases: readonly (string | null)[] = [
      null,
      JSON.stringify({ v: 'dark' }),
      JSON.stringify({ v: 'light' }),
      JSON.stringify({ v: 'auto' }),
      JSON.stringify({ v: 'dark', e: Date.now() - 1000 }),
      JSON.stringify({ v: 'dark', e: Date.now() + 60_000 }),
      JSON.stringify({ v: 'purple' }),
      'dark',
      'not json at all',
      '',
    ];
    const seen = new Set<string>();

    for (const dark of [false, true]) {
      systemDark = dark;
      for (const stored of cases) {
        localStorage.clear();
        if (stored !== null) localStorage.setItem('wr-theme', stored);

        const fromSite = run(site!);
        const fromLibrary = run(shipped);
        seen.add(fromSite);

        expect(fromLibrary, `disagreed on ${JSON.stringify(stored)} with systemDark=${dark}`).toBe(fromSite);
      }
    }

    // Both scripts swallow their own errors, and `auto` legitimately writes
    // nothing — so two scripts that never ran would agree perfectly on every
    // case. The explicit modes in the table are what prove the site's ran.
    expect([...seen].sort(), 'the showcase script never wrote a scheme').toEqual(['', 'dark', 'light']);
  });
});
