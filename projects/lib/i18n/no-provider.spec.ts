import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrAlert } from 'ngwr/alert';
import { describe, expect, it } from 'vitest';

import { WrI18n } from './i18n';

/**
 * The no-configuration path. `provideWrI18n()` is optional by design — every
 * component routes its built-in strings through the helpers and falls back to
 * an English default when nothing resolves — but that only holds if `WrI18n`
 * can be CONSTRUCTED without configuration. It is `providedIn: 'root'`, so an
 * `inject(WrI18n, { optional: true })` finds and builds it either way.
 */
@Component({ imports: [WrAlert], template: `<wr-alert message="Something happened" />` })
class Host {}

describe('ngwr with no i18n provider at all', () => {
  it('renders a component that routes strings through the catalog', () => {
    // Regression: this threw `NG0201: No provider found for WR_I18N_LOADER`,
    // so an app that had simply never configured i18n could not render an
    // alert — or a select, or a table.
    const fixture = TestBed.createComponent(Host);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Something happened');
  });

  it('constructs the service and reports the default locale', () => {
    const i18n = TestBed.inject(WrI18n);
    expect(i18n.locale()).toBe('en');
  });

  it('misses every key, which is what makes the component fallbacks fire', () => {
    // `useI18nText` treats "translation === key" as missing and substitutes the
    // component's own default, so an empty catalog is the whole mechanism.
    expect(TestBed.inject(WrI18n).t('alert.close')).toBe('alert.close');
  });
});
