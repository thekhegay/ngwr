import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { WrI18nHttpLoader } from './http-loader';

describe('WrI18nHttpLoader', () => {
  const setup = (path: string, rootPath?: string): { loader: WrI18nHttpLoader; http: HttpTestingController } => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const loader = TestBed.runInInjectionContext(() => new WrI18nHttpLoader({ path, rootPath }));
    return { loader, http: TestBed.inject(HttpTestingController) };
  };

  it('lets a failed request reach the caller', () => {
    const { loader, http } = setup('/i18n/{locale}.json');
    let failed = false;
    loader.load('de', null).subscribe({ error: () => (failed = true) });
    http.expectOne('/i18n/de.json').flush('nope', { status: 500, statusText: 'Server Error' });
    expect(failed).toBe(true);
  });
});
