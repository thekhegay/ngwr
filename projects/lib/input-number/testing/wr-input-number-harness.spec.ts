import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrInputNumber } from 'ngwr/input-number';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputNumberHarness } from './wr-input-number-harness';

@Component({
  imports: [WrInputNumber],
  template: `
    <wr-input-number
      placeholder="Quantity"
      prefix="$"
      suffix="kg"
      [(value)]="amount"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [decimals]="decimals()"
      [ariaLabel]="label()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (touch)="onTouch()"
    />
    <wr-input-number placeholder="Bare" [showSteppers]="false" />
    <wr-input-number placeholder="Locked" [value]="3" [disabled]="true" />
  `,
})
class Host {
  readonly amount = signal<number | null>(5);
  readonly min = signal<number | undefined>(undefined);
  readonly max = signal<number | undefined>(undefined);
  readonly step = signal(1);
  readonly decimals = signal<number | null>(null);
  readonly label = signal<string | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly touched = signal(0);

  onTouch(): void {
    this.touched.update(count => count + 1);
  }
}

/**
 * Used exactly as a consumer would: through the loader, with no internals touched.
 *
 * Every write is asserted against the HOST'S signal as well as against the field,
 * because on this control those two are allowed to disagree — that gap is the
 * thing the harness exists to make visible.
 */
