import { Component, type EnvironmentProviders, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import type { WrInputSize } from 'ngwr/input';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputNumber } from './input-number';

@Component({
  imports: [WrInputNumber],
  template: `<wr-input-number incrementLabel="Up" decrementLabel="Down" />`,
})
class LabelledHost {}

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

/**
 * Two controls: one that binds `[size]` / `[rounded]` — because the only thing
 * that makes an app-wide default safe is that a template can still override it —
 * and one that writes `rounded` as a bare attribute, which is a value the author
 * typed rather than an absence.
 *
 * Both inputs are FORWARDED to the chrome (`<wr-input-group>` + `[wrInput]`), so
 * every assertion here reads the classes that chrome renders.
 */
@Component({
  imports: [WrInputNumber],
  template: `
    <wr-input-number [size]="size()" [rounded]="rounded()" />
    <wr-input-number rounded />
  `,
})
class ConfigHost {
  readonly size = signal<WrInputSize | null>(null);
  readonly rounded = signal<boolean | null>(null);
}

describe('WrInputNumber defaults from provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;

  const mount = (providers: EnvironmentProviders[] = []): ConfigHost => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  /** The chrome of one of the two controls — `0` binds, `1` carries the attribute. */
  const chrome = (index: number): { field: HTMLInputElement; group: HTMLElement } => {
    const control = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-input-number')][index];
    return { field: control.querySelector('input')!, group: control.querySelector('wr-input-group')! };
  };

  afterEach(() => fixture.destroy());

  it('renders exactly as before when no config is provided', () => {
    // The invariant the whole change rests on: an unbound field is `md` and
    // square, which means no modifier class on either half of the chrome.
    mount();

    expect(chrome(0).field.className).toBe('wr-input');
    expect(chrome(0).group.className).toBe('wr-input-group');
  });

  it('takes the configured size when the template binds none', () => {
    mount([provideWrConfig({ inputNumber: { size: 'sm' } })]);

    expect(chrome(0).field.classList.contains('wr-input--sm')).toBe(true);
  });

  it('rounds both halves of the chrome from the config, not just one', () => {
    mount([provideWrConfig({ inputNumber: { rounded: true } })]);

    // The group owns the visible border, the field owns the text inset — a pill
    // resolved on only one of them leaves the corner the user sees square.
    expect(chrome(0).group.classList.contains('wr-input-group--rounded')).toBe(true);
    expect(chrome(0).field.classList.contains('wr-input--rounded')).toBe(true);
  });

  it('lets a bound size beat the configured one', () => {
    const instance = mount([provideWrConfig({ inputNumber: { size: 'sm' } })]);
    instance.size.set('lg');
    fixture.detectChanges();

    expect(chrome(0).field.classList.contains('wr-input--lg')).toBe(true);
    expect(chrome(0).field.classList.contains('wr-input--sm')).toBe(false);
  });

  it('lets a bound `false` turn a configured `rounded` back off', () => {
    // The case that decides whether the config is escapable at all: `false` is a
    // value, not an absence, so it must not fall through to the configured `true`.
    const instance = mount([provideWrConfig({ inputNumber: { rounded: true } })]);
    instance.rounded.set(false);
    fixture.detectChanges();

    expect(chrome(0).group.classList.contains('wr-input-group--rounded')).toBe(false);
    expect(chrome(0).field.classList.contains('wr-input--rounded')).toBe(false);
  });

  it('still reads a bare `rounded` attribute as true', () => {
    // The transform maps only `null` / `undefined` to "not set". A valueless
    // attribute arrives as `''`, which is a value the author wrote.
    mount();

    expect(chrome(1).group.classList.contains('wr-input-group--rounded')).toBe(true);
  });

  it('falls back to the `input` key where `inputNumber` says nothing', () => {
    // The field IS a `[wrInput]`, and that directive resolves `input.size` for
    // itself. Since this control binds the value down — and a bound value wins —
    // an unchained lookup would make this the one field in the app that ignored
    // an app-wide `input.size`.
    mount([provideWrConfig({ input: { size: 'sm', rounded: true } })]);

    expect(chrome(0).field.classList.contains('wr-input--sm')).toBe(true);
    expect(chrome(0).group.classList.contains('wr-input-group--rounded')).toBe(true);
  });

  it('lets a binding escape the general `input` key too, not just `inputNumber`', () => {
    // The chain reads TWO keys, so escapability has to hold at both of them — and
    // the general one is the harder half: the value travels down to a
    // `<wr-input-group>` / `[wrInput]` that resolves `input.*` for itself, so a
    // bound `false` has to beat the configured `true` in the CHROME as well. Get
    // that wrong and the pill survives on the element the user actually sees.
    const instance = mount([provideWrConfig({ input: { size: 'sm', rounded: true } })]);
    instance.size.set('lg');
    instance.rounded.set(false);
    fixture.detectChanges();

    expect(chrome(0).field.classList.contains('wr-input--lg')).toBe(true);
    expect(chrome(0).field.classList.contains('wr-input--sm')).toBe(false);
    expect(chrome(0).field.classList.contains('wr-input--rounded')).toBe(false);
    expect(chrome(0).group.classList.contains('wr-input-group--rounded')).toBe(false);
  });

  it('prefers `inputNumber` over `input` when both are configured', () => {
    mount([provideWrConfig({ input: { size: 'sm' }, inputNumber: { size: 'lg' } })]);

    expect(chrome(0).field.classList.contains('wr-input--lg')).toBe(true);
    expect(chrome(0).field.classList.contains('wr-input--sm')).toBe(false);
  });

  it('goes back to the config when a binding is cleared', () => {
    const instance = mount([provideWrConfig({ inputNumber: { size: 'sm' } })]);
    instance.size.set('lg');
    fixture.detectChanges();
    expect(chrome(0).field.classList.contains('wr-input--lg')).toBe(true);

    instance.size.set(null);
    fixture.detectChanges();
    expect(chrome(0).field.classList.contains('wr-input--sm')).toBe(true);
  });

  it('ignores a config that names other components', () => {
    mount([provideWrConfig({ inputOtp: { size: 'sm' }, select: { rounded: true } })]);

    expect(chrome(0).field.className).toBe('wr-input');
    expect(chrome(0).group.className).toBe('wr-input-group');
  });
});

/**
 * The steppers are icon-only, so their `aria-label` IS their accessible name —
 * and it was the English literal `"Increment"` in the template while
 * `inputNumber.increment` sat unread in both shipped catalogs. Nothing failed:
 * the string was right for one language and every gate is in that language.
 */
describe('WrInputNumber stepper names', () => {
  afterEach(() => TestBed.resetTestingModule());

  const steppers = (fixture: ComponentFixture<unknown>): (string | null)[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-input-number__step')].map(b =>
      b.getAttribute('aria-label')
    );

  it('comes from the catalog, not from the template', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const labels = steppers(fixture);
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      expect(label).toBeTruthy();
      expect(/\p{Script=Cyrillic}/u.test(label ?? ''), `"${label ?? ''}" is still English`).toBe(true);
    }
  });

  it('falls back to English when nothing is registered', () => {
    TestBed.configureTestingModule({ providers: [] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(steppers(fixture)).toEqual(['Increment', 'Decrement']);
  });

  it('lets a binding win over both', () => {
    TestBed.configureTestingModule({ providers: [] });
    const fixture = TestBed.createComponent(LabelledHost);
    fixture.detectChanges();

    expect(steppers(fixture)).toEqual(['Up', 'Down']);
  });
});
