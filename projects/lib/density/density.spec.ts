import { TestBed } from '@angular/core/testing';

import { createMemoryStorage, provideWrStorage } from 'ngwr/storage';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrDensity } from './density';
import type { WrDensityConfig } from './density-config';
import { provideWrDensity } from './provide-wr-density';

/**
 * Density is a token multiplier published as an attribute on `<html>`, so the
 * assertions read the document rather than the service's signal: a `current()`
 * that says `touch` while the page is still rendering at `md` is the failure.
 */
describe('WrDensity', () => {
  let engine: ReturnType<typeof createMemoryStorage>;

  const setup = (config: Partial<WrDensityConfig> = {}): WrDensity => {
    TestBed.configureTestingModule({
      providers: [provideWrStorage({ engine: () => engine }), provideWrDensity(config)],
    });
    const density = TestBed.inject(WrDensity);
    TestBed.tick();
    return density;
  };

  // `data-wr-density`, not `data-density` — the theme service uses the bare
  // `data-theme`, this one carries the library prefix. Both are public API that
  // consumer stylesheets select on, so the difference is load bearing.
  const attr = (name = 'data-wr-density'): string | null => document.documentElement.getAttribute(name);

  beforeEach(() => {
    engine = createMemoryStorage();
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute('data-wr-density');
  });

  it('publishes the default onto <html>', () => {
    const density = setup({ defaultDensity: 'md' });

    expect([density.current(), attr()]).toEqual(['md', 'md']);
  });

  it('mirrors a change to the attribute', () => {
    const density = setup({ defaultDensity: 'md' });
    density.set('touch');
    TestBed.tick();

    expect([density.current(), attr()]).toEqual(['touch', 'touch']);
  });

  it('ignores a value that is not a density', () => {
    const density = setup({ defaultDensity: 'md' });
    density.set('cosy' as never);
    TestBed.tick();

    // The guard is what keeps a bad value out of the signal's type, and out of
    // the attribute that stylesheets select on.
    expect([density.current(), attr()]).toEqual(['md', 'md']);
  });

  it('cycles through every step and wraps', () => {
    const density = setup({ defaultDensity: 'sm' });
    const seen: string[] = [density.current()];
    for (let i = 0; i < 4; i++) {
      density.cycle();
      TestBed.tick();
      seen.push(density.current());
    }

    expect(seen).toEqual(['sm', 'md', 'lg', 'touch', 'sm']);
  });

  it('persists the choice and restores it in a fresh injector', () => {
    setup({ defaultDensity: 'md' }).set('lg');
    TestBed.tick();

    TestBed.resetTestingModule();
    expect(setup({ defaultDensity: 'md' }).current()).toBe('lg');
  });

  it('ignores a persisted value that is not a density', () => {
    engine.setItem('wr-density', JSON.stringify({ v: 'roomy' }));

    expect(setup({ defaultDensity: 'sm' }).current()).toBe('sm');
  });

  it('writes nothing when persistence is switched off', () => {
    setup({ defaultDensity: 'md', storageKey: null }).set('touch');
    TestBed.tick();

    expect(engine.length).toBe(0);
    expect(attr()).toBe('touch');
  });

  it('honours a custom attribute name', () => {
    setup({ defaultDensity: 'lg', attribute: 'data-size' });

    expect(attr('data-size')).toBe('lg');
    expect(attr('data-wr-density')).toBeNull();
  });
});
