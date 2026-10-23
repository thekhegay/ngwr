import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, disabled, form } from '@angular/forms/signals';

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
  readonly size = signal<WrSwitchSize>('md');
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
 * The size lands as a BEM modifier, and `md` is the one value that renders as
 * the ABSENCE of a class.
 */
describe('WrSwitch size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SizeHost>>;

  const mount = (): HTMLElement => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-switch')!;
  };

  afterEach(() => fixture.destroy());

  it('renders the md default with no modifier class', () => {
    expect(mount().className).toBe('wr-switch');
  });

  it('turns a bound size into its modifier, and drops it again for md', () => {
    const host = mount();
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();
    expect(host.className).toBe('wr-switch wr-switch--sm');

    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(host.className).toBe('wr-switch');
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

/**
 * `focusBoundControl()` is how a form puts the user on a field — the first
 * invalid one after a failed submit, typically. Signal Forms asks the bound
 * component for `focus()` and otherwise focuses the HOST, which here is an
 * element with no tab stop: the call did nothing and focus stayed where it was.
 */
@Component({
  imports: [FormField, WrSwitch],
  template: `<wr-switch [formField]="prefs.alerts">Alerts</wr-switch>`,
})
class FocusHost {
  readonly locked = signal(false);
  readonly model = signal({ alerts: false });
  readonly prefs = form(this.model, path => {
    disabled(path.alerts, () => this.locked());
  });
}

describe('WrSwitch under focusBoundControl()', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FocusHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FocusHost);
    // Attached, or `focus()` moves nothing: an element outside the document
    // cannot be the active one, and every assertion here would read `<body>`.
    document.body.appendChild(root());
    await fixture.whenStable();
  });

  afterEach(() => {
    root().remove();
    fixture.destroy();
  });

  it('focuses the native input', () => {
    fixture.componentInstance.prefs.alerts().focusBoundControl();

    expect(document.activeElement).toBe(root().querySelector('input.wr-switch__input'));
  });

  it('leaves focus alone while disabled', async () => {
    fixture.componentInstance.locked.set(true);
    await fixture.whenStable();

    fixture.componentInstance.prefs.alerts().focusBoundControl();

    expect(root().contains(document.activeElement)).toBe(false);
  });
});
