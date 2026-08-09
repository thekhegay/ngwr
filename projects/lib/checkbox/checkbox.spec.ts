import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCheckbox } from './checkbox';
import { WrCheckboxGroup } from './checkbox-group';

@Component({
  imports: [WrCheckbox],
  template: `
    <wr-checkbox
      [(checked)]="checked"
      [disabled]="disabled()"
      [indeterminate]="indeterminate()"
      [ariaLabel]="ariaLabel()"
      (touch)="touched.set(touched() + 1)"
    >
      Accept terms
    </wr-checkbox>
  `,
})
class Host {
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly indeterminate = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly touched = signal(0);
}

@Component({
  imports: [WrCheckbox, WrCheckboxGroup],
  template: `
    <wr-checkbox-group [(value)]="picked" [disabled]="groupDisabled()">
      <wr-checkbox checkboxValue="a">A</wr-checkbox>
      <wr-checkbox checkboxValue="b">B</wr-checkbox>
      <wr-checkbox checkboxValue="c">C</wr-checkbox>
    </wr-checkbox-group>
  `,
})
class GroupHost {
  readonly picked = signal<unknown[]>([]);
  readonly groupDisabled = signal(false);
}

/**
 * `WrCheckbox` is a signal-forms control, so the binding is the contract: the
 * boolean state is `checked`, and group membership is `checkboxValue` — NOT
 * `value`, which `FormCheckboxControl` reserves for the form value. That split
 * is the component's sharpest edge (a stray `value="x"` lands on the host as a
 * plain DOM attribute and every box in the group keeps the default identity),
 * so the group tests below are really about it.
 *
 * Assertions read the rendered DOM — the native input's state and the public
 * `.wr-*` classes — rather than component internals, because those are what a
 * consumer styles and what a screen reader reads.
 */
describe('WrCheckbox', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-checkbox__input')!;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-checkbox')!;

  /** Click through the label the way a user does, not by poking the model. */
  const toggle = (): void => {
    input().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a native checkbox with the projected text as its label', () => {
    expect(input().type).toBe('checkbox');
    expect(root().querySelector('.wr-checkbox__text')!.textContent.trim()).toBe('Accept terms');
    // The label wraps the input, so the projected text names it without an
    // explicit `aria-label`.
    expect(root().querySelector('label')!.getAttribute('for')).toBe(input().id);
  });

  it('reflects the bound state and writes back through the two-way model', () => {
    expect(input().checked).toBe(false);

    toggle();
    expect([input().checked, fixture.componentInstance.checked()]).toEqual([true, true]);

    fixture.componentInstance.checked.set(false);
    fixture.detectChanges();
    expect(input().checked).toBe(false);
  });

  it('renders the indeterminate state on the native input, where AT can see it', () => {
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();

    // A tri-state box drawn only in CSS announces as plain unchecked.
    expect(input().indeterminate).toBe(true);
    expect(root().querySelector('.wr-checkbox__dash')).not.toBeNull();
    expect(root().querySelector('.wr-checkbox__mark')).toBeNull();
  });

  it('does not toggle while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(input().disabled).toBe(true);
    input().dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('takes an ariaLabel for a box with no projected text', () => {
    fixture.componentInstance.ariaLabel.set('Select row 3');
    fixture.detectChanges();

    // An `aria-label` on the host would not reach the native control inside it.
    expect(input().getAttribute('aria-label')).toBe('Select row 3');
  });

  it('emits touch on blur so a bound field can mark itself touched', () => {
    input().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('carries the public BEM classes', () => {
    expect([...host().classList]).toContain('wr-checkbox');

    toggle();
    expect(host().className).toContain('wr-checkbox--checked');
  });
});

describe('WrCheckboxGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const inputs = (): HTMLInputElement[] => [...root().querySelectorAll<HTMLInputElement>('input.wr-checkbox__input')];
  const picked = (): unknown[] => fixture.componentInstance.picked();

  const click = (index: number): void => {
    inputs()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('collects each box under its own checkboxValue', () => {
    click(0);
    click(2);

    // The identity that matters is `checkboxValue`. With a stray `value="x"`
    // instead, every box keeps the default identity `null` — they all toggle
    // together and the group reports one entry.
    expect(picked()).toEqual(['a', 'c']);
  });

  it('drops a value again when its box is unchecked', () => {
    click(1);
    expect(picked()).toEqual(['b']);

    click(1);
    expect(picked()).toEqual([]);
  });

  it('checks the boxes named by an externally written value', () => {
    fixture.componentInstance.picked.set(['a', 'c']);
    fixture.detectChanges();

    expect(inputs().map(i => i.checked)).toEqual([true, false, true]);
  });

  it('disables every box from the group', () => {
    fixture.componentInstance.groupDisabled.set(true);
    fixture.detectChanges();

    expect(inputs().map(i => i.disabled)).toEqual([true, true, true]);

    inputs()[0].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(picked()).toEqual([]);
  });

  it('keeps the boxes independent of one another', () => {
    click(0);

    // The failure this guards is the `value`-instead-of-`checkboxValue` one: a
    // shared identity makes the whole group move as a single control.
    expect(inputs().map(i => i.checked)).toEqual([true, false, false]);
  });
});
