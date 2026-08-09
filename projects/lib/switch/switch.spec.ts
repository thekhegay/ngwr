import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSwitch } from './switch';

@Component({
  imports: [WrSwitch],
  template: `
    <wr-switch [(checked)]="on" [disabled]="disabled()" [ariaLabel]="ariaLabel()" (touch)="touched.set(touched() + 1)">
      Notifications
    </wr-switch>
  `,
})
class Host {
  readonly on = signal(false);
  readonly disabled = signal(false);
  readonly ariaLabel = signal<string | null>(null);
  readonly touched = signal(0);
}

/**
 * A switch is a checkbox that announces differently: `role="switch"` makes a
 * screen reader say "on/off" instead of "checked/unchecked". That role sits on
 * the NATIVE input, which is the only place it reaches assistive tech — a role
 * on the host element would be read past.
 */
describe('WrSwitch', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-switch__input')!;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-switch')!;

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

  it('announces as a switch, not as a checkbox', () => {
    expect(input().getAttribute('role')).toBe('switch');
    expect(input().type).toBe('checkbox');
  });

  it('reflects the bound state and writes back through the two-way model', () => {
    expect(input().checked).toBe(false);

    toggle();
    expect([input().checked, fixture.componentInstance.on()]).toEqual([true, true]);

    fixture.componentInstance.on.set(false);
    fixture.detectChanges();
    expect(input().checked).toBe(false);
  });

  it('names itself from the projected text, and takes an override', () => {
    expect(root().querySelector('.wr-switch__text')!.textContent.trim()).toBe('Notifications');

    fixture.componentInstance.ariaLabel.set('Enable notifications');
    fixture.detectChanges();
    // An `aria-label` on the host would not reach the native control inside it.
    expect(input().getAttribute('aria-label')).toBe('Enable notifications');
  });

  it('does not toggle while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(input().disabled).toBe(true);
    input().dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.on()).toBe(false);
  });

  it('emits touch on blur so a bound field can mark itself touched', () => {
    input().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.touched()).toBe(1);
  });

  it('carries the public BEM classes, including the checked modifier', () => {
    expect(host().className).toContain('wr-switch');
    expect(host().className).not.toContain('wr-switch--checked');

    toggle();
    expect(host().className).toContain('wr-switch--checked');
  });
});
