import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCheckbox } from 'ngwr/checkbox';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCheckboxHarness } from './wr-checkbox-harness';

@Component({
  imports: [WrCheckbox],
  template: `
    <wr-checkbox [(checked)]="terms">I agree</wr-checkbox>
    <wr-checkbox [indeterminate]="true">Partly</wr-checkbox>
    <wr-checkbox [disabled]="true">Locked</wr-checkbox>
  `,
})
class Host {
  readonly terms = signal(false);
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

    expect(await Promise.all(all.map(c => c.getLabel()))).toEqual(['I agree', 'Partly', 'Locked']);
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
});