describe('WrInputNumberHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const host = (): Host => fixture.componentInstance;
  const quantity = (): Promise<WrInputNumberHarness> =>
    loader.getHarness(WrInputNumberHarness.with({ placeholder: 'Quantity' }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every number field on the page, in DOM order', async () => {
    const all = await loader.getAllHarnesses(WrInputNumberHarness);

    expect(await Promise.all(all.map(field => field.getPlaceholder()))).toEqual(['Quantity', 'Bare', 'Locked']);
  });

  it('reads the value as a number and as the text in the field', async () => {
    const field = await quantity();

    expect(await field.getValue()).toBe(5);
    expect(await field.getValueText()).toBe('5');
  });

  it('reads an empty field as no value rather than as zero', async () => {
    const bare = await loader.getHarness(WrInputNumberHarness.with({ placeholder: 'Bare' }));

    expect(await bare.getValueText()).toBe('');
    // Zero is a number someone may have meant; empty is the absence of one, and a
    // required-field check has to be able to tell them apart.
    expect(await bare.getValue()).toBeNull();
  });

  it('narrows by text, by value and by placeholder', async () => {
    const byText = await loader.getAllHarnesses(WrInputNumberHarness.with({ text: '3' }));
    const byValue = await loader.getAllHarnesses(WrInputNumberHarness.with({ value: 5 }));
    const byPlaceholder = await loader.getHarness(WrInputNumberHarness.with({ placeholder: /^Bar/ }));

    expect(await Promise.all(byText.map(field => field.getPlaceholder()))).toEqual(['Locked']);
    expect(await Promise.all(byValue.map(field => field.getPlaceholder()))).toEqual(['Quantity']);
    expect(await byPlaceholder.getPlaceholder()).toBe('Bare');
  });

  it('reports a disabled field, and narrows by it', async () => {
    const disabled = await loader.getAllHarnesses(WrInputNumberHarness.with({ disabled: true }));

    expect(await Promise.all(disabled.map(field => field.getPlaceholder()))).toEqual(['Locked']);
    expect(await (await quantity()).isDisabled()).toBe(false);
    expect(await (await quantity()).isReadonly()).toBe(false);
  });

  it('types a number in, and the host hears it', async () => {
    const field = await quantity();
    await field.setValue(12);

    expect(await field.getValue()).toBe(12);
    expect(host().amount()).toBe(12);
  });

  it('refuses a value the field could never show', async () => {
    const field = await quantity();

    await expect(field.setValue(Number.POSITIVE_INFINITY)).rejects.toThrow(/finite/);
  });

  it('clears the field back to no value at all', async () => {
    const field = await quantity();
    await field.clear();

    expect(await field.getValueText()).toBe('');
    expect(await field.getValue()).toBeNull();
    expect(host().amount()).toBeNull();
  });

  it('types raw characters, and refuses to call a half-typed entry a number', async () => {
    const field = await quantity();
    await field.setValueText('-');

    expect(await field.getValueText()).toBe('-');
    await expect(field.getValue()).rejects.toThrow(/not a number/);
    // A lone minus commits nothing: the field is emptied on the way in, and the
    // control has had nothing parseable from it since.
    expect(host().amount()).toBeNull();
  });

  it('still narrows by value with a mid-typed field on the page', async () => {
    await (await quantity()).setValueText('-');

    // The `value` predicate parses WITHOUT throwing, unlike `getValue()`: one
    // field holding characters that are not a number must not take down a query
    // aimed at a different field — it simply matches no number.
    const byValue = await loader.getAllHarnesses(WrInputNumberHarness.with({ value: 3 }));

    expect(await Promise.all(byValue.map(field => field.getPlaceholder()))).toEqual(['Locked']);
  });

  it('steps with the ▲ and ▼ buttons — which is what pins their order', async () => {
    const field = await quantity();

    await field.increment();
    expect(host().amount()).toBe(6);

    await field.decrement();
    await field.decrement();
    expect(host().amount()).toBe(4);
    expect(await field.getValue()).toBe(4);
  });

  it('steps with the arrow keys', async () => {
    const field = await quantity();

    await field.stepUp();
    expect(host().amount()).toBe(6);

    await field.stepDown();
    expect(host().amount()).toBe(5);
  });

  it('steps by ten with shift held — this control’s page-up', async () => {
    const field = await quantity();

    await field.stepUp({ shift: true });
    expect(host().amount()).toBe(15);

    await field.stepDown({ shift: true });
    expect(host().amount()).toBe(5);
  });

  it('honours a custom step on both paths', async () => {
    host().step.set(0.5);
    fixture.detectChanges();
    const field = await quantity();

    await field.stepUp();
    expect(host().amount()).toBe(5.5);

    await field.increment();
    expect(host().amount()).toBe(6);
  });

  it('clamps at the bounds, and disables the stepper that would cross one', async () => {
    host().min.set(4);
    host().max.set(6);
    fixture.detectChanges();
    const field = await quantity();

    await field.increment();
    expect(host().amount()).toBe(6);
    expect(await field.isIncrementDisabled()).toBe(true);
    expect(await field.isDecrementDisabled()).toBe(false);

    // The disabled ▲ swallows the click rather than throwing — the bound is
    // reported, not inferred from a value that did not move.
    await field.increment();
    expect(host().amount()).toBe(6);

    await field.stepDown({ shift: true });
    expect(host().amount()).toBe(4);
    expect(await field.isDecrementDisabled()).toBe(true);
    expect(await field.isIncrementDisabled()).toBe(false);
  });

  it('shows what was typed while the model already holds the clamped value', async () => {
    host().min.set(0);
    host().max.set(10);
    fixture.detectChanges();
    const field = await quantity();

    await field.setValueText('999');

    // The gap this control is built around. It clamps on every keystroke but
    // leaves the text alone, so a spec reading only the field would believe 999
    // was accepted, and one reading only the model would never notice the field
    // is showing the user a number the control has already refused.
    expect(await field.getValueText()).toBe('999');
    expect(await field.getValue()).toBe(999);
    expect(host().amount()).toBe(10);

    // Blur is what reconciles them — and what marks a bound field touched.
    await field.blur();
    expect(await field.getValueText()).toBe('10');
    expect(await field.getValue()).toBe(10);
    expect(host().touched()).toBe(1);
  });

  it('reads a grouped, fixed-decimal display back as its number', async () => {
    host().decimals.set(2);
    host().amount.set(1234.5);
    fixture.detectChanges();
    const field = await quantity();

    // A thousands separator means the text is NOT the value: `Number('1,234.50')`
    // is NaN, so the harness strips the locale's grouping before parsing.
    expect(await field.getValueText()).toBe('1,234.50');
    expect(await field.getValue()).toBe(1234.5);
  });

  it('rounds a typed value to the field’s precision as it goes', async () => {
    host().decimals.set(1);
    fixture.detectChanges();
    const field = await quantity();

    await field.setValueText('2.46');
    expect(host().amount()).toBe(2.5);

    await field.blur();
    expect(await field.getValueText()).toBe('2.5');
  });

  it('refuses the keyboard and both steppers while readonly', async () => {
    host().readonly.set(true);
    fixture.detectChanges();
    const field = await quantity();

    expect(await field.isReadonly()).toBe(true);
    expect(await field.isIncrementDisabled()).toBe(true);
    expect(await field.isDecrementDisabled()).toBe(true);

    await field.stepUp();
    expect(host().amount()).toBe(5);
    // Typing is deliberately not asserted here: the CDK writes into the element
    // and fires `input` itself, which a readonly field never lets a real user do,
    // so whatever came back would describe jsdom rather than the control.
  });

  it('refuses the keyboard and the steppers while disabled', async () => {
    host().disabled.set(true);
    fixture.detectChanges();
    const field = await quantity();

    expect(await field.isDisabled()).toBe(true);

    await field.stepUp();
    await field.increment();
    expect(host().amount()).toBe(5);
  });

  it('says when a field has no stepper column, and names the input that dropped it', async () => {
    const bare = await loader.getHarness(WrInputNumberHarness.with({ placeholder: 'Bare' }));

    expect(await bare.hasSteppers()).toBe(false);
    await expect(bare.increment()).rejects.toThrow(/showSteppers/);
    await expect(bare.decrement()).rejects.toThrow(/showSteppers/);
    await expect(bare.isIncrementDisabled()).rejects.toThrow(/showSteppers/);
    await expect(bare.isDecrementDisabled()).rejects.toThrow(/showSteppers/);

    // The keyboard still works there, which is what the error tells the caller.
    await bare.stepUp();
    expect(await bare.getValue()).toBe(1);
    expect(await (await quantity()).hasSteppers()).toBe(true);
  });

  it('reads the affixes, and does not mistake the stepper column for a suffix', async () => {
    const field = await quantity();

    expect(await field.getPrefix()).toBe('$');
    expect(await field.getSuffix()).toBe('kg');

    const locked = await loader.getHarness(WrInputNumberHarness.with({ placeholder: 'Locked' }));
    expect(await locked.getPrefix()).toBeNull();
    // Locked has steppers and no suffix — the affix query has to exclude them, or
    // this answers with the buttons' empty text instead of `null`.
    expect(await locked.getSuffix()).toBeNull();
  });

  it('names the field, falling back to the placeholder', async () => {
    const field = await quantity();
    expect(await field.getAriaLabel()).toBe('Quantity');

    host().label.set('Total quantity');
    fixture.detectChanges();
    expect(await field.getAriaLabel()).toBe('Total quantity');
  });

  it('moves focus, and emits touch when it lets go', async () => {
    const field = await quantity();

    await field.focus();
    expect(await field.isFocused()).toBe(true);

    await field.blur();
    expect(await field.isFocused()).toBe(false);
    expect(host().touched()).toBe(1);
  });
});

