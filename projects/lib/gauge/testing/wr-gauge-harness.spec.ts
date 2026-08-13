import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrGauge } from 'ngwr/gauge';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrGaugeHarness } from './wr-gauge-harness';

@Component({
  imports: [WrGauge],
  template: `
    <wr-gauge [value]="value()" [max]="max()" [suffix]="suffix()" [showValue]="showValue()" [size]="size()" />
  `,
})
class Host {
  readonly value = signal(72);
  readonly max = signal(100);
  readonly suffix = signal('%');
  readonly showValue = signal(true);
  readonly size = signal(160);
}

/**
 * The arc is `aria-hidden` and the printed number is optional, so the ARIA trio plus
 * `aria-valuetext` is the whole readable surface — which is exactly why a gauge with
 * `showValue` off is still a meter and not a decoration.
 */
describe('WrGaugeHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const gauge = (): Promise<WrGaugeHarness> => loader.getHarness(WrGaugeHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('announces itself as a meter with a range and a value', async () => {
    const harness = await gauge();

    expect(await harness.getRole()).toBe('meter');
    expect([await harness.getMin(), await harness.getValue(), await harness.getMax()]).toEqual([0, 72, 100]);
    expect(await harness.getAccessibleName()).toBe('Gauge');
  });

  it('speaks the value with its suffix, and prints the same', async () => {
    const harness = await gauge();

    expect(await harness.getValueText()).toBe('72%');
    expect([await harness.getDisplayValue(), await harness.getSuffix()]).toEqual(['72%', '%']);
  });

  it('stays readable with nothing printed', async () => {
    fixture.componentInstance.showValue.set(false);
    await fixture.whenStable();

    const harness = await gauge();
    expect([await harness.getDisplayValue(), await harness.getSuffix()]).toEqual([null, null]);
    // The point of the meter role: the value is still announced.
    expect([await harness.getValue(), await harness.getValueText()]).toEqual([72, '72%']);
  });

  it('clamps the announced value to its own range', async () => {
    fixture.componentInstance.value.set(140);
    await fixture.whenStable();

    expect(await (await gauge()).getValue()).toBe(100);
  });

  it('reads the size the component wrote', async () => {
    fixture.componentInstance.size.set(240);
    await fixture.whenStable();

    expect(await (await gauge()).getSize()).toBe(240);
  });

  it('matches on the name and the value', async () => {
    expect(await loader.getHarnessOrNull(WrGaugeHarness.with({ value: 72 }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrGaugeHarness.with({ value: 30 }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrGaugeHarness.with({ ariaLabel: /Gauge/ }))).not.toBeNull();
  });
});
