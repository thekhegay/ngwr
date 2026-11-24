import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrStep } from './step';
import { WrStepper } from './stepper';
import type { WrStepStatus } from './types';

@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper [(active)]="active" [linear]="linear()" [orientation]="orientation()" [responsive]="responsive()">
      <wr-step label="Account">Account body</wr-step>
      <wr-step label="Address" [completed]="addressDone()">Address body</wr-step>
      @if (showReview()) {
        <wr-step label="Review" [disabled]="reviewDisabled()">Review body</wr-step>
      }
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
  /** A step behind a flag — the ordinary way a step list shrinks at runtime. */
  readonly showReview = signal(true);
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

@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper [active]="1">
      <wr-step label="Профиль">Body</wr-step>
      <wr-step label="Адрес">Body</wr-step>
    </wr-stepper>
  `,
})
class CompletedHost {}

@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper [(active)]="active" linear>
      <wr-step label="Account" [status]="accountStatus()">Account body</wr-step>
      <wr-step label="Address" [status]="addressStatus()">Address body</wr-step>
      <wr-step label="Review">Review body</wr-step>
    </wr-stepper>
  `,
})
class StatusHost {
  readonly active = signal(1);
  readonly accountStatus = signal<WrStepStatus | null>('error');
  readonly addressStatus = signal<WrStepStatus | null>('warning');
}

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

  /**
   * `goTo` was the only clamp, so everything the suite above exercises was
   * already in range. These two reach `active` the way a host does — through the
   * model, and through a step list that shrinks under it — and both used to leave
   * NO step matching `.wr-step--active` and no header `aria-current="step"`: a
   * header row over an empty body, since `.wr-step` is `display: none` until it
   * matches. (The hiding itself is a stylesheet rule jsdom does not apply; the
   * class and the ARIA state are the browser-independent half.)
   */
  it('pulls an out-of-range active index written straight to the model back in', () => {
    fixture.componentInstance.active.set(99);
    fixture.detectChanges();

    expect(active()).toBe(2);
    expect(currents()).toEqual(['-', '-', 'step']);
    expect(root().querySelectorAll('.wr-step--active')).toHaveLength(1);

    fixture.componentInstance.active.set(-3);
    fixture.detectChanges();

    expect(active()).toBe(0);
    expect(currents()).toEqual(['step', '-', '-']);
  });

  it('repairs a NaN or fractional active index written by the host', () => {
    fixture.componentInstance.active.set(Number.NaN);
    fixture.detectChanges();
    expect(active()).toBe(0);
    expect(currents()).toEqual(['step', '-', '-']);

    fixture.componentInstance.active.set(1.5);
    fixture.detectChanges();
    expect(active()).toBe(1);
    expect(currents()).toEqual(['-', 'step', '-']);
  });

  it('follows the last step down when it is removed from under the active index', () => {
    fixture.componentInstance.active.set(2);
    fixture.detectChanges();
    expect(currents()).toEqual(['-', '-', 'step']);

    fixture.componentInstance.showReview.set(false);
    fixture.detectChanges();

    expect(active()).toBe(1);
    expect(currents()).toEqual(['-', 'step']);
    expect(root().querySelectorAll('.wr-step--active')).toHaveLength(1);
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

  it('says a step is completed in its header, not only with the tick', () => {
    // The tick is `aria-hidden`, so the word is what reaches a screen reader — and
    // it sits inside the button, where it becomes part of the step's name.
    const done = (): string[] =>
      headers().map(h => h.querySelector('.wr-stepper__sr-only')?.textContent?.trim() ?? '-');
    expect(done()).toEqual(['-', '-', '-']);

    fixture.componentInstance.active.set(2);
    fixture.detectChanges();
    expect(done()).toEqual(['completed', 'completed', '-']);

    // An explicit `[completed]` wins over the position, both ways.
    fixture.componentInstance.addressDone.set(false);
    fixture.detectChanges();
    expect(done()).toEqual(['completed', '-', '-']);
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
 * locale, not merely shown. The `optionalLabel` input over it is in
 * `labels.spec.ts`.
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

/** The same shape as the optional badge: one catalog word. */
describe('WrStepper completed state', () => {
  afterEach(() => TestBed.resetTestingModule());

  const word = (fixture: { nativeElement: unknown }): string =>
    (fixture.nativeElement as HTMLElement).querySelector('.wr-stepper__sr-only')?.textContent?.trim() ?? '';

  it('comes from the catalog, not from the template', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(CompletedHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(/\p{Script=Cyrillic}/u.test(word(fixture)), `"${word(fixture)}" is still English`).toBe(true);
  });

  it('falls back to English when nothing is registered', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(CompletedHost);
    fixture.detectChanges();

    expect(word(fixture)).toBe('completed');
  });
});

/**
 * A status is a flag on the header and nothing else: it swaps the glyph, adds a
 * class and a hidden word, and leaves completion, the current step and the
 * `linear` gate exactly where they were.
 */
describe('WrStepper step status', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<StatusHost>>;

  const items = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-stepper__header'),
  ];
  const buttons = (): HTMLButtonElement[] => items().map(i => i.querySelector('button')!);
  const words = (): string[] =>
    items().map(i => [...i.querySelectorAll('.wr-stepper__sr-only')].map(w => w.textContent.trim()).join(' ') || '-');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(StatusHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('puts a modifier class on the header of a step with a status, and on no other', () => {
    expect(items().map(i => i.classList.contains('wr-stepper__header--error'))).toEqual([true, false, false]);
    expect(items().map(i => i.classList.contains('wr-stepper__header--warning'))).toEqual([false, true, false]);

    fixture.componentInstance.accountStatus.set(null);
    fixture.componentInstance.addressStatus.set(null);
    fixture.detectChanges();

    expect(items().some(i => /--(error|warning)/.test(i.className))).toBe(false);
  });

  it('draws a glyph in place of the number or the check mark, hidden from assistive tech', () => {
    const indicators = items().map(i => i.querySelector<HTMLElement>('.wr-stepper__indicator')!);

    // Account is completed AND in error: one glyph, the status one, not the tick.
    expect(indicators.map(i => i.querySelectorAll('svg').length)).toEqual([1, 1, 0]);
    expect(indicators.map(i => i.textContent.trim())).toEqual(['', '', '3']);
    expect(indicators[0].querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(indicators[0].innerHTML).not.toBe(indicators[1].innerHTML);
    expect(indicators.every(i => i.getAttribute('aria-hidden') === 'true')).toBe(true);

    fixture.componentInstance.addressStatus.set(null);
    fixture.detectChanges();
    expect(indicators[1].textContent.trim()).toBe('2');
  });

  it('says the status inside the header button, after the completed word', () => {
    expect(words()).toEqual(['completed error', 'warning', '-']);
    expect(buttons()[1].textContent).toContain('warning');
  });

  it('comes from the catalog, not from the template', async () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    fixture = TestBed.createComponent(StatusHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(words()).toEqual(['завершено ошибка', 'предупреждение', '-']);
  });

  it('leaves the current step, completion and the linear gate alone', () => {
    // The current step is in warning and still current.
    expect(buttons().map(b => b.getAttribute('aria-current') ?? '-')).toEqual(['-', 'step', '-']);
    expect(items()[1].classList.contains('wr-stepper__header--active')).toBe(true);
    expect(items()[0].classList.contains('wr-stepper__header--completed')).toBe(true);
    // Review stays locked: a status neither opens nor closes the gate.
    expect(buttons().map(b => b.disabled)).toEqual([false, false, true]);

    // A step in error still takes a click.
    buttons()[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe(0);
    expect(items()[0].classList.contains('wr-stepper__header--error')).toBe(true);
    expect(items()[0].classList.contains('wr-stepper__header--active')).toBe(true);
  });
});
