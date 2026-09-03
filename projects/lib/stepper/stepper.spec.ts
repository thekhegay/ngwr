import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * jsdom has no layout and loads no stylesheets, so a spec here cannot see a row
 * overflow — which is why the defect survived a full suite. Measured in Chromium
 * instead, against the compiled `ngwr/stepper` sheet, three steps at a 375px
 * viewport:
 *
 * ```
 *   de  Übersichtsdarstellung / Grundeinstellungen / Rechnungsstellung
 *       document 423px against a 375px client  ->  +48px, page scrolls sideways
 *   fi  Yleiskatsaus / Perusasetukset / Laskutustiedot          ->  +16px
 *   ja  概要と全体像の確認 / 基本設定の入力 / 請求先情報の登録        ->  +40px
 *   en  Overview / Details / Billing                            ->    0px
 * ```
 *
 * English is why nobody found it: the row only overflows once a label is longer
 * than the column, which is what a translation is. With the two declarations
 * below all four sets measure 0 at 320 and 375, and the row's height at 768 and
 * 1200 is byte-identical to before — the fix is inert until the row cannot fit.
 *
 * The `<li>` already carried `min-width: 0`, so this reads as already handled;
 * it bought nothing, because the BUTTON inside it was `flex: 0 0 auto` and
 * simply overflowed the row that shrank.
 */
describe('the horizontal row, as the stylesheet declares it', () => {
  const sheet = readFileSync(join(process.cwd(), 'projects/lib/stepper/styles/_index.scss'), 'utf8');

  const rule = (name: string): string => {
    const at = sheet.indexOf(`  &__${name} {`);
    expect(at, `no \`&__${name}\` rule in the stepper stylesheet`).toBeGreaterThan(-1);
    return sheet.slice(at, sheet.indexOf('\n  }', at));
  };

  it('lets the header button give, rather than freezing it at its label’s width', () => {
    expect(rule('header-button')).toMatch(/flex:\s*0 1 auto/);
    expect(rule('header-button')).toMatch(/min-width:\s*0/);
  });

  it('lets the label itself break, because a compound noun is one unbreakable word', () => {
    // A flex item's automatic minimum size is its min-content width, and for
    // `Rechnungsstellung` that IS the whole word — so the button would shrink and
    // the label would not.
    expect(rule('label')).toMatch(/min-width:\s*0/);
    expect(rule('label')).toMatch(/overflow-wrap:\s*break-word/);
  });
});
