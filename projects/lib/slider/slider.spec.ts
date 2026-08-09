import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSlider } from './slider';

@Component({
  imports: [WrSlider],
  template: ` <wr-slider [(value)]="amount" [min]="min()" [max]="max()" [step]="step()" [disabled]="disabled()" /> `,
})
class Host {
  readonly amount = signal<number | [number, number]>(50);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly disabled = signal(false);
}

@Component({
  imports: [WrSlider],
  template: `<wr-slider range [(value)]="span" [min]="0" [max]="100" />`,
})
class RangeHost {
  readonly span = signal<[number, number]>([20, 80]);
}

/**
 * Dragging needs a real compositor, so what a unit suite can own here is the
 * half that does not: the ARIA contract a screen reader reads, and the keyboard
 * path — which for a slider is the ONLY path some users have.
 */
describe('WrSlider', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const thumb = (): HTMLElement => root().querySelector<HTMLElement>('[role="slider"]')!;
  const amount = (): number => fixture.componentInstance.amount() as number;

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    thumb().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents a thumb with the full ARIA slider contract', () => {
    expect(thumb().getAttribute('aria-valuemin')).toBe('0');
    expect(thumb().getAttribute('aria-valuemax')).toBe('100');
    expect(thumb().getAttribute('aria-valuenow')).toBe('50');
    // A native <button> carrying the role — focusable without a `tabindex`, and
    // it goes out of the tab order by itself when disabled.
    expect(thumb().tagName).toBe('BUTTON');
    expect((thumb() as HTMLButtonElement).disabled).toBe(false);
  });

  it('moves aria-valuenow with the value', () => {
    fixture.componentInstance.amount.set(75);
    fixture.detectChanges();

    expect(thumb().getAttribute('aria-valuenow')).toBe('75');
  });

  it('steps with the arrows in both directions', () => {
    press('ArrowRight');
    expect(amount()).toBe(51);

    press('ArrowUp');
    expect(amount()).toBe(52);

    press('ArrowLeft');
    press('ArrowDown');
    expect(amount()).toBe(50);
  });

  it('honours a custom step', () => {
    fixture.componentInstance.step.set(10);
    fixture.detectChanges();

    press('ArrowRight');
    expect(amount()).toBe(60);
  });

  it('clamps at both bounds', () => {
    fixture.componentInstance.amount.set(99);
    fixture.detectChanges();
    press('ArrowRight');
    press('ArrowRight');
    expect(amount()).toBe(100);

    fixture.componentInstance.amount.set(1);
    fixture.detectChanges();
    press('ArrowLeft');
    press('ArrowLeft');
    expect(amount()).toBe(0);
  });

  it('jumps to the bounds with Home and End', () => {
    press('Home');
    expect(amount()).toBe(0);

    press('End');
    expect(amount()).toBe(100);
  });

  it('takes a bigger stride with PageUp and PageDown', () => {
    const before = amount();
    press('PageUp');

    // A 1% step over a 0-100 range makes the keyboard unusable without one.
    expect(amount()).toBeGreaterThan(before + 1);
  });

  it('respects a min above zero', () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.amount.set(21);
    fixture.detectChanges();

    press('Home');
    expect([amount(), thumb().getAttribute('aria-valuemin')]).toEqual([20, '20']);
  });

  it('ignores the keyboard while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    press('ArrowRight');
    expect(amount()).toBe(50);
  });

  it('leaves keys it does not own to the page', () => {
    expect(press('Tab').defaultPrevented).toBe(false);
  });

  describe('range mode', () => {
    let range: ReturnType<typeof TestBed.createComponent<RangeHost>>;

    const thumbs = (): HTMLElement[] => [
      ...(range.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="slider"]'),
    ];

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      range = TestBed.createComponent(RangeHost);
      range.detectChanges();
    });

    afterEach(() => range.destroy());

    it('gives each end its own thumb, named and bounded by the other', () => {
      expect(thumbs()).toHaveLength(2);
      expect(thumbs().map(t => t.getAttribute('aria-valuenow'))).toEqual(['20', '80']);
      // The ends bound each other, so a screen reader reads the real room each
      // thumb has rather than the whole track.
      expect(thumbs()[0].getAttribute('aria-valuemax')).toBe('80');
      expect(thumbs()[1].getAttribute('aria-valuemin')).toBe('20');
      expect(thumbs().map(t => t.getAttribute('aria-label'))).toEqual(['Lower value', 'Upper value']);
    });

    it('moves one end without disturbing the other', () => {
      thumbs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      range.detectChanges();

      expect(range.componentInstance.span()).toEqual([21, 80]);
    });

    it('does not let the lower end cross the upper one', () => {
      range.componentInstance.span.set([79, 80]);
      range.detectChanges();

      for (let i = 0; i < 4; i++) {
        thumbs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        range.detectChanges();
      }

      // Crossing would invert the range and every consumer reading `[from, to]`
      // would silently get them backwards.
      const [low, high] = range.componentInstance.span();
      expect(low).toBeLessThanOrEqual(high);
    });
  });
});
