import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrChartLegend } from './chart-legend';
import type { WrChartLegendItem } from './types';

type Labels = Partial<Record<'hiddenLabel', string>>;

const CUSTOM: Labels = { hiddenLabel: 'x-hiddenLabel' };

@Component({
  imports: [WrChartLegend],
  template: `<ul
    wr-chart-legend
    [items]="items"
    [hiddenSeries]="[0]"
    [hiddenLabel]="labels().hiddenLabel ?? null"
  ></ul>`,
})
class Host {
  readonly labels = signal<Labels>({});
  readonly items: readonly WrChartLegendItem[] = [
    { label: 'Visits', color: 'red' },
    { label: 'Signups', color: 'blue' },
  ];
}

describe('WrChartLegend per-instance labels', () => {
  let fixture: ComponentFixture<Host>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (russian = false): Promise<void> => {
    TestBed.configureTestingModule({
      providers: russian
        ? [provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }), provideWrI18nStaticLoader({ ru: wrRu })]
        : [],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const set = async (labels: Labels): Promise<void> => {
    fixture.componentInstance.labels.set(labels);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => TestBed.resetTestingModule());

  const read = (): Promise<Labels> =>
    Promise.resolve({
      hiddenLabel: root().querySelector('.wr-chart-legend__sr-only')?.textContent.trim() ?? '',
    });

  it('prints each input in place of its built-in string', async () => {
    await mount();
    await set(CUSTOM);

    expect(await read()).toEqual({
      hiddenLabel: 'x-hiddenLabel',
    });
  });

  it('falls back to the built-in English with every input null', async () => {
    await mount();

    expect(await read()).toEqual({
      hiddenLabel: 'hidden',
    });
  });

  it('keeps a registered catalog under a null input, and an input over the catalog', async () => {
    await mount(true);

    expect(await read()).toEqual({
      hiddenLabel: 'скрыто',
    });

    await set({ hiddenLabel: 'x-hiddenLabel' });

    expect(await read()).toEqual({
      hiddenLabel: 'x-hiddenLabel',
    });
  });
});
