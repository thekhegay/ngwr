import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrBarChart, type WrBarChartDatum } from 'ngwr/bar-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBarChartHarness } from './wr-bar-chart-harness';

const DATA: readonly WrBarChartDatum[] = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 24 },
  { label: 'Wed', value: 6 },
];

@Component({
  imports: [WrBarChart],
  template: '<wr-bar-chart [data]="data()" [showValues]="showValues()" [height]="height()" [max]="max()" />',
})
class Host {
  readonly data = signal<readonly WrBarChartDatum[]>(DATA);
  readonly showValues = signal(true);
  readonly height = signal(200);
  readonly max = signal(0);
}

/**
 * Heights are read as PERCENTAGES of the chart's maximum — the one number that
 * survives a test with no layout, and the component's actual job.
 */
describe('WrBarChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrBarChartHarness> => loader.getHarness(WrBarChartHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('draws a column per datum, scaled against the tallest', async () => {
    const harness = await chart();

    expect(await harness.getBarCount()).toBe(3);
    expect((await harness.getBars()).map(bar => bar.heightPercent)).toEqual([50, 100, 25]);
  });

  it('separates the drawn label from the announced name', async () => {
    const harness = await chart();

    // The label row is `aria-hidden` decoration; the column carries the real name.
    expect(await harness.getLabels()).toEqual(['Mon', 'Tue', 'Wed']);
    expect(await harness.getAccessibleNames()).toEqual(['Mon: 12', 'Tue: 24', 'Wed: 6']);
  });

  it('prints the values above the bars, and drops them when told to', async () => {
    const harness = await chart();
    expect([await harness.hasValues(), (await harness.getBars())[0].value]).toEqual([true, '12']);

    fixture.componentInstance.showValues.set(false);
    await fixture.whenStable();

    expect([await harness.hasValues(), (await harness.getBars())[0].value]).toEqual([false, null]);
  });

  it('scales against an explicit maximum when one is given', async () => {
    fixture.componentInstance.max.set(48);
    await fixture.whenStable();

    expect((await (await chart()).getBars()).map(bar => bar.heightPercent)).toEqual([25, 50, 12.5]);
  });

  it('reads the share the component declared, not one the layout resolved', async () => {
    // `getCssValue()` is `getComputedStyle()`, which echoes the declared `50%` in jsdom and
    // resolves it to used pixels in a real browser — so the same call answered `[50, 100, 25]`
    // here and `[100, 200, 50]` under a browser runner, with nothing to say which you got.

    // An empty bar still DECLARES `height: 0%`, so 0 is a reading rather than an absence —
    // which is what lets the missing case throw instead of reporting a plausible nothing.
    fixture.componentInstance.data.set([
      { label: 'Mon', value: 0 },
      { label: 'Tue', value: 24 },
    ]);
    await fixture.whenStable();
    expect((await (await chart()).getBars()).map(bar => bar.heightPercent)).toEqual([0, 100]);

    // Take the declaration away and the two reads part company: the attribute read has
    // nothing to report and says so, where the computed read quietly returned `NaN`.
    const harness = await chart();
    const bar = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-bar-chart__bar')!;
    bar.removeAttribute('style');

    await expect(harness.getBars()).rejects.toThrow(/no inline height percentage/);
  });

  it('reads the plot height the component wrote', async () => {
    fixture.componentInstance.height.set(320);
    await fixture.whenStable();

    expect(await (await chart()).getPlotHeight()).toBe(320);
  });

  it('draws nothing for an empty dataset', async () => {
    fixture.componentInstance.data.set([]);
    await fixture.whenStable();

    const harness = await chart();
    expect([await harness.getBarCount(), await harness.getLabels()]).toEqual([0, []]);
  });

  it('matches on a bar label', async () => {
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ barLabel: 'Tue' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrBarChartHarness.with({ barLabel: 'Sun' }))).toBeNull();
  });
});
