import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrRadio } from './radio';
import { WrRadioGroup } from './radio-group';

@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <wr-radio-group
      [(value)]="picked"
      [name]="name()"
      [disabled]="groupDisabled()"
      (touch)="touched.set(touched() + 1)"
    >
      <wr-radio value="small">Small</wr-radio>
      <wr-radio value="medium" [disabled]="mediumDisabled()">Medium</wr-radio>
      <wr-radio value="large">Large</wr-radio>
    </wr-radio-group>
  `,
})
class Host {
  readonly picked = signal<unknown>(null);
  readonly name = signal('size');
  readonly groupDisabled = signal(false);
  readonly mediumDisabled = signal(false);
  readonly touched = signal(0);
}

/**
 * A radio only means anything as part of a group, so every test here goes
 * through one. The two things worth pinning are that the native inputs share a
 * `name` — which is what makes them mutually exclusive for a screen reader and
 * for keyboard arrow navigation, not just visually — and that `value` identity
 * survives being something other than a string.
 */
describe('WrRadio in a group', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const inputs = (): HTMLInputElement[] => [...root().querySelectorAll<HTMLInputElement>('input.wr-radio__input')];
  const picked = (): unknown => fixture.componentInstance.picked();

  const click = (index: number): void => {
    inputs()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders native radios that share the group name', () => {
    expect(inputs()).toHaveLength(3);
    expect(inputs().every(i => i.type === 'radio')).toBe(true);

    // The shared `name` is what makes them one control: without it a screen
    // reader announces three unrelated radios and arrow keys do not move
    // between them.
    expect([...new Set(inputs().map(i => i.name))]).toEqual(['size']);
  });

  it('selects the clicked value and deselects the rest', () => {
    click(2);

    expect(picked()).toBe('large');
    expect(inputs().map(i => i.checked)).toEqual([false, false, true]);
  });

  it('follows a value written from outside', () => {
    fixture.componentInstance.picked.set('medium');
    fixture.detectChanges();

    expect(inputs().map(i => i.checked)).toEqual([false, true, false]);
  });

  it('checks nothing for a value that matches no radio', () => {
    fixture.componentInstance.picked.set('enormous');
    fixture.detectChanges();

    expect(inputs().some(i => i.checked)).toBe(false);
  });

  it('disables one radio without touching its siblings', () => {
    fixture.componentInstance.mediumDisabled.set(true);
    fixture.detectChanges();

    expect(inputs().map(i => i.disabled)).toEqual([false, true, false]);

    click(0);
    expect(picked()).toBe('small');
  });

  it('disables every radio from the group', () => {
    fixture.componentInstance.groupDisabled.set(true);
    fixture.detectChanges();

    expect(inputs().map(i => i.disabled)).toEqual([true, true, true]);

    inputs()[0].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(picked()).toBeNull();
  });

  it('renames every radio when the group name changes', () => {
    fixture.componentInstance.name.set('preference');
    fixture.detectChanges();

    expect([...new Set(inputs().map(i => i.name))]).toEqual(['preference']);
  });

  it('emits touch on blur so a bound field can mark itself touched', () => {
    inputs()[0].dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('carries the public BEM classes, including the checked modifier', () => {
    const hosts = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-radio')];
    expect(hosts()[0].className).toContain('wr-radio');

    click(0);
    expect(hosts()[0].className).toContain('wr-radio--checked');
    expect(hosts()[1].className).not.toContain('wr-radio--checked');
  });
});
