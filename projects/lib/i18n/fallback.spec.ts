import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrI18n } from './i18n';
import { provideWrI18n, provideWrI18nStaticLoader } from './provide-wr-i18n';
import { WrTDirective } from './t.directive';
import { WrTPipe } from './t.pipe';

const CATALOGS = {
  en: { types: { truck: 'Truck', load: '{{count}} t' } },
  ru: { types: { truck: 'Грузовик', load: '{{count}} т', depot: 'Депо' } },
};

@Component({
  imports: [WrTPipe, WrTDirective],
  template: `<span class="pipe">{{ 'types.' + type() | wrT: null : { fallback: type() } }}</span
    ><span class="params">{{ 'types.load' | wrT: { count: 3 } : { fallback: 'raw' } }}</span
    ><span class="directive" [wrT]="'types.' + type()" [wrTFallback]="type()"></span>`,
})
class Host {
  readonly type = signal('depot');
}

describe('a fallback for a missing key', () => {
  const missingHandler = vi.fn((key: string) => `?${key}`);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  // `use()` persists the locale, and jsdom's localStorage outlives TestBed.
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'ru'], missingHandler }),
        provideWrI18nStaticLoader(CATALOGS, { fleet: { en: { types: { truck: 'Fleet truck' } } } }),
      ],
    });
  });

  afterEach(() => {
    missingHandler.mockClear();
    warn.mockClear();
    error.mockClear();
  });

  const settle = async (): Promise<void> => {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  };

  const service = async (): Promise<WrI18n> => {
    const i18n = TestBed.inject(WrI18n);
    await settle();
    return i18n;
  };

  const mount = async (): Promise<ComponentFixture<Host>> => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  const textOf = (fixture: ComponentFixture<Host>, selector: string): string =>
    (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim() ?? '';

  it('returns the fallback for a missing key, silently', async () => {
    const i18n = await service();
    missingHandler.mockClear();

    expect(i18n.t('types.depot', undefined, { fallback: 'depot' })).toBe('depot');
    expect(missingHandler).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('still calls missingHandler when no fallback is given', async () => {
    const i18n = await service();

    expect(i18n.t('types.depot')).toBe('?types.depot');
    expect(i18n.t('types.depot', undefined, { fallback: null })).toBe('?types.depot');
    expect(i18n.t('types.depot', undefined, { scope: 'fleet' })).toBe('?types.depot');
  });

  it('accepts an empty string as the fallback', async () => {
    expect((await service()).t('types.depot', undefined, { fallback: '' })).toBe('');
  });

  it('ignores the fallback when the key is present', async () => {
    const i18n = await service();

    expect(i18n.t('types.truck', undefined, { fallback: 'truck' })).toBe('Truck');
    expect(i18n.t('types.load', { count: 3 }, { fallback: 'load' })).toBe('3 t');
  });

  it('returns the fallback as is, without interpolating params into it', async () => {
    const i18n = await service();

    expect(i18n.t('types.nope', { count: 3 }, { fallback: '{{count}} raw' })).toBe('{{count}} raw');
  });

  it('keeps the scope beside the fallback, and a bare string is still the scope', async () => {
    const i18n = TestBed.inject(WrI18n);
    await i18n.registerScope('fleet');
    await settle();

    expect(i18n.t('types.truck', undefined, 'fleet')).toBe('Fleet truck');
    expect(i18n.t('types.truck', undefined, { scope: 'fleet', fallback: 'truck' })).toBe('Fleet truck');
    expect(i18n.t('types.nope', undefined, { scope: 'fleet', fallback: 'nope' })).toBe('nope');
  });

  it('gives way to a key that appears in the new locale', async () => {
    const i18n = await service();
    const label = i18n.translate('types.depot', undefined, { fallback: 'depot' });
    expect(label()).toBe('depot');

    i18n.use('ru');
    await settle();
    expect(label()).toBe('Депо');

    i18n.use('en');
    await settle();
    expect(label()).toBe('depot');
    expect(missingHandler).not.toHaveBeenCalled();
  });

  it('works through the pipe and the directive', async () => {
    const fixture = await mount();

    expect(textOf(fixture, '.pipe')).toBe('depot');
    expect(textOf(fixture, '.params')).toBe('3 t');
    expect(textOf(fixture, '.directive')).toBe('depot');
    expect(missingHandler).not.toHaveBeenCalled();

    fixture.componentInstance.type.set('truck');
    fixture.detectChanges();
    expect(textOf(fixture, '.pipe')).toBe('Truck');
    expect(textOf(fixture, '.directive')).toBe('Truck');
  });

  it('repaints the pipe and the directive when the locale gains the key', async () => {
    const fixture = await mount();

    TestBed.inject(WrI18n).use('ru');
    await settle();
    fixture.detectChanges();

    expect(textOf(fixture, '.pipe')).toBe('Депо');
    expect(textOf(fixture, '.directive')).toBe('Депо');
  });
});
