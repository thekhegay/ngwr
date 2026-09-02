import { Component, type EnvironmentProviders, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrRadio, type WrRadioSize } from './radio';
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
 * `size` lives on the OPTION, not on the group — there is no `<wr-radio-group
 * size>` to inherit from — so the second radio is left unbound to show what the
 * app config reaches.
 */
@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <wr-radio-group>
      <wr-radio value="small" [size]="size()">Small</wr-radio>
      <wr-radio value="large">Large</wr-radio>
    </wr-radio-group>
  `,
})
class SizeHost {
  readonly size = signal<WrRadioSize | null>(null);
}

@Component({
  imports: [WrRadio, WrRadioGroup],
  template: `
    <wr-radio-group>
      <wr-radio id="rad" value="free">Free</wr-radio>
    </wr-radio-group>
  `,
})
class IdHost {}

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

/**
 * `provideWrConfig()` is a FALLBACK, not an override: the app-wide `radio.size`
 * applies only where the template said nothing, and a bound `[size]` still wins.
 * The first test is the invariant the whole change rests on — with no config both
 * options render exactly what they always did, which for `md` is no modifier at all.
 */
describe('WrRadio + provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SizeHost>>;

  const mount = (providers: EnvironmentProviders[] = []): HTMLElement[] => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-radio')];
  };

  afterEach(() => fixture.destroy());

  it('renders the md default with no modifier class when nothing is configured', () => {
    expect(mount().map(h => h.className)).toEqual(['wr-radio', 'wr-radio']);
  });

  it('takes the configured size on every option the template left unbound', () => {
    expect(mount([provideWrConfig({ radio: { size: 'lg' } })]).map(h => h.className)).toEqual([
      'wr-radio wr-radio--lg',
      'wr-radio wr-radio--lg',
    ]);
  });

  it('lets a bound size beat the configured one, per option', () => {
    const hosts = mount([provideWrConfig({ radio: { size: 'lg' } })]);
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();

    // The bound option wins; its unbound sibling still follows the config.
    expect(hosts.map(h => h.className)).toEqual(['wr-radio wr-radio--sm', 'wr-radio wr-radio--lg']);
  });

  it('lets an explicitly bound `md` beat the configured size', () => {
    const hosts = mount([provideWrConfig({ radio: { size: 'lg' } })]);
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();

    // The size counterpart of `[rounded]="false"`: `md` is the one bound value
    // that renders as the ABSENCE of a class, so an implementation that treats it
    // as "not set" looks identical to a correct one in every other test here — the
    // configured sibling next to it is what makes the difference visible.
    expect(hosts.map(h => h.className)).toEqual(['wr-radio', 'wr-radio wr-radio--lg']);
  });

  it('ignores a config that names other components', () => {
    expect(mount([provideWrConfig({ checkbox: { size: 'lg' } })]).map(h => h.className)).toEqual([
      'wr-radio',
      'wr-radio',
    ]);
  });
});

/**
 * `[id]` is documented as "the id used to associate the native input with its
 * label", and using it used to be exactly what broke that association: Angular
 * feeds a static `id="x"` to the input AND leaves it on the host, so the
 * document held two elements with the id, `<label for>` resolved through
 * `getElementById` to the `<wr-radio>` host — not a labelable element — and
 * `input.labels` went from 1 to 0. The host binding that strips it is the fix,
 * and these are the three observable consequences of it.
 */
describe('WrRadio with an author-supplied id', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<IdHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-radio')!;
  const input = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input.wr-radio__input')!;
  const label = (): HTMLLabelElement => root().querySelector<HTMLLabelElement>('label')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(IdHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps the id on the native input and off the host', () => {
    expect(input().id).toBe('rad');
    expect(host().hasAttribute('id')).toBe(false);
  });

  it('leaves exactly one element in the document carrying it', () => {
    expect(root().querySelectorAll('#rad')).toHaveLength(1);
    expect(document.getElementById('rad')).toBe(input());
  });

  it('still labels the control', () => {
    expect(label().htmlFor).toBe('rad');
    expect(input().labels).toHaveLength(1);
  });
});
