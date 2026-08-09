import { TestBed } from '@angular/core/testing';

import { provideWrStorage, createMemoryStorage } from 'ngwr/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideWrTheme } from './provide-wr-theme';
import { WrTheme } from './services/wr-theme';
import type { WrThemeConfig } from './wr-theme-config';

/**
 * `WrTheme` has two jobs and both are side effects: it writes an attribute onto
 * `<html>` and it persists the choice. So the assertions here read the DOM and
 * the storage engine rather than the service's own signals — a `resolved()` that
 * says "dark" while the page is still light is the failure, not the success.
 *
 * `prefers-color-scheme` is stubbed through `matchMedia`, which is what
 * `WrPlatform.prefersDark` reads. jsdom has no implementation of it at all, so
 * without the stub `auto` cannot be exercised in either direction.
 */
describe('WrTheme', () => {
  let engine: ReturnType<typeof createMemoryStorage>;
  let listeners: ((event: MediaQueryListEvent) => void)[];
  let systemDark: boolean;

  /** Minimal `matchMedia` that only knows the one query the theme asks about. */
  const stubMatchMedia = (): void => {
    listeners = [];
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      matches: query.includes('prefers-color-scheme: dark') ? systemDark : false,
      addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.push(fn),
      removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => {
        listeners = listeners.filter(l => l !== fn);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }));
  };

  const flipSystemTo = (dark: boolean): void => {
    systemDark = dark;
    for (const fn of listeners) fn({ matches: dark } as MediaQueryListEvent);
    TestBed.tick();
  };

  const setup = (config: Partial<WrThemeConfig> = {}): WrTheme => {
    TestBed.configureTestingModule({
      providers: [provideWrStorage({ engine: () => engine }), provideWrTheme(config)],
    });
    const theme = TestBed.inject(WrTheme);
    TestBed.tick();
    return theme;
  };

  const attr = (name = 'data-theme'): string | null => document.documentElement.getAttribute(name);

  beforeEach(() => {
    engine = createMemoryStorage();
    systemDark = false;
    stubMatchMedia();
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
  });

  it('paints the resolved theme onto <html>, not just into a signal', () => {
    const theme = setup({ defaultMode: 'light' });

    expect(theme.resolved()).toBe('light');
    expect(attr()).toBe('light');
  });

  it('follows the system in auto mode, in both directions', () => {
    systemDark = true;
    const theme = setup({ defaultMode: 'auto' });
    expect([theme.resolved(), attr()]).toEqual(['dark', 'dark']);

    flipSystemTo(false);

    // `auto` that only reacts one way is the bug worth guarding: it looks
    // correct on a machine that never changes its appearance setting.
    expect([theme.resolved(), attr()]).toEqual(['light', 'light']);
  });

  it('stops following the system once a mode is chosen explicitly', () => {
    const theme = setup({ defaultMode: 'auto' });
    theme.set('light');
    TestBed.tick();

    flipSystemTo(true);

    expect([theme.mode(), theme.resolved(), attr()]).toEqual(['light', 'light', 'light']);
  });

  it('toggle() flips what is on screen, which is what the user sees', () => {
    systemDark = true;
    const theme = setup({ defaultMode: 'auto' });
    expect(theme.resolved()).toBe('dark');

    // From `auto`, the flip has to be judged against the RESOLVED theme — going
    // by `mode` would set 'dark' over an already-dark page and do nothing.
    theme.toggle();
    TestBed.tick();
    expect([theme.mode(), attr()]).toEqual(['light', 'light']);

    theme.toggle();
    TestBed.tick();
    expect([theme.mode(), attr()]).toEqual(['dark', 'dark']);
  });

  it('persists the mode and reads it back in a fresh injector', () => {
    const theme = setup();
    theme.set('dark');
    TestBed.tick();

    TestBed.resetTestingModule();
    // Same engine, new service instance — this is a page reload.
    expect(setup().mode()).toBe('dark');
  });

  it('persists the MODE, not the resolved theme', () => {
    systemDark = true;
    const theme = setup({ defaultMode: 'auto' });
    expect(theme.resolved()).toBe('dark');

    TestBed.resetTestingModule();
    systemDark = false;

    // Storing 'dark' here would freeze the user out of auto: they picked
    // "follow the system" and would come back to a fixed dark theme.
    expect(setup({ defaultMode: 'auto' }).mode()).toBe('auto');
    expect(attr()).toBe('light');
  });

  it('ignores a persisted value that is not a theme mode', () => {
    engine.setItem('wr-theme', JSON.stringify({ v: 'chartreuse' }));

    // Storage is shared with the page's other scripts and survives upgrades, so
    // a foreign value must not become the mode signal's type.
    expect(setup({ defaultMode: 'light' }).mode()).toBe('light');
  });

  it('writes nothing when persistence is switched off', () => {
    const theme = setup({ storageKey: null });
    theme.set('dark');
    TestBed.tick();

    expect(engine.length).toBe(0);
    expect(attr()).toBe('dark');
  });

  it('honours a custom attribute name', () => {
    setup({ defaultMode: 'dark', attribute: 'data-mode' });

    expect(attr('data-mode')).toBe('dark');
    expect(attr('data-theme')).toBeNull();
  });
});
