import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrSwitch } from 'ngwr/switch';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSwitchHarness } from './wr-switch-harness';

@Component({
  imports: [WrSwitch],
  template: `
    <wr-switch [(checked)]="dark">Dark mode</wr-switch>
    <wr-switch [disabled]="true">Beta features</wr-switch>
  `,
})
class Host {
  readonly dark = signal(false);
}

describe('WrSwitchHarness', () => {
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

  it('finds the switches and reads their labels', async () => {
    const all = await loader.getAllHarnesses(WrSwitchHarness);

    expect(await Promise.all(all.map(s => s.getLabel()))).toEqual(['Dark mode', 'Beta features']);
  });

  it('turns on and off, writing back to the host', async () => {
    const dark = await loader.getHarness(WrSwitchHarness.with({ label: 'Dark mode' }));

    await dark.turnOn();
    expect(await dark.isOn()).toBe(true);
    expect(fixture.componentInstance.dark()).toBe(true);

    await dark.turnOff();
    expect(fixture.componentInstance.dark()).toBe(false);
  });

  it('is a switch to a screen reader, not a checkbox', async () => {
    // The role is the whole difference between the two controls, and it is the
    // reason this harness says `isOn` rather than `isChecked`.
    const dark = await loader.getHarness(WrSwitchHarness.with({ label: 'Dark mode' }));

    expect(await dark.getRole()).toBe('switch');
  });

  it('reports a disabled switch, and narrows by it', async () => {
    const beta = await loader.getHarness(WrSwitchHarness.with({ label: 'Beta features' }));
    expect(await beta.isDisabled()).toBe(true);

    const off = await loader.getAllHarnesses(WrSwitchHarness.with({ disabled: true }));
    expect(await Promise.all(off.map(s => s.getLabel()))).toEqual(['Beta features']);
  });

  it('narrows by state', async () => {
    const dark = await loader.getHarness(WrSwitchHarness.with({ label: 'Dark mode' }));
    await dark.turnOn();

    const on = await loader.getAllHarnesses(WrSwitchHarness.with({ on: true }));
    expect(await Promise.all(on.map(s => s.getLabel()))).toEqual(['Dark mode']);
  });
});
