import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrStep } from './step';
import { WrStepper } from './stepper';

type Labels = Partial<Record<'optionalLabel' | 'completedLabel' | 'errorLabel' | 'warningLabel', string>>;

const CUSTOM: Labels = {
  optionalLabel: 'x-optionalLabel',
  completedLabel: 'x-completedLabel',
  errorLabel: 'x-errorLabel',
  warningLabel: 'x-warningLabel',
};

@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper
      [active]="1"
      [optionalLabel]="labels().optionalLabel ?? null"
      [completedLabel]="labels().completedLabel ?? null"
      [errorLabel]="labels().errorLabel ?? null"
      [warningLabel]="labels().warningLabel ?? null"
    >
      <wr-step label="Account">Account body</wr-step>
      <wr-step label="Address" optional>Address body</wr-step>
      <wr-step label="Payment" status="error">Payment body</wr-step>
      <wr-step label="Review" status="warning">Review body</wr-step>
    </wr-stepper>
  `,
})
class Host {
  readonly labels = signal<Labels>({});
}

describe('WrStepper per-instance labels', () => {
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
      optionalLabel: root().querySelector('.wr-stepper__optional')?.textContent.trim() ?? '',
      completedLabel:
        root().querySelector('.wr-stepper__header--completed .wr-stepper__sr-only')?.textContent.trim() ?? '',
      errorLabel: root().querySelector('.wr-stepper__header--error .wr-stepper__sr-only')?.textContent.trim() ?? '',
      warningLabel: root().querySelector('.wr-stepper__header--warning .wr-stepper__sr-only')?.textContent.trim() ?? '',
    });

  it('prints each input in place of its built-in string', async () => {
    await mount();
    await set(CUSTOM);

    expect(await read()).toEqual({
      optionalLabel: 'x-optionalLabel',
      completedLabel: 'x-completedLabel',
      errorLabel: 'x-errorLabel',
      warningLabel: 'x-warningLabel',
    });
  });

  it('falls back to the built-in English with every input null', async () => {
    await mount();

    expect(await read()).toEqual({
      optionalLabel: 'optional',
      completedLabel: 'completed',
      errorLabel: 'error',
      warningLabel: 'warning',
    });
  });

  it('keeps a registered catalog under a null input, and an input over the catalog', async () => {
    await mount(true);

    expect(await read()).toEqual({
      optionalLabel: 'необязательно',
      completedLabel: 'завершено',
      errorLabel: 'ошибка',
      warningLabel: 'предупреждение',
    });

    await set({ optionalLabel: 'x-optionalLabel' });

    expect(await read()).toEqual({
      optionalLabel: 'x-optionalLabel',
      completedLabel: 'завершено',
      errorLabel: 'ошибка',
      warningLabel: 'предупреждение',
    });
  });
});