/**
 * The component formats with Angular's `LOCALE_ID`; a harness cannot reach that
 * injector, so it parses with the test runtime's locale unless told otherwise.
 * These two cases are why the `locale` parameter exists — in a comma-decimal
 * locale, getting it wrong is silent and off by a factor of a thousand.
 */
describe('WrInputNumberHarness in a comma-decimal locale', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const quantity = (): Promise<WrInputNumberHarness> =>
    loader.getHarness(WrInputNumberHarness.with({ placeholder: 'Quantity' }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the field with the locale it was formatted in', async () => {
    fixture.componentInstance.amount.set(1234.5);
    fixture.detectChanges();
    const field = await quantity();

    expect(await field.getValueText()).toBe('1.234,5');
    expect(await field.getValue('de-DE')).toBe(1234.5);
    // Read as en-US the same characters are a different number entirely, and
    // nothing about the result looks wrong.
    expect(await field.getValue('en-US')).toBe(1.2345);
  });

  it('types with the locale’s decimal separator', async () => {
    const field = await quantity();

    await field.setValue(12.5, 'de-DE');
    expect(fixture.componentInstance.amount()).toBe(12.5);

    await field.setValue(12.5, 'en-US');
    // `.` is this locale's THOUSANDS separator, so `String(12.5)` typed verbatim
    // is not twelve and a half — it is a hundred and twenty-five.
    expect(fixture.componentInstance.amount()).toBe(125);
  });
});
