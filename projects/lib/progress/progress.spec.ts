import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrProgress } from './progress';

@Component({
  imports: [WrProgress],
  template: `<wr-progress [value]="value()" [color]="color()" [ariaLabel]="ariaLabel()" />`,
})
class Host {
  readonly value = signal(42);
  readonly color = signal<WrColor>('primary');
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * No defect was found here — this pins a contract that was already right, which is worth
 * doing precisely because it is easy to break: the bar's width and `aria-valuenow` are the
 * same number, and a change that clamps one without the other shows a filled bar reading 300.
 */
describe('WrProgress', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-progress')!;
  const bar = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-progress__bar')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is announced as a named progressbar with a range', () => {
    expect(host().getAttribute('role')).toBe('progressbar');
    expect(host().getAttribute('aria-valuemin')).toBe('0');
    expect(host().getAttribute('aria-valuemax')).toBe('100');
    expect(host().getAttribute('aria-valuenow')).toBe('42');
    expect(host().getAttribute('aria-label')).toBe('Progress');
  });

  it('fills the bar to the same number it announces', () => {
    expect(bar().style.width).toBe('42%');

    fixture.componentInstance.value.set(80);
    fixture.detectChanges();
    expect(bar().style.width).toBe('80%');
    expect(host().getAttribute('aria-valuenow')).toBe('80');
  });

  it('clamps both the width and the announcement to the range', () => {
    fixture.componentInstance.value.set(300);
    fixture.detectChanges();
    expect(bar().style.width).toBe('100%');
    expect(host().getAttribute('aria-valuenow')).toBe('100');

    fixture.componentInstance.value.set(-40);
    fixture.detectChanges();
    expect(bar().style.width).toBe('0%');
    expect(host().getAttribute('aria-valuenow')).toBe('0');
  });

  it('reads a value that is not a number as zero', () => {
    fixture.componentInstance.value.set(Number.NaN);
    fixture.detectChanges();
    expect(host().getAttribute('aria-valuenow')).toBe('0');
    expect(bar().style.width).toBe('0%');
  });

  it('carries the colour into the class list', () => {
    expect(host().className).toBe('wr-progress wr-progress--primary');

    fixture.componentInstance.color.set('success');
    fixture.detectChanges();
    expect(host().className).toBe('wr-progress wr-progress--success');
  });

  it('takes a name from the consumer over the catalog', () => {
    fixture.componentInstance.ariaLabel.set('Upload');
    fixture.detectChanges();
    expect(host().getAttribute('aria-label')).toBe('Upload');
  });
});

describe('WrProgress under a localized catalog', () => {
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

    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-progress')!;
    expect(host.getAttribute('aria-label')).toBeTruthy();
    expect(host.getAttribute('aria-label')).not.toBe('Progress');

    fixture.destroy();
  });
});
