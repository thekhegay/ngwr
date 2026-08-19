import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrStep } from './step';
import { WrStepper } from './stepper';

@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper [(active)]="active" [linear]="linear()" [orientation]="orientation()" [responsive]="responsive()">
      <wr-step label="Account">Account body</wr-step>
      <wr-step label="Address" [completed]="addressDone()">Address body</wr-step>
      <wr-step label="Review" [disabled]="reviewDisabled()">Review body</wr-step>
    </wr-stepper>
  `,
})
class Host {
  readonly stepper = viewChild.required(WrStepper);
  readonly active = signal(0);
  readonly linear = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly responsive = signal(false);
  readonly addressDone = signal<boolean | null>(null);
  readonly reviewDisabled = signal(false);
}

@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper>
      <wr-step label="Профиль" optional>Body</wr-step>
    </wr-stepper>
  `,
})
class OptionalHost {}

/**
 * Two things carry the meaning here: `aria-current="step"` on exactly one
 * header, and `linear` actually holding the user back. A linear stepper that
 * merely GREYS a header is a suggestion — the click still has to be refused, or
 * a keyboard user walks straight past the gate.
 */
describe('WrStepper', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const headers = (): HTMLButtonElement[] => [
    ...root().querySelectorAll<HTMLButtonElement>('.wr-stepper__header-button'),
  ];
  const active = (): number => fixture.componentInstance.active();
  const currents = (): string[] => headers().map(h => h.getAttribute('aria-current') ?? '-');

  /**
   * Dispatched, not `.click()`ed. A real click on a `<button disabled>` is
   * swallowed by the DOM, which would make "the gate holds" true for the wrong
   * reason — the component's own guard would never run. Dispatching still
   * reaches the Angular listener, so `onHeaderClick` is what gets tested.
   */
  const click = (index: number): void => {
    headers()[index].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders one header per step, with its label', () => {
    expect(headers()).toHaveLength(3);
    const labels = headers().map(h => h.textContent.replace(/\s+/g, ' ').trim());
    expect(labels[0]).toContain('Account');
    expect(labels[1]).toContain('Address');
    expect(labels[2]).toContain('Review');
  });

  it('marks exactly one header as the current step', () => {
    expect(currents()).toEqual(['step', '-', '-']);
  });

  it('moves aria-current with the active index', () => {
    fixture.componentInstance.active.set(2);
    fixture.detectChanges();

    expect(currents()).toEqual(['-', '-', 'step']);
  });

  it('jumps to a clicked step when the stepper is free', () => {
    click(2);
    expect(active()).toBe(2);
  });

  it('walks with next() and prev(), and stops at the ends', () => {
    const stepper = fixture.componentInstance.stepper();

    stepper.next();
    fixture.detectChanges();
    expect(active()).toBe(1);

    stepper.next();
    stepper.next();
    fixture.detectChanges();
    // Past the last step there is nowhere to go; running off the end would
    // leave `active` pointing at a step that does not exist.
    expect(active()).toBe(2);

    stepper.prev();
    stepper.prev();
    stepper.prev();
    fixture.detectChanges();
    expect(active()).toBe(0);
  });

  it('clamps an out-of-range goTo instead of accepting it', () => {
    fixture.componentInstance.stepper().goTo(99);
    fixture.detectChanges();
    expect(active()).toBe(2);

    fixture.componentInstance.stepper().goTo(-5);
    fixture.detectChanges();
    expect(active()).toBe(0);
  });

  describe('linear mode', () => {
    beforeEach(() => {
      fixture.componentInstance.linear.set(true);
      fixture.detectChanges();
    });

    it('refuses a jump past the gate, not just greys it', () => {
      click(2);

      // The header is disabled too, but the guard has to hold on its own: a
      // disabled attribute is the hint, `onHeaderClick` is the rule.
      expect(active()).toBe(0);
    });

    it('takes the header out of reach as well as out of the tab order', () => {
      expect(headers()[2].disabled).toBe(true);
      expect(root().querySelector('.wr-stepper__header--reachable')).not.toBeNull();
    });

    it('opens the next step once the current one reports itself complete', () => {
      fixture.componentInstance.active.set(1);
      fixture.componentInstance.addressDone.set(true);
      fixture.detectChanges();

      click(2);
      expect(active()).toBe(2);
    });
  });

  it('never reaches a step its own input disabled', () => {
    fixture.componentInstance.reviewDisabled.set(true);
    fixture.detectChanges();

    expect(headers()[2].disabled).toBe(true);
    click(2);
    expect(active()).toBe(0);
  });

  it('carries the public BEM classes, including orientation and state', () => {
    const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-stepper')!;
    expect(host().className).toContain('wr-stepper');

    fixture.componentInstance.orientation.set('vertical');
    fixture.componentInstance.linear.set(true);
    fixture.detectChanges();

    expect(host().className).toContain('wr-stepper--vertical');
    expect(host().className).toContain('wr-stepper--linear');
    expect(root().querySelector('.wr-stepper__header--active')).not.toBeNull();
  });

  it('hides the indicator glyph from assistive tech', () => {
    // It repeats the step number and the completed tick, both of which the
    // label and `aria-current` already carry.
    expect(
      [...root().querySelectorAll('.wr-stepper__indicator')].every(i => i.getAttribute('aria-hidden') === 'true')
    ).toBe(true);
  });

  it('opts into the narrow reflow without changing what it IS', () => {
    // `responsive` adds a modifier the stylesheet's `@container` rule keys on, and
    // that rule is scoped to steppers that are not already vertical. So the two
    // inputs are independent and the DOM must keep saying horizontal — a reflow that
    // rewrote the orientation class would make `[orientation]` unreadable, and
    // reflowing a vertical stepper into a vertical one is a no-op nobody asked for.
    const host = (): HTMLElement => root().querySelector('wr-stepper')!;

    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();

    expect(host().className).toContain('wr-stepper--responsive');
    expect(host().className).not.toContain('wr-stepper--vertical');

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();

    expect(host().className).toContain('wr-stepper--responsive');
    expect(host().className).toContain('wr-stepper--vertical');
  });
});

/**
 * The badge sits INSIDE the header button's label span, so the word is part of
 * the step's accessible name — the hard-coded literal was announced to every
 * locale, not merely shown. There is no `*Label` input on purpose: one word
 * shared by every step is a catalog entry, not a per-step binding.
 */
describe('WrStepper optional badge', () => {
  afterEach(() => TestBed.resetTestingModule());

  const badge = (fixture: { nativeElement: unknown }): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-stepper__optional')?.textContent?.trim() ?? '';

  it('comes from the catalog, not from the template', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(OptionalHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(/\p{Script=Cyrillic}/u.test(badge(fixture)), `"${badge(fixture)}" is still English`).toBe(true);
  });

  it('falls back to English when nothing is registered', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(OptionalHost);
    fixture.detectChanges();

    expect(badge(fixture)).toBe('optional');
  });
});
