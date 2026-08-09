import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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

  it('clamps a value written from outside into the range', () => {
    fixture.componentInstance.score.set(99);
    fixture.detectChanges();

    // A form or an API can hand over anything. Left unclamped, the stars run
    // past the end of the row and `aria-valuenow` exceeds its own
    // `aria-valuemax`, which is an invalid slider.
    expect(fixture.componentInstance.score()).toBe(5);
    expect(slider().getAttribute('aria-valuenow')).toBe('5');

    fixture.componentInstance.score.set(-3);
    fixture.detectChanges();
    expect(fixture.componentInstance.score()).toBe(0);
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

  it('carries a name, defaulting to the catalog string', () => {
    expect(slider().getAttribute('aria-label')).toBe('Rating');

    fixture.componentInstance.ariaLabel.set('Rate this article');
    fixture.detectChanges();
    expect(slider().getAttribute('aria-label')).toBe('Rate this article');
  });
});
