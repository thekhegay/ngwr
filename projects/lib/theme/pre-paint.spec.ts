import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { WrStorage, provideWrStorage } from 'ngwr/storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrThemePrePaintScript } from './pre-paint';
import { provideWrTheme } from './provide-wr-theme';
import { WrTheme } from './services/wr-theme';

/**
 * The pre-paint script exists because nothing inside the application can close
 * the SSR theme flash: the server has no `localStorage` and no
 * `prefers-color-scheme`, so a prerendered page ships one attribute for
 * everybody and the correction arrives after the first paint.
 *
 * What makes the script worth SHIPPING rather than describing is that it has to
 * agree with two services at once about a format neither of them advertises —
 * `WrStorage`'s JSON envelope, its prefix, its expiry, and `WrTheme`'s `auto`
 * fallback. A hand-copied version is correct on the day it is pasted and wrong
 * after the upgrade that changes any of them, silently, in the one code path
 * that runs before anything can report an error.
 *
 * So the assertions here EXECUTE the emitted source and read the attribute it
 * leaves on `<html>` — the only thing a visitor sees — and the last of them runs
 * it against a value written by a real `WrStorage`, which is the agreement
 * itself rather than a restatement of it.
 */
describe('wrThemePrePaintScript', () => {
  let systemDark: boolean;

  /** jsdom implements no `matchMedia` at all, so `auto` needs one to resolve. */
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

  /**
   * Run a script the way a `<script>` in `<head>` would, and report the result.
   *
   * The Function constructor is the point rather than a shortcut: what ships is
   * SOURCE, so a spec that imported the logic as TypeScript would be checking a
   * different artefact from the one a consumer pastes — and would pass over a
   * syntax error, which is the failure this module can actually have.
   */
  const run = (source: string): string | null => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('app-theme');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- executing the emitted source is the assertion
    new Function(source)();
    return document.documentElement.getAttribute('data-theme') ?? document.documentElement.getAttribute('app-theme');
  };

  beforeEach(() => {
    systemDark = false;
    stubMatchMedia();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('app-theme');
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

      expect(run(wrThemePrePaintScript())).toBe('light');
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
    });

    it('reads through the storage prefix', () => {
      localStorage.setItem('app:wr-theme', JSON.stringify({ v: 'dark' }));

      expect(run(wrThemePrePaintScript()), 'an unprefixed reader found a prefixed key').toBe('light');
      expect(run(wrThemePrePaintScript({ storagePrefix: 'app:' }))).toBe('dark');
    });
  });

  describe('resolving', () => {
    it('follows the system in auto, in both directions', () => {
      systemDark = true;
      expect(run(wrThemePrePaintScript())).toBe('dark');

      systemDark = false;
      // An `auto` that only resolves one way looks correct on a machine that
      // never changes its appearance setting.
      expect(run(wrThemePrePaintScript())).toBe('light');
    });

    it('lets an explicit choice outrank the system', () => {
      systemDark = true;
      localStorage.setItem('wr-theme', JSON.stringify({ v: 'light' }));

      expect(run(wrThemePrePaintScript())).toBe('light');
    });

    it('resolves light when the browser answers no media query', () => {
      vi.stubGlobal('matchMedia', undefined);
      systemDark = true;

      // `WrPlatform.prefersDark` reports `false` with no `matchMedia`, and the
      // two have to agree or the script hands over a page the app then repaints.
      expect(run(wrThemePrePaintScript())).toBe('light');
    });

    it('writes the configured attribute', () => {
      localStorage.setItem('theme-mode', JSON.stringify({ v: 'dark' }));

      const attribute = run(wrThemePrePaintScript({ attribute: 'app-theme', storageKey: 'theme-mode' }));

      expect(attribute).toBe('dark');
      expect(document.documentElement.getAttribute('app-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme'), 'wrote the default attribute too').toBeNull();
    });
  });

  describe('when storage is unreachable', () => {
    /**
     * Private mode, a sandboxed iframe, cookies off. This script runs before
     * anything else on the page, so a throw here is not a degraded theme — it is
     * a `<head>` that stopped executing.
     */
    it('leaves the prerendered attribute in place instead of throwing', () => {
      const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get(): never {
          throw new Error('SecurityError');
        },
      });

      try {
        document.documentElement.setAttribute('data-theme', 'light');
        expect(() =>
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- as above: the emitted source is what is under test
          new Function(wrThemePrePaintScript())()
        ).not.toThrow();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      } finally {
        if (real) Object.defineProperty(window, 'localStorage', real);
      }
    });
  });

  /**
   * The agreement, end to end: what `WrStorage` actually wrote, read back by the
   * script, compared against what `WrTheme` actually resolved. Every case above
   * asserts against a format spelled out in the spec file; this one asserts
   * against the services, so a change to the envelope fails here rather than in
   * a consumer's `<head>`.
   */
  describe('against the services it mirrors', () => {
    afterEach(() => TestBed.resetTestingModule());

    const boot = (prefix = ''): WrTheme => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideWrStorage({ prefix }), provideWrTheme()] });
      const theme = TestBed.inject(WrTheme);
      TestBed.tick();
      return theme;
    };

    it('resolves what WrTheme resolved, from what WrStorage wrote', () => {
      const theme = boot();
      theme.set('dark');
      TestBed.tick();

      const raw = localStorage.getItem('wr-theme');
      expect(raw, 'WrStorage wrote nothing to read').not.toBeNull();

      expect(run(wrThemePrePaintScript())).toBe(theme.resolved());
    });

    it('agrees through a storage prefix and a TTL', () => {
      const theme = boot('myapp:');
      theme.set('dark');
      TestBed.tick();
      // A default TTL means every key carries an expiry, including this one.
      TestBed.inject(WrStorage).set('wr-theme', 'dark', { ttl: 60_000 });

      expect(run(wrThemePrePaintScript({ storagePrefix: 'myapp:' }))).toBe(theme.resolved());
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

    for (const dark of [false, true]) {
      systemDark = dark;
      for (const stored of cases) {
        localStorage.clear();
        if (stored !== null) localStorage.setItem('wr-theme', stored);

        const fromSite = run(site!);
        const fromLibrary = run(shipped);

        // Both scripts swallow their own errors, so two nulls would agree
        // perfectly about nothing having run.
        expect(fromSite, 'the showcase script resolved no theme at all').toMatch(/^(light|dark)$/);
        expect(fromLibrary, `disagreed on ${JSON.stringify(stored)} with systemDark=${dark}`).toBe(fromSite);
      }
    }
  });
});
