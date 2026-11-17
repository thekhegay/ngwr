import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { beforeEach, describe, expect, it } from 'vitest';

import { wrHttpErrorText, wrHttpStatus } from './http-error';
import { WrI18n } from './i18n';
import { provideWrI18n, provideWrI18nBaseCatalogs, provideWrI18nStaticLoader } from './provide-wr-i18n';

const failed = (status: number, error: unknown = null): HttpErrorResponse =>
  new HttpErrorResponse({ status, error, url: '/api/orders' });

describe('wrHttpStatus', () => {
  it('reads the status of an HttpErrorResponse', () => {
    expect(wrHttpStatus(failed(404))).toBe(404);
  });

  it('reads anything that carries a numeric status', () => {
    expect(wrHttpStatus({ status: 503 })).toBe(503);
  });

  it('is 0 for a request nothing answered', () => {
    expect(wrHttpStatus(failed(0))).toBe(0);
  });

  it.each([null, undefined, 'failed', new Error('boom'), { status: '404' }, { status: -1 }, { status: 4.5 }, {}])(
    'is null for %s, which is not an HTTP error',
    value => {
      expect(wrHttpStatus(value)).toBeNull();
    }
  );
});

describe('wrHttpErrorText', () => {
  // `use()` persists the locale, and jsdom's localStorage outlives TestBed.
  beforeEach(() => localStorage.clear());

  const setup = (app: Record<string, Record<string, unknown>> = {}): Injector => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'en', availableLocales: ['en', 'ru'] }),
        provideWrI18nBaseCatalogs({ en: wrEn, ru: wrRu }),
        provideWrI18nStaticLoader(app as never),
      ],
    });
    return TestBed.inject(Injector);
  };

  it('has a sentence for a status the catalog names', () => {
    const injector = setup();
    expect(wrHttpErrorText(failed(404), { injector })).toBe('Not found. It may have been deleted.');
    expect(wrHttpErrorText(failed(401), { injector })).toBe('Your session has ended. Sign in again.');
  });

  it('falls back by class, with the status in the sentence', () => {
    const injector = setup();
    expect(wrHttpErrorText(failed(418), { injector })).toBe('The request was refused. Error code: 418.');
    expect(wrHttpErrorText(failed(502), { injector })).toBe('The server failed. Try again later. Error code: 502.');
  });

  it('says the network failed for status 0', () => {
    const injector = setup();
    expect(wrHttpErrorText(failed(0), { injector })).toBe(
      'No connection to the server. Check your network and try again.'
    );
  });

  it('has one sentence for what is not an HTTP error, and for a status outside 4xx and 5xx', () => {
    const injector = setup();
    const unknown = 'Something went wrong. Try again later.';
    expect(wrHttpErrorText(new Error('boom'), { injector })).toBe(unknown);
    expect(wrHttpErrorText(null, { injector })).toBe(unknown);
    expect(wrHttpErrorText({ status: 302 }, { injector })).toBe(unknown);
  });

  it('takes a string override for one status and leaves the others alone', () => {
    const injector = setup();
    const overrides = { 409: 'This name is taken.', 0: 'You are offline.' };
    expect(wrHttpErrorText(failed(409), { injector, overrides })).toBe('This name is taken.');
    expect(wrHttpErrorText(failed(0), { injector, overrides })).toBe('You are offline.');
    expect(wrHttpErrorText(failed(404), { injector, overrides })).toBe('Not found. It may have been deleted.');
  });

  it('calls a function override with the error', () => {
    const injector = setup();
    const error = failed(413, { limit: '5 MB' });
    const overrides = {
      413: (e: unknown) => `The photo is over ${(e as { error: { limit: string } }).error.limit}.`,
    };
    expect(wrHttpErrorText(error, { injector, overrides })).toBe('The photo is over 5 MB.');
  });

  it('ignores the body unless serverMessage is on', () => {
    const injector = setup();
    expect(wrHttpErrorText(failed(409, { message: 'Login taken' }), { injector })).toBe(
      'This conflicts with existing data. Refresh the page and try again.'
    );
  });

  it('prefers the message in the body, or a string body, with serverMessage', () => {
    const injector = setup();
    const options = { injector, serverMessage: true };
    expect(wrHttpErrorText(failed(409, { message: ' Login taken ' }), options)).toBe('Login taken');
    expect(wrHttpErrorText(failed(400, 'Bad date order'), options)).toBe('Bad date order');
  });

  it('falls back to the catalog when the body says nothing readable', () => {
    const injector = setup();
    const options = { injector, serverMessage: true };
    const text = 'The server failed. Try again later. Error code: 502.';
    expect(wrHttpErrorText(failed(502, '<html><body>Bad Gateway</body></html>'), options)).toBe(text);
    expect(wrHttpErrorText(failed(502, { message: '  ' }), options)).toBe(text);
    expect(wrHttpErrorText(failed(502, { message: 42 }), options)).toBe(text);
    expect(wrHttpErrorText(failed(502, null), options)).toBe(text);
  });

  it('puts an override above the body', () => {
    const injector = setup();
    const options = { injector, serverMessage: true, overrides: { 409: 'This name is taken.' } };
    expect(wrHttpErrorText(failed(409, { message: 'Login taken' }), options)).toBe('This name is taken.');
  });

  it('follows the active language', () => {
    const injector = setup();
    injector.get(WrI18n).use('ru');
    expect(wrHttpErrorText(failed(403), { injector })).toBe('Недостаточно прав для этого действия.');
    expect(wrHttpErrorText(failed(418), { injector })).toBe('Запрос отклонён. Код ошибки: 418.');
    expect(wrHttpErrorText(failed(0), { injector })).toBe('Нет связи с сервером. Проверьте подключение и повторите.');
  });

  it('lets the app catalog reword a key', async () => {
    const injector = setup({ en: { httpError: { 404: 'No such order.', '4xx': 'Refused: {{status}}.' } } });
    // The loader's catalog lands a microtask after the effect that asks for it.
    injector.get(WrI18n);
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    expect(wrHttpErrorText(failed(404), { injector })).toBe('No such order.');
    expect(wrHttpErrorText(failed(418), { injector })).toBe('Refused: 418.');
    expect(wrHttpErrorText(failed(403), { injector })).toBe('You do not have permission for this action.');
  });

  it('reads the service from the injection context when no injector is passed', () => {
    setup();
    expect(TestBed.runInInjectionContext(() => wrHttpErrorText(failed(429)))).toBe(
      'Too many requests. Try again in a moment.'
    );
  });

  it('throws outside an injection context with no injector', () => {
    setup();
    expect(() => wrHttpErrorText(failed(429))).toThrow(/NG0203/);
  });
});

describe('wrHttpErrorText with no i18n configured', () => {
  it('answers in English', () => {
    const injector = TestBed.inject(Injector);
    expect(wrHttpErrorText(failed(404), { injector })).toBe('Not found. It may have been deleted.');
    expect(wrHttpErrorText(failed(599), { injector })).toBe('The server failed. Try again later. Error code: 599.');
    expect(wrHttpErrorText({}, { injector })).toBe('Something went wrong. Try again later.');
  });

  it('keeps its English floor equal to the shipped catalog', () => {
    const injector = TestBed.inject(Injector);
    const en = wrEn['httpError'] as Record<string, string>;
    for (const [key, text] of Object.entries(en)) {
      const status = key === 'network' ? 0 : key === 'unknown' ? null : Number(key.replace('xx', '99'));
      expect(wrHttpErrorText({ status }, { injector }), key).toBe(text.replace('{{status}}', String(status)));
    }
  });
});
