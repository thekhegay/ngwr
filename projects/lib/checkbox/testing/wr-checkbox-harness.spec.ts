import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCheckbox } from 'ngwr/checkbox';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCheckboxHarness } from './wr-checkbox-harness';

@Component({
  imports: [WrCheckbox],
  template: `
    <wr-checkbox [(checked)]="terms" checkboxValue="terms">I agree</wr-checkbox>
    <wr-checkbox [checkboxValue]="composite">Composite</wr-checkbox>
    <wr-checkbox [indeterminate]="true">Partly</wr-checkbox>
    <wr-checkbox [disabled]="true">Locked</wr-checkbox>
  `,
})
class Host {
  readonly terms = signal(false);
  readonly composite = signal({ id: 7 });
}

/** Used exactly as a consumer would: through the loader, with no internals touched. */
describe('WrCheckboxHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every checkbox and reads its label', async () => {
    const all = await loader.getAllHarnesses(WrCheckboxHarness);

    expect(await Promise.all(all.map(c => c.getLabel()))).toEqual(['I agree', 'Composite', 'Partly', 'Locked']);
  });

  it('narrows by label', async () => {
    const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));

    expect(await terms.isChecked()).toBe(false);
  });

  it('ticks and unticks, and writes back to the host', async () => {
    const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));

    await terms.check();
    expect(await terms.isChecked()).toBe(true);
    expect(fixture.componentInstance.terms()).toBe(true);

    await terms.uncheck();
    expect(fixture.componentInstance.terms()).toBe(false);
  });

  it('does nothing when asked to tick a box that is already ticked', async () => {
    const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
    await terms.check();
    await terms.check();

    expect(fixture.componentInstance.terms()).toBe(true);
  });

  it('sees the third state, which lives on a property rather than an attribute', async () => {
    const partly = await loader.getHarness(WrCheckboxHarness.with({ label: 'Partly' }));

    expect(await partly.isIndeterminate()).toBe(true);
    expect(await partly.isChecked()).toBe(false);
  });

  it('reports a disabled box, and narrows by it', async () => {
    const locked = await loader.getHarness(WrCheckboxHarness.with({ label: 'Locked' }));
    expect(await locked.isDisabled()).toBe(true);

    const disabled = await loader.getAllHarnesses(WrCheckboxHarness.with({ disabled: true }));
    expect(await Promise.all(disabled.map(c => c.getLabel()))).toEqual(['Locked']);
  });

  it('narrows by checked state', async () => {
    const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
    await terms.check();

    const ticked = await loader.getAllHarnesses(WrCheckboxHarness.with({ checked: true }));
    expect(await Promise.all(ticked.map(c => c.getLabel()))).toEqual(['I agree']);
  });

  it('moves focus onto the real control', async () => {
    const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
    await terms.focus();

    expect(await terms.isFocused()).toBe(true);
  });
  /**
   * The identity is the one thing a group test is FOR, and this method used to
   * answer `null` for every checkbox whatever it was set to — it read `value`
   * off the inner `<input>`, an attribute nothing writes. A harness method that
   * cannot tell a working component from a broken one is the shape these files
   * are not allowed to have, so this pins both halves: the identity that is
   * readable, and the one that honestly is not.
   */
  it('reads the group identity, and says null for one no attribute can carry', async () => {
    const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
    expect(await terms.getCheckboxValue()).toBe('terms');

    // An object identity has no attribute form. `null` is true; a stringified
    // `[object Object]` would look like data and identify nothing.
    const composite = await loader.getHarness(WrCheckboxHarness.with({ label: 'Composite' }));
    expect(await composite.getCheckboxValue()).toBeNull();

    // And a checkbox that was given no identity at all.
    const locked = await loader.getHarness(WrCheckboxHarness.with({ label: 'Locked' }));
    expect(await locked.getCheckboxValue()).toBeNull();
  });
});
