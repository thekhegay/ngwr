import { Component, type EnvironmentProviders, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSwitch, type WrSwitchSize } from './switch';

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

@Component({
  imports: [WrSwitch],
  template: `<wr-switch [size]="size()">Notifications</wr-switch>`,
})
class SizeHost {
  readonly size = signal<WrSwitchSize | null>(null);
}

@Component({
  imports: [WrSwitch],
  template: `<wr-switch id="sw">Notifications</wr-switch>`,
})
class IdHost {}

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

/**
 * `provideWrConfig()` is a FALLBACK, not an override: the app-wide `switch.size`
 * applies only where the template said nothing, and a bound `[size]` still wins.
 * The first test is the invariant the whole change rests on — with no config the
 * switch renders exactly what it always did, which for `md` is no modifier at all.
 */
describe('WrSwitch + provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SizeHost>>;

  const mount = (providers: EnvironmentProviders[] = []): HTMLElement => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-switch')!;
  };

  afterEach(() => fixture.destroy());

  it('renders the md default with no modifier class when nothing is configured', () => {
    expect(mount().className).toBe('wr-switch');
  });

  it('takes the configured size when the template binds none', () => {
    expect(mount([provideWrConfig({ switch: { size: 'sm' } })]).className).toBe('wr-switch wr-switch--sm');
  });

  it('lets a bound size beat the configured one', () => {
    const host = mount([provideWrConfig({ switch: { size: 'sm' } })]);
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();

    expect(host.classList.contains('wr-switch--lg')).toBe(true);
    expect(host.classList.contains('wr-switch--sm')).toBe(false);
  });

  it('lets an explicitly bound `md` beat the configured size', () => {
    const host = mount([provideWrConfig({ switch: { size: 'sm' } })]);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();

    // The size counterpart of `[rounded]="false"`: `md` is the one bound value
    // that renders as the ABSENCE of a class, so an implementation that treats it
    // as "not set" looks identical to a correct one in every other test here.
    expect(host.className).toBe('wr-switch');
  });

  it('ignores a config that names other components', () => {
    expect(mount([provideWrConfig({ checkbox: { size: 'lg' } })]).className).toBe('wr-switch');
  });
});

/**
 * `[id]` is documented as "the id used to associate the native input with its
 * label", and using it used to be exactly what broke that association: Angular
 * feeds a static `id="x"` to the input AND leaves it on the host, so the
 * document held two elements with the id, `<label for>` resolved through
 * `getElementById` to the `<wr-switch>` host — not a labelable element — and
 * `input.labels` went from 1 to 0. The host binding that strips it is the fix,
 * and these are the three observable consequences of it.
 */
describe('WrSwitch with an author-supplied id', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<IdHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-switch')!;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-switch__input')!;
  const label = (): HTMLLabelElement => root().querySelector<HTMLLabelElement>('label')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(IdHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps the id on the native input and off the host', () => {
    expect(input().id).toBe('sw');
    expect(host().hasAttribute('id')).toBe(false);
  });

  it('leaves exactly one element in the document carrying it', () => {
    expect(root().querySelectorAll('#sw')).toHaveLength(1);
    expect(document.getElementById('sw')).toBe(input());
  });

  it('still labels the control', () => {
    expect(label().htmlFor).toBe('sw');
    expect(input().labels).toHaveLength(1);
  });
});
