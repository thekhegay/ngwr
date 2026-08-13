import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrDonutChart, type WrDonutSegment } from 'ngwr/donut-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDonutChartHarness } from './wr-donut-chart-harness';

const SEGMENTS: readonly WrDonutSegment[] = [
  { label: 'Direct', value: 30 },
  { label: 'Search', value: 50 },
  { label: 'Social', value: 20 },
];

@Component({
  imports: [WrDonutChart],
  template: `
    <wr-donut-chart
      [segments]="segments()"
      [showLegend]="showLegend()"
      [centerValue]="centerValue()"
      [centerLabel]="centerLabel()"
      [size]="size()"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrDonutSegment[]>(SEGMENTS);
  readonly showLegend = signal(true);
  readonly centerValue = signal('');
  readonly centerLabel = signal('');
  readonly size = signal(200);
}

/**
 * The ring is `aria-hidden` and its slices are paths, so the legend is where the data
 * is readable at all — which is also why the chart's own name is asserted separately:
 * it is what survives `showLegend: false`.
 */
describe('WrDonutChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const chart = (): Promise<WrDonutChartHarness> => loader.getHarness(WrDonutChartHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('draws a wedge per segment and lists them in the legend', async () => {
    const harness = await chart();

    expect(await harness.getSliceCount()).toBe(3);
    expect(await harness.getLegend()).toEqual([
      { label: 'Direct', value: '30' },
      { label: 'Search', value: '50' },
      { label: 'Social', value: '20' },
    ]);
  });

  it('keeps its name when the legend is off, which is all that is left', async () => {
    fixture.componentInstance.showLegend.set(false);
    await fixture.whenStable();

    const harness = await chart();
    expect([await harness.hasLegend(), await harness.getLegend()]).toEqual([false, []]);
    expect(await harness.getAccessibleName()).toBe('Donut chart');
    expect(await harness.getSliceCount()).toBe(3);
  });

  it('reads the centre text only when there is some', async () => {
    const harness = await chart();
    expect([await harness.getCenterValue(), await harness.getCenterLabel()]).toEqual([null, null]);

    fixture.componentInstance.centerValue.set('100');
    fixture.componentInstance.centerLabel.set('total');
    await fixture.whenStable();

    expect([await harness.getCenterValue(), await harness.getCenterLabel()]).toEqual(['100', 'total']);
  });

  it('reads the diameter the component wrote', async () => {
    fixture.componentInstance.size.set(160);
    await fixture.whenStable();

    expect(await (await chart()).getSize()).toBe(160);
  });

  it('draws nothing for an empty dataset', async () => {
    fixture.componentInstance.segments.set([]);
    await fixture.whenStable();

    const harness = await chart();
    expect([await harness.getSliceCount(), await harness.hasLegend()]).toEqual([0, false]);
  });

  it('matches on the name and on a legend label', async () => {
    expect(await loader.getHarnessOrNull(WrDonutChartHarness.with({ sliceLabel: 'Search' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrDonutChartHarness.with({ sliceLabel: 'Email' }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrDonutChartHarness.with({ ariaLabel: /chart/ }))).not.toBeNull();
  });
});
