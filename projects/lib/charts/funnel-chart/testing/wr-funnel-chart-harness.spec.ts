import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type WrFunnelConversion, WrFunnelChart, type WrFunnelStage } from 'ngwr/charts/funnel-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFunnelChartHarness } from './wr-funnel-chart-harness';

const STAGES: readonly WrFunnelStage[] = [
  { label: 'Visited', value: 1000 },
  { label: 'Signed up', value: 400 },
  { label: 'Lost', value: Number.NaN },
  { label: 'Paid', value: 60 },
];

@Component({
  imports: [WrFunnelChart],
  template: `
    <wr-funnel-chart
      ariaLabel="Sign-ups"
      [stages]="stages()"
      [conversion]="conversion()"
      [showValues]="showValues()"
      [dataTable]="dataTable()"
    />
    <wr-funnel-chart ariaLabel="Other" [stages]="[{ label: 'Opened', value: 5 }]" />
  `,
})
class Host {
  readonly stages = signal<readonly WrFunnelStage[]>(STAGES);
  readonly conversion = signal<WrFunnelConversion>('both');
  readonly showValues = signal(true);
  readonly dataTable = signal(false);
}

describe('WrFunnelChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let chart: WrFunnelChartHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    chart = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrFunnelChartHarness.with({ ariaLabel: 'Sign-ups' })
    );
  });

  afterEach(() => fixture.destroy());

  it('filters by name and by stage', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(WrFunnelChartHarness)).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrFunnelChartHarness.with({ stageLabel: 'Paid' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrFunnelChartHarness.with({ stageLabel: /^Open/ }))).toHaveLength(1);
  });

  it('reads the name and the labels', async () => {
    expect(await chart.getAccessibleName()).toBe('Sign-ups');
    expect(await chart.getLabels()).toEqual(['Visited', 'Signed up', 'Lost', 'Paid']);
    expect(await chart.getStageCount()).toBe(4);
  });

  it('reads each stage off its own row: what it prints, what it announces, how wide it is', async () => {
    expect(await chart.getStages()).toEqual([
      { label: 'Visited', value: '1,000', fromFirst: null, name: 'Visited: 1,000', widthPercent: 100 },
      {
        label: 'Signed up',
        value: '400',
        fromFirst: '40% of first',
        name: 'Signed up: 400, 40% of previous, 40% of first',
        widthPercent: 40,
      },
      // A missing stage draws no bar and prints no figure, and lines up all the same.
      { label: 'Lost', value: null, fromFirst: null, name: 'Lost', widthPercent: null },
      { label: 'Paid', value: '60', fromFirst: '6% of first', name: 'Paid: 60, 6% of first', widthPercent: 6 },
    ]);
  });

  it('reads the shares between the bars, and the bands a missing stage breaks', async () => {
    expect(await chart.getGapLabels()).toEqual(['40%', null, null]);
    expect(await chart.getBandCount()).toBe(1);

    fixture.componentInstance.stages.set(STAGES.filter(stage => stage.label !== 'Lost'));
    expect(await chart.getGapLabels()).toEqual(['40%', '15%']);
    expect(await chart.getBandCount()).toBe(2);
  });

  it('follows `conversion` and `showValues` on the drawing, and keeps the names whole', async () => {
    // Printed by default, so the answer below is the input's doing, not a harness that
    // always says no.
    expect(await chart.hasValues()).toBe(true);
    fixture.componentInstance.conversion.set('none');
    fixture.componentInstance.showValues.set(false);
    const [, signedUp] = await chart.getStages();
    expect(await chart.getGapLabels()).toEqual([null, null, null]);
    expect(signedUp.value).toBeNull();
    expect(signedUp.fromFirst).toBeNull();
    expect(signedUp.name).toBe('Signed up: 400, 40% of previous, 40% of first');
    expect(await chart.hasValues()).toBe(false);
  });

  it('reads the data table, and refuses to read one that is not rendered', async () => {
    expect(await chart.hasDataTable()).toBe(false);
    await expect(chart.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(chart.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    fixture.componentInstance.dataTable.set(true);
    expect(await chart.hasDataTable()).toBe(true);
    expect(await chart.getTableColumns()).toEqual(['Value', 'From previous', 'From first']);
    expect(await chart.getTableRows()).toEqual([
      { header: 'Visited', cells: ['1,000', '', ''] },
      { header: 'Signed up', cells: ['400', '40%', '40%'] },
      { header: 'Lost', cells: ['', '', ''] },
      { header: 'Paid', cells: ['60', '', '6%'] },
    ]);
  });
});
