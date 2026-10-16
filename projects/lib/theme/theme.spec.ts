import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrStorage, createMemoryStorage } from 'ngwr/storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTheme } from './services/wr-theme';
import { DEFAULT_WR_THEME_CONFIG, WR_THEME_CONFIG, type WrThemeConfig } from './wr-theme-config';

/**
 * `WrTheme` has two jobs and both are side effects: it writes `color-scheme`
 * inline on `<html>` and it persists the choice. So the assertions here read
 * the DOM and the storage engine rather than the service's own signals — a
 * `resolved()` that says "dark" while the page is still light is the failure,
 * not the success.
 *
 * What it writes is deliberately less than what it resolves. The stylesheet
 * declares `color-scheme: light dark` on `:root`, so `auto` is the ABSENCE of an
 * inline scheme — the page follows the OS with nothing written — and only an
 * explicit `light` or `dark` lands on `<html>`. jsdom applies no stylesheet, so
 * these cannot watch a token flip; what they can hold is that the one property
 * the stylesheet answers to is written, cleared and left alone at the right
 * moments.
 *
 * `prefers-color-scheme` is stubbed through `matchMedia`, which is what
 * `WrPlatform.prefersDark` reads. jsdom has no implementation of it at all, so
 * without the stub `resolved()` cannot be exercised for `auto` in either
 * direction.
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

  /**
   * Storage is provided because the spec has to read what was persisted. The
   * THEME is not: nothing has to provide it, and a config is only given where a
   * test wants a non-default one — the way an app would.
   */
  const setup = (config: Partial<WrThemeConfig> = {}, platform: 'browser' | 'server' = 'browser'): WrTheme => {
    TestBed.configureTestingModule({
      providers: [
        provideWrStorage({ engine: () => engine }),
        { provide: WR_THEME_CONFIG, useValue: { ...DEFAULT_WR_THEME_CONFIG, ...config } },
        ...(platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : []),
      ],
    });
    const theme = TestBed.inject(WrTheme);
    TestBed.tick();
    return theme;
  };

  /** The inline scheme on `<html>` — `''` when none is written. */
  const scheme = (): string => document.documentElement.style.colorScheme;

  /**
   * The document outlives a test, so `<html>` is put back by hand. The `style`
   * ATTRIBUTE goes too: jsdom leaves an empty `style=""` behind once a property
   * is removed, and the server test asserts there is no attribute at all.
   */
  const reset = (): void => {
    document.documentElement.style.removeProperty('color-scheme');
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  };

  beforeEach(() => {
    engine = createMemoryStorage();
    systemDark = false;
    stubMatchMedia();
    TestBed.resetTestingModule();
    reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    reset();
  });

  it('paints an explicit mode onto <html>, not just into a signal', () => {
    const theme = setup({ defaultMode: 'dark' });

    expect(theme.resolved()).toBe('dark');
    expect(scheme()).toBe('dark');
  });

  it('leaves auto to the stylesheet, and still resolves it in both directions', () => {
    systemDark = true;
    const theme = setup({ defaultMode: 'auto' });

    // Writing the resolved scheme here would PIN the page: an inline `dark`
    // outranks the stylesheet's `light dark`, so the page would stop following
    // the OS the moment the service booted.
    expect([theme.resolved(), scheme()]).toEqual(['dark', '']);

    flipSystemTo(false);

    // `auto` that only reacts one way is the bug worth guarding: it looks
    // correct on a machine that never changes its appearance setting.
    expect([theme.resolved(), scheme()]).toEqual(['light', '']);
  });

  it('clears the inline scheme when the mode goes back to auto', () => {
    // Booted in `auto`, so the service has written nothing yet: the clear has to
    // follow the write `set()` made, not one the constructor happened to make.
    const theme = setup({ defaultMode: 'auto' });
    theme.set('dark');
    TestBed.tick();
    expect(scheme()).toBe('dark');

    theme.set('auto');
    TestBed.tick();

    // A leftover `dark` is the page that never hands control back to the OS.
    expect(scheme()).toBe('');
  });

  it('leaves a scheme the page wrote on <html> alone while it is in auto', () => {
    // The documented way to force a page's scheme without the service is to
    // write `color-scheme` on `<html>` yourself. A service that cleared the
    // inline value on every `auto` erased it the moment anything injected it —
    // a header toggle was enough.
    systemDark = true;
    document.documentElement.style.colorScheme = 'dark';
    const theme = setup({ defaultMode: 'auto' });

    expect([theme.mode(), scheme()]).toEqual(['auto', 'dark']);

    // An OS change re-runs nothing that writes; the page's scheme still stands.
    flipSystemTo(false);
    expect(scheme()).toBe('dark');
  });

  it('clears its own write when the user goes back to auto, over a page-written scheme too', () => {
    // Once the user picks, the user's choice is what is on `<html>`, and `auto`
    // hands that back to the OS rather than restoring what the page wrote first.
    document.documentElement.style.colorScheme = 'dark';
    const theme = setup({ defaultMode: 'auto' });

    theme.set('light');
    TestBed.tick();
    expect(scheme()).toBe('light');

    theme.set('auto');
    TestBed.tick();
    expect(scheme()).toBe('');
  });

  it('stops following the system once a mode is chosen explicitly', () => {
    const theme = setup({ defaultMode: 'auto' });
    theme.set('light');
    TestBed.tick();

    flipSystemTo(true);

    expect([theme.mode(), theme.resolved(), scheme()]).toEqual(['light', 'light', 'light']);
  });

  it('toggle() flips what is on screen, which is what the user sees', () => {
    systemDark = true;
    const theme = setup({ defaultMode: 'auto' });
    expect(theme.resolved()).toBe('dark');

    // From `auto`, the flip has to be judged against the RESOLVED scheme — going
    // by `mode` would set 'dark' over an already-dark page and do nothing.
    theme.toggle();
    TestBed.tick();
    expect([theme.mode(), scheme()]).toEqual(['light', 'light']);

    theme.toggle();
    TestBed.tick();
    expect([theme.mode(), scheme()]).toEqual(['dark', 'dark']);
  });

  it('persists the mode and reads it back in a fresh injector', () => {
    const theme = setup();
    theme.set('dark');
    TestBed.tick();

    TestBed.resetTestingModule();
    reset();
    // Same engine, new service instance — this is a page reload.
    const reloaded = setup();
    expect([reloaded.mode(), scheme()]).toEqual(['dark', 'dark']);
  });

  it('persists the MODE, not the resolved scheme', () => {
    systemDark = true;
    const theme = setup({ defaultMode: 'auto' });
    expect(theme.resolved()).toBe('dark');

    TestBed.resetTestingModule();
    systemDark = false;

    // Storing 'dark' here would freeze the user out of auto: they picked
    // "follow the system" and would come back to a fixed dark theme.
    const reloaded = setup({ defaultMode: 'auto' });
    expect([reloaded.mode(), reloaded.resolved(), scheme()]).toEqual(['auto', 'light', '']);
  });

  it('ignores a persisted value that is not a theme mode', () => {
    engine.setItem('wr-theme', JSON.stringify({ v: 'chartreuse' }));

    // Storage is shared with the page's other scripts and survives upgrades, so
    // a foreign value must not become the mode signal's type.
    expect(setup({ defaultMode: 'light' }).mode()).toBe('light');
  });

  it('writes nothing to storage when persistence is switched off', () => {
    const theme = setup({ storageKey: null });
    theme.set('dark');
    TestBed.tick();

    expect(engine.length).toBe(0);
    expect(scheme()).toBe('dark');
  });

  it('needs no provider, and takes the documented defaults without one', () => {
    // `provideWrTheme()` existed so an initializer could create the service and
    // write `[data-theme]` before anything injected it. The stylesheet follows
    // the OS on its own now, so `auto` needs nothing written. A stored choice or
    // a non-`auto` default still does, and lands when the service is first
    // injected — which is why the docs say to inject it once at boot or ship
    // the pre-paint script.
    TestBed.configureTestingModule({ providers: [provideWrStorage({ engine: () => engine })] });
    const theme = TestBed.inject(WrTheme);
    TestBed.tick();

    expect(theme.mode()).toBe(DEFAULT_WR_THEME_CONFIG.defaultMode);
    expect(scheme()).toBe('');

    theme.set('dark');
    TestBed.tick();
    expect(engine.getItem(DEFAULT_WR_THEME_CONFIG.storageKey!)).not.toBeNull();
  });

  it('writes nothing on the server, so the prerendered <html> carries no inline scheme', () => {
    // A server has no `prefers-color-scheme` and no `localStorage`, so whatever
    // it wrote would be a guess — and an inline guess serialises into every
    // prerendered page, outranking the stylesheet that would have got `auto`
    // right on its own.
    const theme = setup({ defaultMode: 'dark' }, 'server');
    theme.set('light');
    TestBed.tick();

    expect(scheme()).toBe('');
    expect(document.documentElement.hasAttribute('style')).toBe(false);
    expect(engine.length).toBe(0);
  });

  it('writes the scheme and nothing else onto <html>', () => {
    setup({ defaultMode: 'dark' });

    // The attribute v14 wrote is gone with the selector that read it; one left
    // behind would match a consumer's old `[data-theme='dark']` rule and
    // nothing of ngwr's.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.documentElement.getAttribute('style')).toBe('color-scheme: dark;');
  });
});
