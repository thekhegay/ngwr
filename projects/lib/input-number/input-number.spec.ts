import { Component, LOCALE_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';

import { WrFormField } from 'ngwr/form';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import type { WrInputSize } from 'ngwr/input';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  /**
   * Binary floats do not add.
   *
   * `bump()` handed `base + units * step` straight to `constrain()`, which only
   * rounds when `decimals` is set — and `format()` prints up to 20 fraction
   * digits. Three presses of a `step="0.1"` stepper therefore put
   * `0.30000000000000004` in the model AND on the screen.
   */
  it('does not accumulate float drift through the steppers', async () => {
    fixture.componentInstance.step.set(0.1);
    fixture.componentInstance.amount.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    stepper('Increment').click();
    stepper('Increment').click();
    stepper('Increment').click();
    fixture.detectChanges();

    expect(amount()).toBe(0.3);
    expect(field().value).toBe('0.3');
  });

  it('keeps a value that is genuinely off the step grid', async () => {
    // Rounding the drift must not quantise onto the step: 0.05 + 0.1 is 0.15,
    // not 0.2.
    fixture.componentInstance.step.set(0.1);
    fixture.componentInstance.amount.set(0.05);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    stepper('Increment').click();
    fixture.detectChanges();

    expect(amount()).toBe(0.15);
  });

  /**
   * The field shows what the model holds.
   *
   * It used to format `constrain(v)`, so a `[max]="10"` field handed 500 drew
   * "10" over a model that still said 500 — the DISPLAY was the thing lying.
   * Writing the clamp back instead would be worse: under `[formField]` the
   * bounds arrive only through the schema's `min()` / `max()` rules, so it
   * would erase the error those rules exist to raise and dirty a pristine form.
   * `min` / `max` bound what this component's own edits produce; a value
   * written from outside is displayed and left for validation to judge.
   */
  it('draws an out-of-range value instead of a clamp of it', async () => {
    fixture.componentInstance.max.set(10);
    fixture.componentInstance.amount.set(500);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(field().value, 'the field drew a number the model does not hold').toBe('500');
    expect(amount()).toBe(500);
  });

  it('still refuses to STEP past the bound', async () => {
    fixture.componentInstance.max.set(10);
    fixture.componentInstance.amount.set(9);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    stepper('Increment').click();
    stepper('Increment').click();
    fixture.detectChanges();

    expect(amount()).toBe(10);
  });

  /**
   * The anti-drift rounding must not manufacture drift. `round(v, 10)` scales
   * by 1e10, which leaves 2^53 above ~9e8: `round(1000000001, 10)` comes back
   * as `1000000000.9999999`, and each press then compounds it.
   */
  it('steps large integers exactly', async () => {
    fixture.componentInstance.amount.set(999_999_999);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    for (let i = 0; i < 4; i++) stepper('Increment').click();
    fixture.detectChanges();

    expect(amount()).toBe(1_000_000_003);
    expect(field().value).not.toContain('.');
  });

  it('does not round a very fine step away to nothing', async () => {
    fixture.componentInstance.step.set(1e-11);
    fixture.componentInstance.amount.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    stepper('Increment').click();
    fixture.detectChanges();

    expect(amount()).toBe(1e-11);
  });

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

  // Same shape-not-colour assertion as `WrDatePicker`'s: the disabled fill comes from
  // `.wr-input-group:has(> .wr-input:disabled)` in `ngwr/input`, and jsdom loads no
  // stylesheet — but the DOM shape that rule needs IS readable, and it is the half a
  // template edit would break. The field goes transparent inside the group, so the group
  // is what paints `--wr-color-fill`; a prefix / suffix / stepper column between them
  // does not matter, an extra wrapper around the input does.
  it('leaves the disabled field selectable by the rule that fills the group', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    const group = root().querySelector<HTMLElement>('wr-input-group')!;
    expect(field().parentElement).toBe(group);
    expect(group.matches(':has(> .wr-input:disabled)')).toBe(true);

    fixture.componentInstance.disabled.set(false);
    fixture.detectChanges();
    expect(group.matches(':has(> .wr-input:disabled)')).toBe(false);
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
 * Two controls: one that binds `[size]` / `[rounded]`, and one that writes
 * `rounded` as a bare attribute.
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
class ShapeHost {
  readonly size = signal<WrInputSize>('md');
  readonly rounded = signal(false);
}

describe('WrInputNumber size and shape', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ShapeHost>>;

  const mount = (): ShapeHost => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(ShapeHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  /** The chrome of one of the two controls — `0` binds, `1` carries the attribute. */
  const chrome = (index: number): { field: HTMLInputElement; group: HTMLElement } => {
    const control = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('wr-input-number')][index];
    return { field: control.querySelector('input')!, group: control.querySelector('wr-input-group')! };
  };

  afterEach(() => fixture.destroy());

  it('renders `md` and square with no modifier on either half of the chrome', () => {
    mount();

    expect(chrome(0).field.className).toBe('wr-input');
    expect(chrome(0).group.className).toBe('wr-input-group');
  });

  it('rounds both halves of the chrome, not just one', () => {
    const instance = mount();
    instance.rounded.set(true);
    fixture.detectChanges();

    // The group owns the visible border, the field owns the text inset — a pill
    // on only one of them leaves the corner the user sees square.
    expect(chrome(0).group.classList.contains('wr-input-group--rounded')).toBe(true);
    expect(chrome(0).field.classList.contains('wr-input--rounded')).toBe(true);
  });

  it('reads a bare `rounded` attribute as true', () => {
    mount();

    expect(chrome(1).group.classList.contains('wr-input-group--rounded')).toBe(true);
    expect(chrome(1).field.classList.contains('wr-input--rounded')).toBe(true);
  });

  it('mirrors the size and pill onto its own host', () => {
    // The stepper column is the field's SIBLING and the group carries no size, so
    // the host modifier is the only thing its chevrons and its pill inset can key
    // on.
    const instance = mount();
    // Sorted: a `[class]` binding applies its diff, so the order is not the contract.
    const classes = (): string[] => [...chrome(0).field.closest('wr-input-number')!.classList].sort();
    instance.size.set('sm');
    instance.rounded.set(true);
    fixture.detectChanges();

    expect(classes()).toEqual(['wr-input-number', 'wr-input-number--rounded', 'wr-input-number--sm']);

    instance.size.set('lg');
    instance.rounded.set(false);
    fixture.detectChanges();
    expect(classes()).toEqual(['wr-input-number', 'wr-input-number--lg']);
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

@Component({
  imports: [WrFormField, WrInputNumber],
  template: `<wr-form-field label="Quantity"><wr-input-number placeholder="0" /></wr-form-field>`,
})
class FieldHost {}

@Component({
  imports: [WrInputNumber],
  template: `<wr-input-number placeholder="0" />`,
})
class PlaceholderHost {}

/**
 * `aria-label` OUTRANKS a `<label>` in the accname order, so anything this
 * component writes there replaces the field's own text rather than adding to
 * it. It used to write the placeholder: a `<wr-form-field label="Quantity">`
 * around a field placeholdered "0" announced "0" — and announced nothing at all
 * once the user typed and the placeholder went away.
 */
describe('WrInputNumber accessible name', () => {
  afterEach(() => TestBed.resetTestingModule());

  const build = (component: typeof FieldHost | typeof PlaceholderHost): HTMLElement => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('leaves the naming to the surrounding form field', () => {
    const root = build(FieldHost);
    const label = root.querySelector<HTMLLabelElement>('label')!;
    const input = root.querySelector<HTMLInputElement>('input')!;

    expect(input.hasAttribute('aria-label')).toBe(false);
    expect(label.htmlFor).toBe(input.id);
    expect(input.id).not.toBe('');
  });

  it('leaves a standalone field named by its own placeholder', () => {
    const input = build(PlaceholderHost).querySelector<HTMLInputElement>('input')!;

    // Nothing is copied into `aria-label`; the placeholder attribute is the
    // name here, which is the fallback HTML itself defines for an unlabelled
    // text input (and what axe's `label` rule accepts).
    expect(input.hasAttribute('aria-label')).toBe(false);
    expect(input.placeholder).toBe('0');
  });
});

/**
 * Every documented `[size]`. The value is forwarded to the inner field rather
 * than emitted here, so the assertion reads the class the FIELD carries — and
 * `md`, the default, deliberately emits none.
 */
describe('WrInputNumber forwards every documented size to its field', () => {
  @Component({
    imports: [WrInputNumber],
    template: `<wr-input-number [size]="size()" />`,
  })
  class SizeHost {
    readonly size = signal<WrInputSize>('md');
  }

  const SIZES: readonly WrInputSize[] = ['sm', 'md', 'lg'];
  let fixture: ReturnType<typeof TestBed.createComponent<SizeHost>>;
  const field = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('input')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(SizeHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each(SIZES)('size %s', size => {
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();
    if (size === 'md') expect(field().className).not.toMatch(/wr-input--(sm|lg)/);
    else expect(field().classList).toContain(`wr-input--${size}`);
  });

  it.each(SIZES)('size %s on the host, where the stepper column reads it', size => {
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();
    const host = (fixture.nativeElement as HTMLElement).querySelector('wr-input-number')!;
    // `md` is the base, exactly as on the field: the ABSENCE of both modifiers.
    if (size === 'md') expect(host.className).not.toMatch(/wr-input-number--(sm|md|lg)/);
    else expect(host.classList).toContain(`wr-input-number--${size}`);
  });
});

/**
 * `focusBoundControl()` is how a Signal Forms app sends the user to a field —
 * the first invalid one after a failed submit, typically. It calls the bound
 * control's own `focus()`, and the host element's when there is none; this host
 * is a plain element with no tab stop, so without the method the call landed
 * nowhere and focus stayed where it was.
 */
describe('WrInputNumber focusBoundControl', () => {
  @Component({
    imports: [FormField, WrInputNumber],
    template: `<wr-input-number [formField]="form.qty" />`,
  })
  class FocusHost {
    readonly form = form(signal<{ qty: number | null }>({ qty: 3 }));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('moves focus into the text field, passing the options through', async () => {
    const fixture = TestBed.createComponent(FocusHost);
    await fixture.whenStable();
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-input-number')!;
    const input = host.querySelector<HTMLInputElement>('input')!;
    const spy = vi.spyOn(input, 'focus');

    fixture.componentInstance.form.qty().focusBoundControl({ preventScroll: true });

    expect(document.activeElement).toBe(input);
    expect(spy).toHaveBeenCalledWith({ preventScroll: true });
  });
});

/**
 * Typing the way a user in each locale types, one key at a time with a render between
 * keys, and committing the text the field itself displays.
 */
describe('WrInputNumber reads the locale it formats in', () => {
  @Component({
    imports: [WrInputNumber],
    template: `<wr-input-number [(value)]="amount" />`,
  })
  class LocaleHost {
    readonly amount = signal<number | null>(null);
  }

  const mount = (locale: string): ReturnType<typeof TestBed.createComponent<LocaleHost>> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
    const fixture = TestBed.createComponent(LocaleHost);
    fixture.detectChanges();
    return fixture;
  };
  const field = (fixture: { nativeElement: HTMLElement }): HTMLInputElement =>
    fixture.nativeElement.querySelector<HTMLInputElement>('input')!;

  const typeKeys = (fixture: ReturnType<typeof mount>, text: string): void => {
    const input = field(fixture);
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = '';
    for (const key of text) {
      input.value += key;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    }
    input.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
  };

  it.each(['ru', 'uk', 'kk', 'fr'])('takes an ordinary space as the %s thousands separator', locale => {
    // The locale groups with U+00A0 (ru, uk, kk) or U+202F (fr), and only that
    // character was stripped — so the keyboard's own space made `1 2…` unreadable and
    // the field kept the `1` typed before it.
    const fixture = mount(locale);
    typeKeys(fixture, '1 234,5');

    expect(fixture.componentInstance.amount()).toBe(1234.5);
  });

  it('reads back the digits it displays in a locale with its own numerals', () => {
    // ar-EG formats 1234.5 as `١٬٢٣٤٫٥`, and `Number()` reads none of those digits.
    const fixture = mount('ar-EG');
    typeKeys(fixture, '\u0661\u0662\u0663');
    expect(fixture.componentInstance.amount()).toBe(123);

    const shown = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 20 }).format(-1234.5);
    typeKeys(fixture, shown);
    expect(fixture.componentInstance.amount()).toBe(-1234.5);
  });

  it('reads back a negative number written with the minus sign', () => {
    // Swedish formats negatives with U+2212, not the hyphen a keyboard sends.
    const fixture = mount('sv');
    const shown = new Intl.NumberFormat('sv', { maximumFractionDigits: 20 }).format(-1234.5);
    expect(shown).toContain('\u2212');

    typeKeys(fixture, shown);
    expect(fixture.componentInstance.amount()).toBe(-1234.5);
  });
});
