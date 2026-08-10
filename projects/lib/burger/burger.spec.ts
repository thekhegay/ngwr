import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBurger } from './burger';

@Component({
  imports: [WrBurger],
  template: `<wr-burger [(open)]="open" [label]="label()" [disabled]="disabled()" />`,
})
class Host {
  readonly open = signal(false);
  readonly label = signal<string | null>(null);
  readonly disabled = signal(false);
}

/**
 * A toggle button whose entire state is `aria-expanded` plus one class — the
 * animation is CSS on the three paths, so what a test can check is the state the
 * animation is driven FROM, and that the two never disagree.
 */
describe('WrBurger', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-burger')!;
  const button = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-burger__btn')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is a named button that reports itself collapsed', () => {
    expect(button().getAttribute('type')).toBe('button');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe('Toggle menu');
    expect(host().className).toBe('wr-burger');
  });

  it('takes a name from the consumer', () => {
    // The default was a hard-coded English string with no catalog behind it.
    fixture.componentInstance.label.set('Открыть меню');
    fixture.detectChanges();

    expect(button().getAttribute('aria-label')).toBe('Открыть меню');
  });

  it('flips both the state and the class on click, and writes back to the host', () => {
    button().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(true);
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(host().className).toContain('wr-burger--opened');

    button().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(host().className).not.toContain('wr-burger--opened');
  });

  it('follows the model when the host drives it', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(host().className).toContain('wr-burger--opened');
  });

  it('does nothing at all while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    button().click();
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('keeps the three lines out of the accessible tree', () => {
    expect(button().querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(button().querySelectorAll('.wr-burger__line').length).toBe(3);
  });
});

describe('WrBurger under a localized catalog', () => {
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

    const button = (fixture.nativeElement as HTMLElement).querySelector('.wr-burger__btn')!;
    expect(button.getAttribute('aria-label')).toBe('Переключить меню');

    fixture.destroy();
  });
});
