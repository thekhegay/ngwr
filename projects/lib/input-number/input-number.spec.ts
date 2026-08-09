import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputNumber } from './input-number';

@Component({
  imports: [WrInputNumber],
  template: `
    <wr-input-number
      [(value)]="amount"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [disabled]="disabled()"
      [readonly]="readonly()"
    />
  `,
})
class Host {
  readonly amount = signal<number | null>(5);
  readonly min = signal<number | undefined>(undefined);
  readonly max = signal<number | undefined>(undefined);
  readonly step = signal(1);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
}

/**
 * A number field with steppers has three ways in — typing, the buttons, and the
 * arrow keys — and they have to agree about the bounds. The one that usually
 * escapes is typing: a value clamped for the buttons but not for the keyboard
 * lets a form submit something the control claims is impossible.
 */
describe('WrInputNumber', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const stepper = (label: string): HTMLButtonElement =>
    [...root().querySelectorAll<HTMLButtonElement>('button')].find(b => b.getAttribute('aria-label') === label)!;
  const amount = (): number | null => fixture.componentInstance.amount();

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    field().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  const type = (text: string): void => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const blur = (): void => {
    field().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the bound value and names its steppers', () => {
    expect(field().value).toBe('5');
    expect(stepper('Increment')).toBeTruthy();
    expect(stepper('Decrement')).toBeTruthy();
  });

  it('steps with the buttons', () => {
    stepper('Increment').click();
    fixture.detectChanges();
    expect(amount()).toBe(6);

    stepper('Decrement').click();
    fixture.detectChanges();
    expect(amount()).toBe(5);
  });

  it('steps with the arrow keys', () => {
    press('ArrowUp');
    expect(amount()).toBe(6);

    press('ArrowDown');
    press('ArrowDown');
    expect(amount()).toBe(4);
  });

  it('honours a custom step on both paths', () => {
    fixture.componentInstance.step.set(0.5);
    fixture.detectChanges();

    press('ArrowUp');
    expect(amount()).toBe(5.5);

    stepper('Increment').click();
    fixture.detectChanges();
    expect(amount()).toBe(6);
  });

  it('clamps the buttons at both bounds', () => {
    fixture.componentInstance.min.set(4);
    fixture.componentInstance.max.set(6);
    fixture.detectChanges();

    stepper('Increment').click();
    stepper('Increment').click();
    fixture.detectChanges();
    expect(amount()).toBe(6);

    for (let i = 0; i < 4; i++) stepper('Decrement').click();
    fixture.detectChanges();
    expect(amount()).toBe(4);
  });

  it('clamps a TYPED value too, once the field is left', () => {
    fixture.componentInstance.min.set(0);
    fixture.componentInstance.max.set(10);
    fixture.detectChanges();

    type('999');
    blur();

    // The path that usually escapes: bounds enforced for the buttons but not
    // for typing let a form submit a value the control says is impossible.
    expect(amount()).toBeLessThanOrEqual(10);
  });

  it('treats an emptied field as no value rather than as zero', () => {
    type('');

    // Zero is a number someone may have meant; empty is the absence of one, and
    // a required-field check has to be able to tell them apart.
    expect(amount()).toBeNull();
  });

  it('keeps the committed value while unparseable text is in the field', () => {
    type('abc');

    // Not the same as clearing. A half-typed or mistyped entry must not destroy
    // the number that was already there — the same rule `wr-date-picker`
    // follows for a partial date.
    expect(amount()).toBe(5);
  });

  it('takes no input while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(field().disabled).toBe(true);
    press('ArrowUp');
    expect(amount()).toBe(5);
  });

  it('takes no input while readonly', () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();

    expect(field().readOnly).toBe(true);
    press('ArrowUp');
    expect(amount()).toBe(5);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.amount.set(42);
    fixture.detectChanges();

    expect(field().value).toBe('42');
  });

  it('leaves keys it does not own to the field', () => {
    // Typing a digit must not be swallowed by the stepper handler.
    expect(press('7').defaultPrevented).toBe(false);
  });
});
