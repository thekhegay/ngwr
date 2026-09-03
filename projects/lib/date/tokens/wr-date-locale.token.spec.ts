import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it } from 'vitest';

import { provideWrDateAdapter } from '../provide-wr-date-adapter';

import { WR_DATE_LOCALE } from './wr-date-locale.token';

/**
 * The token used to default to `navigator.language`, and the provider's own
 * first JSDoc example is the no-argument call — so the documented path was the
 * broken one. An app on `LOCALE_ID: 'ru-RU'` with every string translated still
 * drew `March 2026` and a week starting on Sunday, because the calendar was
 * asking the browser what language the application is in.
 *
 * What a unit test can hold: which input the token reads, and in what order. It
 * cannot hold the rendered calendar — that is the adapter's own spec.
 */
describe('WR_DATE_LOCALE', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('takes LOCALE_ID when nothing else is provided', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'ru-RU' }] });
    expect(TestBed.inject(WR_DATE_LOCALE)).toBe('ru-RU');
  });

  it('takes LOCALE_ID through a no-argument provideWrDateAdapter()', () => {
    // The exact shape from the provider's example, and the exact shape the audit
    // reproduced against: no `locale` option anywhere, everything else Russian.
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'ru-RU' }, provideWrDateAdapter()],
    });
    expect(TestBed.inject(WR_DATE_LOCALE)).toBe('ru-RU');
  });

  it('lets an explicit locale option beat LOCALE_ID', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'ru-RU' }, provideWrDateAdapter({ locale: 'fi-FI' })],
    });
    expect(TestBed.inject(WR_DATE_LOCALE)).toBe('fi-FI');
  });

  it('does not read navigator.language', () => {
    // The regression itself. `navigator.language` is the browser's preference;
    // `LOCALE_ID` is the application's statement, and only the application can be
    // right about what language it is written in. Reading the browser also split
    // a prerendered page from its hydrated self, since the server has no
    // `navigator` preference to match.
    const original = Object.getOwnPropertyDescriptor(navigator, 'language');
    Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });
    try {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'ru-RU' }] });
      expect(TestBed.inject(WR_DATE_LOCALE)).toBe('ru-RU');
    } finally {
      if (original) Object.defineProperty(navigator, 'language', original);
    }
  });
});
