import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrDateAdapter } from 'ngwr/date-adapter';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrTimePanel } from './time-panel';

/**
 * The time stepper's accessible names, which are the only thing about it a unit
 * test can see: jsdom has no layout, so the three-column arrangement the harness
 * keys on is unreadable here.
 *
 * Every string on this panel used to be an English literal in the template, with
 * no catalog key and no override input — so `<wr-date-picker mode="time">` in a
 * Russian app announced its trigger "Открыть выбор времени" and its popup "Выбор
 * времени", and then every field and stepper INSIDE that popup in English.
 */
@Component({
  imports: [WrTimePanel],
  template: `<wr-time-picker [format]="format()" [showSeconds]="true" [value]="value()" />`,
})
class Host {
  readonly format = signal<'auto' | '12h' | '24h'>('24h');
  readonly value = signal<Date | null>(new Date(2025, 0, 15, 14, 30, 5));
}

describe('WrTimePanel accessible names', () => {
  beforeEach(() => localStorage.clear());

  const mount = async (providers: unknown[] = []): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({ providers: [provideWrDateAdapter(), ...(providers as never[])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  const labels = (fixture: { nativeElement: HTMLElement }): string[] =>
    [...fixture.nativeElement.querySelectorAll('.wr-time-picker [aria-label]')].map(
      el => el.getAttribute('aria-label') ?? ''
    );

  const russian = [
    provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
    provideWrI18nStaticLoader({ ru: wrRu }),
  ];

  it('names every box and stepper from the catalog', async () => {
    const fixture = await mount(russian);

    expect(labels(fixture)).toEqual([
      'Увеличить часы',
      'Часы',
      'Уменьшить часы',
      'Увеличить минуты',
      'Минуты',
      'Уменьшить минуты',
      'Увеличить секунды',
      'Секунды',
      'Уменьшить секунды',
    ]);
  });

  it('names the meridiem toggle and speaks the meridiem itself', async () => {
    // The `aria-live` span is read out on every toggle, so "PM" beside a Russian
    // toggle button is the same mixed announcement one line further down.
    const fixture = await mount(russian);
    fixture.componentInstance.format.set('12h');
    fixture.detectChanges();

    expect(labels(fixture).filter(label => label.includes('ДП'))).toEqual([
      'Переключить ДП / ПП',
      'Переключить ДП / ПП',
    ]);
    const meridiem = (fixture.nativeElement as HTMLElement).querySelector('.wr-time-picker__label');
    expect(meridiem?.textContent?.trim()).toBe('ПП');
  });

  it('keeps the English fallbacks when nothing is configured', async () => {
    // What the picker specs and `WrTimePanelHarness` see. `WrI18n` is root-provided
    // with an empty catalog, so every key misses and the component's own defaults
    // reach the DOM unchanged.
    const fixture = await mount();

    expect(labels(fixture)).toEqual([
      'Increment hours',
      'Hours',
      'Decrement hours',
      'Increment minutes',
      'Minutes',
      'Decrement minutes',
      'Increment seconds',
      'Seconds',
      'Decrement seconds',
    ]);
  });
});
