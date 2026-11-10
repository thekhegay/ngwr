import { Component, createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { WrI18n } from './i18n';
import { provideWrI18n } from './provide-wr-i18n';

@Component({ template: '' })
class AdminArea {}

describe('provideWrI18n outside the root injector', () => {
  let warn: MockInstance<typeof console.warn>;

  beforeEach(() => {
    localStorage.clear();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    TestBed.resetTestingModule();
  });

  it('stays quiet in the root injector', () => {
    TestBed.configureTestingModule({ providers: [provideWrI18n({ availableLocales: ['en', 'de'] })] });
    expect(TestBed.inject(WrI18n).available()).toEqual(['en', 'de']);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns for a lazy route's providers, which the root service never reads", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'admin', providers: [provideWrI18n({ availableLocales: ['en', 'de'] })], component: AdminArea },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create('/admin');

    const inArea = harness.routeDebugElement?.injector.get(WrI18n);
    expect(inArea).toBe(TestBed.inject(WrI18n));
    expect(inArea?.available()).not.toContain('de');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/^\[NGWR\] provideWrI18n\(\) is in a route/);
  });

  it('stays quiet when the child injector provides WrI18n itself', () => {
    const child = createEnvironmentInjector(
      [WrI18n, provideWrI18n({ availableLocales: ['en', 'de'] })],
      TestBed.inject(EnvironmentInjector)
    );

    expect(child.get(WrI18n)).not.toBe(TestBed.inject(WrI18n));
    expect(child.get(WrI18n).available()).toEqual(['en', 'de']);
    expect(warn).not.toHaveBeenCalled();
    child.destroy();
  });
});
