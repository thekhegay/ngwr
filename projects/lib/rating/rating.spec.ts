import { Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrRating } from './rating';

@Component({
  imports: [WrRating],
  template: `
    <wr-rating
      [(value)]="score"
      [count]="count()"
      [step]="step()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class Host {
  readonly score = signal<number | null>(null);
  readonly count = signal(5);
  readonly step = signal<0.5 | 1>(1);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * The same control under a real signal-forms field, which is the only place the
 * difference between "clamps the display" and "clamps the model" is observable:
 * a write the component makes to `value` is indistinguishable, from the field's
 * side, from the user moving the stars.
 */
@Component({
  imports: [WrRating, FormField],
  template: `<wr-rating [formField]="form.score" [count]="5" />`,
})
class FieldHost {
  readonly model = signal<{ score: number | null }>({ score: 9 });
  readonly form = form(this.model);
}

/**
 * A rating is announced as a `slider`, and that role is a promise about the
 * keyboard: arrows step, Home / End jump to the ends, Delete clears. The ARIA
 * value attributes are the other half — a slider whose `aria-valuenow` never
 * moves is silent to a screen reader no matter how many stars light up.
 */
describe('WrRating', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const slider = (): HTMLElement => root().querySelector<HTMLElement>('[role="slider"]')!;
  const score = (): number | null => fixture.componentInstance.score();

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    slider().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  /**
   * Rebuild the fixture under a reading direction.
   *
   * `Directionality` reads the document once, at construction, so a fake is the
   * honest way to say "this app is RTL" — and the component injects it
   * `optional`, which is why every other spec in this file needs no provider at
   * all.
   */
  const withDir = (direction: 'ltr' | 'rtl'): void => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<'ltr' | 'rtl'>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  /** A star's box — jsdom computes none, and a pointer position needs one. */
  const SLOT_RECT = { x: 100, y: 0, left: 100, right: 120, top: 0, bottom: 20, width: 20, height: 20 };

  /**
   * Click a star at `ratio` across its box, measured from the PHYSICAL left edge —
   * the same screen point in either direction, which is the whole point of the
   * pair of specs below.
   */
  const clickSlot = (index: number, ratio: number): void => {
    const slot = root().querySelectorAll<HTMLElement>('.wr-rating__slot')[index];
    slot.getBoundingClientRect = (): DOMRect => ({ ...SLOT_RECT, toJSON: () => SLOT_RECT });
    const clientX = SLOT_RECT.left + ratio * SLOT_RECT.width;
    slot.dispatchEvent(new MouseEvent('click', { clientX, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents itself as a slider with a range and a position', () => {
    expect(slider().getAttribute('aria-valuemin')).toBe('0');
    expect(slider().getAttribute('aria-valuemax')).toBe('5');
    expect(slider().getAttribute('aria-valuenow')).toBe('0');
    expect(slider().getAttribute('tabindex')).toBe('0');
  });

  it('moves aria-valuenow with the value, not just the stars', () => {
    fixture.componentInstance.score.set(3);
    fixture.detectChanges();

    expect(slider().getAttribute('aria-valuenow')).toBe('3');
  });

  /**
   * A form or an API can hand over anything, and the two halves of the answer
   * pull in opposite directions.
   *
   * Left undrawn-clamped, the stars run past the end of the row and
   * `aria-valuenow` exceeds its own `aria-valuemax`, which is an invalid slider.
   * Written BACK, the clamp is worse: under `[formField]` that write is
   * indistinguishable from the user moving the stars, so it deletes the
   * out-of-range value a `max()` rule exists to report and marks a pristine form
   * dirty before anything has been touched. So the display clamps and the model
   * does not — the rule `wr-slider` and `wr-input-number` already follow.
   */
  describe('values it was handed but cannot represent', () => {
    it('announces the clamp and leaves the model alone', () => {
      fixture.componentInstance.score.set(9);
      fixture.detectChanges();

      expect(slider().getAttribute('aria-valuenow')).toBe('5');
      expect(score(), 'the rating rewrote data it only had to draw').toBe(9);

      fixture.componentInstance.score.set(-3);
      fixture.detectChanges();

      expect(slider().getAttribute('aria-valuenow')).toBe('0');
      expect(score()).toBe(-3);
    });

    it('draws no star past the end of the row', () => {
      fixture.componentInstance.score.set(9);
      fixture.detectChanges();

      const fills = [...root().querySelectorAll<HTMLElement>('.wr-rating__slot')].map(el =>
        el.style.getPropertyValue('--wr-rating-fill')
      );

      // Read off the style ATTRIBUTE the component wrote, not a computed value:
      // jsdom would resolve the stylesheet's own default and answer plausibly at
      // exactly the moment the binding is what broke.
      expect(fills).toEqual(['1', '1', '1', '1', '1']);
    });

    it('reports an in-range number as soon as the user moves it', () => {
      fixture.componentInstance.score.set(9);
      fixture.detectChanges();

      // Stepping from the committed 9 would land on 5 and look like a clamp;
      // stepping from the star the user can SEE lands on 4.
      press('ArrowLeft');

      expect(score()).toBe(4);
    });
  });

  it('steps up and down with the arrows', () => {
    press('ArrowRight');
    expect(score()).toBe(1);

    press('ArrowRight');
    press('ArrowUp');
    expect(score()).toBe(3);

    press('ArrowLeft');
    expect(score()).toBe(2);
  });

  it('stops at both ends instead of running past them', () => {
    for (let i = 0; i < 8; i++) press('ArrowRight');
    expect(score()).toBe(5);

    for (let i = 0; i < 9; i++) press('ArrowLeft');
    expect(score()).toBe(0);
  });

  it('jumps to the ends with Home and End', () => {
    press('End');
    expect(score()).toBe(5);

    press('Home');
    expect(score()).toBe(0);
  });

  it('clears with Delete and Backspace', () => {
    fixture.componentInstance.score.set(4);
    fixture.detectChanges();

    press('Delete');
    expect(score()).toBeNull();

    fixture.componentInstance.score.set(4);
    fixture.detectChanges();
    press('Backspace');
    expect(score()).toBeNull();
  });

  it('steps by a half star when asked to', () => {
    fixture.componentInstance.step.set(0.5);
    fixture.detectChanges();

    press('ArrowRight');
    expect(score()).toBe(0.5);

    press('ArrowRight');
    expect(score()).toBe(1);
  });

  it('honours a custom count as the upper bound', () => {
    fixture.componentInstance.count.set(3);
    fixture.detectChanges();

    press('End');
    expect([score(), slider().getAttribute('aria-valuemax')]).toEqual([3, '3']);
  });

  it('takes no keyboard input while readonly, and says so', () => {
    fixture.componentInstance.score.set(2);
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    press('ArrowRight');

    expect(score()).toBe(2);
    expect(slider().getAttribute('aria-readonly')).toBe('true');
  });

  it('takes no keyboard input while disabled, and says so', () => {
    fixture.componentInstance.score.set(2);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    press('ArrowRight');

    expect(score()).toBe(2);
    expect(slider().getAttribute('aria-disabled')).toBe('true');
  });

  it('leaves keys it does not own to the page', () => {
    // Tab has to keep moving focus, and a rating that swallows it traps the
    // user on a star.
    const event = press('Tab');
    expect(event.defaultPrevented).toBe(false);
  });

  it('steps up on ArrowRight in LTR, where the first star is on the left', () => {
    withDir('ltr');

    press('ArrowRight');
    expect(score()).toBe(1);

    press('ArrowLeft');
    expect(score()).toBe(0);
  });

  it('steps DOWN on ArrowRight under dir="rtl", where the row is mirrored', () => {
    // Arrows follow VISUAL order (WAI-ARIA APG). The stars lie on the inline
    // axis, so in RTL the first one is the RIGHTMOST — and `→` walks toward it,
    // which is toward zero. The twin above is what makes this assertion mean
    // "mirrors" rather than "always goes left".
    withDir('rtl');
    fixture.componentInstance.score.set(3);
    fixture.detectChanges();

    press('ArrowRight');
    expect(score()).toBe(2);

    press('ArrowLeft');
    expect(score()).toBe(3);
  });

  it('does not flip the block axis or the ends', () => {
    // `dir` governs the INLINE axis only. Up / Down are the block axis, and
    // Home / End mean first / last — a semantic position, not a physical one —
    // so both directions must produce exactly the same walk.
    const walk = (): (number | null)[] => {
      const seen: (number | null)[] = [];
      for (const key of ['ArrowUp', 'ArrowDown', 'End', 'Home']) {
        press(key);
        seen.push(score());
      }
      return seen;
    };

    withDir('ltr');
    const ltr = walk();
    expect(ltr).toEqual([1, 0, 5, 0]);

    withDir('rtl');
    expect(walk()).toEqual(ltr);
  });

  it('reads a click from the star own left edge in LTR', () => {
    withDir('ltr');
    fixture.componentInstance.step.set(0.5);
    fixture.detectChanges();

    // A quarter of the way into star three is its leading half: two and a half.
    clickSlot(2, 0.25);
    expect(score()).toBe(2.5);
  });

  it('reads a click from the star own right edge under dir="rtl"', () => {
    withDir('rtl');
    fixture.componentInstance.step.set(0.5);
    fixture.detectChanges();

    // The same screen point, on a mirrored row: a quarter in from the left is
    // three quarters into a star that starts on the right, so it is the star's
    // trailing half — three, where LTR reads two and a half. Measured from
    // `rect.left` alone, an RTL half star is inverted the whole way across.
    clickSlot(2, 0.25);
    expect(score()).toBe(3);
  });

  it('carries a name, defaulting to the catalog string', () => {
    expect(slider().getAttribute('aria-label')).toBe('Rating');

    fixture.componentInstance.ariaLabel.set('Rate this article');
    fixture.detectChanges();
    expect(slider().getAttribute('aria-label')).toBe('Rate this article');
  });

  /**
   * The finding this control was reported for: a `FormControl(9)` on a
   * five-star rating came back as 5, dirty, with an emission nobody asked for.
   * A "discard changes?" guard fires on a form the user has not opened yet, and
   * the value a `max()` rule exists to report is gone before the rule can see it.
   */
  describe('under a signal-forms field', () => {
    let field: ReturnType<typeof TestBed.createComponent<FieldHost>>;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      field = TestBed.createComponent(FieldHost);
      field.detectChanges();
    });

    afterEach(() => field.destroy());

    it('leaves a pristine field pristine, holding the value it was given', async () => {
      await field.whenStable();
      field.detectChanges();

      const state = field.componentInstance.form.score();
      expect([state.value(), state.dirty()], 'first paint edited the form').toEqual([9, false]);
    });

    it('goes dirty on the first real interaction, and not before', async () => {
      await field.whenStable();
      field.detectChanges();

      const slider = (field.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="slider"]')!;
      slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      field.detectChanges();
      await field.whenStable();

      const state = field.componentInstance.form.score();
      expect([state.value(), state.dirty()]).toEqual([0, true]);
    });
  });
});
