import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrMeterGroup, type WrMeterSegment } from 'ngwr/charts/meter-group';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrMeterGroupHarness } from './wr-meter-group-harness';

const SEGMENTS: readonly WrMeterSegment[] = [
  { label: 'Apps', value: 30 },
  { label: 'Photos', value: 50 },
  { label: 'Free', value: 20 },
];

@Component({
  imports: [WrMeterGroup],
  template: `
    <wr-meter-group
      [segments]="segments()"
      [max]="max()"
      [showLegend]="showLegend()"
      [showValues]="showValues()"
      [toggleableLegend]="toggleable()"
      [(hiddenSegments)]="hidden"
    />
  `,
})
class Host {
  readonly segments = signal<readonly WrMeterSegment[]>(SEGMENTS);
  readonly max = signal(0);
  readonly showLegend = signal(true);
  readonly showValues = signal(true);
  readonly toggleable = signal(false);
  readonly hidden = signal<readonly number[]>([]);
}

/**
 * One `progressbar` for the total, and bands that announce nothing of their own — so
 * "how full" and "how much of each" are two different reads.
 */
describe('WrMeterGroupHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const meter = (): Promise<WrMeterGroupHarness> => loader.getHarness(WrMeterGroupHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('announces the total as one progressbar', async () => {
    const harness = await meter();

    expect(await harness.getRole()).toBe('progressbar');
    expect([await harness.getValue(), await harness.getMax()]).toEqual([100, 100]);
    expect(await harness.getAccessibleName()).toBe('Meter');
  });

  it('splits the bar by share, and titles each band', async () => {
    expect(await (await meter()).getSlices()).toEqual([
      { label: 'Apps', percent: 30 },
      { label: 'Photos', percent: 50 },
      { label: 'Free', percent: 20 },
    ]);
  });

  it('scales against an explicit capacity', async () => {
    fixture.componentInstance.max.set(200);
    await fixture.whenStable();

    const harness = await meter();
    expect([await harness.getValue(), await harness.getMax()]).toEqual([100, 200]);
    expect((await harness.getSlices()).map(slice => slice.percent)).toEqual([15, 25, 10]);
  });

  it('reads the share the component declared, not one the layout resolved', async () => {
    // `getCssValue()` is `getComputedStyle()`, and `width` resolves to the USED value — so
    // the declared `30%` echoes back here and arrives as `180px` on a 600px bar in a real
    // browser, with nothing to say which one you got.
    const harness = await meter();
    const band = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-meter-group__slice')!;
    band.removeAttribute('style');

    // The total falls back to 1 rather than 0, so every band always DECLARES a share —
    // which is what lets the missing case throw instead of reporting a plausible nothing.
    await expect(harness.getSlices()).rejects.toThrow(/band "Apps" carries no inline width percentage/);
  });

  it('lists the bands in the legend, with their values', async () => {
    const harness = await meter();

    expect(await harness.hasLegend()).toBe(true);
    expect(await harness.getLegendLabels()).toEqual(['Apps', 'Photos', 'Free']);
    expect(await harness.getLegendValues()).toEqual(['30', '50', '20']);
  });

  it('drops the legend values, and then the legend', async () => {
    fixture.componentInstance.showValues.set(false);
    await fixture.whenStable();

    const harness = await meter();
    expect(await harness.getLegendValues()).toEqual([]);
    expect(await harness.getLegendLabels()).toHaveLength(3);

    fixture.componentInstance.showLegend.set(false);
    await fixture.whenStable();

    expect([await harness.hasLegend(), await harness.getLegendLabels()]).toEqual([false, []]);
    // The bar keeps its own name and value either way.
    expect(await harness.getValue()).toBe(100);
  });

  it('hands back its legend, and hides a segment through it', async () => {
    fixture.componentInstance.toggleable.set(true);
    await fixture.whenStable();

    const harness = await meter();
    const legend = await harness.getLegendHarness();
    expect(await legend.getLabels()).toEqual(['Apps', 'Photos', 'Free']);

    await legend.toggle(2);

    expect(await legend.getHidden()).toEqual([2]);
    expect(fixture.componentInstance.hidden()).toEqual([2]);
    expect(await harness.getSlices()).toEqual([
      { label: 'Apps', percent: 37.5 },
      { label: 'Photos', percent: 62.5 },
    ]);
    expect([await harness.getValue(), await harness.getMax()]).toEqual([80, 80]);
    expect(await harness.getLegendLabels()).toEqual(['Apps', 'Photos', 'Free']);
  });

  it('refuses to hand back a legend the group does not draw', async () => {
    fixture.componentInstance.showLegend.set(false);
    await fixture.whenStable();

    await expect((await meter()).getLegendHarness()).rejects.toThrow(/draws no legend/);
  });

  it('matches on the name and on a band label', async () => {
    // The catalog's fallback name, since the host binds none.
    expect(await loader.getHarnessOrNull(WrMeterGroupHarness.with({ ariaLabel: 'Meter' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrMeterGroupHarness.with({ ariaLabel: /storage/i }))).toBeNull();
    expect(await loader.getHarnessOrNull(WrMeterGroupHarness.with({ sliceLabel: 'Photos' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrMeterGroupHarness.with({ sliceLabel: 'Music' }))).toBeNull();
  });
});
