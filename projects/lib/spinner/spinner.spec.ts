import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrSpinnerSize } from './interfaces';
import { WrSpinner } from './spinner';

@Component({
  imports: [WrSpinner],
  template: `<wr-spinner [size]="size()" [ariaLabel]="ariaLabel()" />`,
})
class Host {
  readonly size = signal<WrSpinnerSize>('md');
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * A spinner is one live region and one class, and both are contracts: the class
 * because consumers style against it, the name because `role="status"` with
 * nothing to announce is a region that says nothing.
 */
describe('WrSpinner', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-spinner')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces itself as a named status region', () => {
    expect(host().getAttribute('role')).toBe('status');
    expect(host().getAttribute('aria-label')).toBe('Loading');
  });

  it('takes a name from the consumer', () => {
    // The name used to be a hard-coded English host attribute, which no consumer
    // could override — while the catalog already had `spinner.label` translated.
    fixture.componentInstance.ariaLabel.set('Uploading');
    fixture.detectChanges();

    expect(host().getAttribute('aria-label')).toBe('Uploading');
  });

  it('keeps the drawing out of the accessible tree', () => {
    expect(host().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('carries no size modifier at the default size', () => {
    expect(host().className).toBe('wr-spinner');
  });

  it('adds a modifier for every other size', () => {
    for (const size of ['sm', 'lg'] as const) {
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      expect(host().className).toBe(`wr-spinner wr-spinner--${size}`);
    }
  });
});

describe('WrSpinner under a localized catalog', () => {
  it('takes its name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-spinner')!;
    expect(host.getAttribute('aria-label')).toBe('Загрузка');

    fixture.destroy();
  });
});
