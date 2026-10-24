import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrWaterfallChart, type WrWaterfallStep } from 'ngwr/charts/waterfall-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrWaterfallChartHarness } from './wr-waterfall-chart-harness';

const MINUS = '−';

/** Running totals 400 / 700 / 600 / 600 on an axis from 0 to 800. */
const STEPS: readonly WrWaterfallStep[] = [
  { label: 'Opening', value: 400, total: true },
  { label: 'Sales', value: 300 },
  { label: 'Refunds', value: -100 },
  { label: 'Closing', value: 600, total: true },
];

@Component({
  imports: [WrWaterfallChart],
  template: `
    <wr-waterfall-chart
      ariaLabel="Bridge"
      [steps]="steps()"
      [showValues]="showValues()"
      [showGrid]="showGrid()"
      [showConnectors]="showConnectors()"
      [dataTable]="dataTable()"
    />
    <wr-waterfall-chart ariaLabel="Other" [steps]="[{ label: 'Only', value: 5 }]" />
  `,
})
class Host {
  readonly steps = signal<readonly WrWaterfallStep[]>(STEPS);
  readonly showValues = signal(true);
  readonly showGrid = signal(true);
  readonly showConnectors = signal(true);
  readonly dataTable = signal(false);
}

describe('WrWaterfallChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let chart: WrWaterfallChartHarness;

  const set = (change: (h: Host) => void): void => {
    change(fixture.componentInstance);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    chart = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      WrWaterfallChartHarness.with({ ariaLabel: 'Bridge' })
    );
  });

  afterEach(() => fixture.destroy());

  it('filters by name and by step', async () => {
    const loader = TestbedHarnessEnvironment.loader(fixture);
    expect(await loader.getAllHarnesses(WrWaterfallChartHarness)).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrWaterfallChartHarness.with({ stepLabel: 'Refunds' }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrWaterfallChartHarness.with({ stepLabel: /^On/ }))).toHaveLength(1);
    expect(await loader.getAllHarnesses(WrWaterfallChartHarness.with({ ariaLabel: /^Oth/ }))).toHaveLength(1);
  });

  it('reads the name, the labels and the count', async () => {
    expect(await chart.getAccessibleName()).toBe('Bridge');
    expect(await chart.getLabels()).toEqual(['Opening', 'Sales', 'Refunds', 'Closing']);
    expect(await chart.getStepCount()).toBe(4);
  });

  it('reads each step off its own column: its kind, what it prints and announces, its totals and its bar', async () => {
    expect(await chart.getSteps()).toEqual([
      {
        label: 'Opening',
        kind: 'total',
        name: 'Opening: total 400',
        value: '400',
        start: 0,
        end: 400,
        bottomPercent: 0,
        topPercent: 50,
        connected: true,
      },
      {
        label: 'Sales',
        kind: 'increase',
        name: 'Sales: +300, running total 700',
        value: '+300',
        start: 400,
        end: 700,
        bottomPercent: 50,
        topPercent: 87.5,
        connected: true,
      },
      {
        label: 'Refunds',
        kind: 'decrease',
        name: `Refunds: ${MINUS}100, running total 600`,
        value: `${MINUS}100`,
        start: 700,
        end: 600,
        bottomPercent: 75,
        topPercent: 87.5,
        connected: true,
      },
      {
        label: 'Closing',
        kind: 'total',
        name: 'Closing: total 600',
        value: '600',
        start: 600,
        end: 600,
        bottomPercent: 0,
        topPercent: 75,
        connected: false,
      },
    ]);
  });

  it('reads a change of zero as flat, not as an increase', async () => {
    set(h =>
      h.steps.set([
        { label: 'Up', value: 100 },
        { label: 'Same', value: 0 },
        { label: 'Lost', value: Number.NaN },
      ])
    );
    const steps = await chart.getSteps();
    expect(steps.map(step => step.kind)).toEqual(['increase', 'flat', 'flat']);
    expect(steps[1]).toMatchObject({ value: '0', name: 'Same: 0, running total 100', start: 100, end: 100 });
  });

  it('answers `null` for the figure with `showValues` off, and keeps the name', async () => {
    expect(await chart.hasValues()).toBe(true);
    set(h => h.showValues.set(false));
    expect(await chart.hasValues()).toBe(false);
    const [, sales] = await chart.getSteps();
    expect(sales.value).toBeNull();
    expect(sales.name).toBe('Sales: +300, running total 700');
  });

  it('counts the connectors, and none with `showConnectors` off', async () => {
    expect(await chart.getConnectorCount()).toBe(3);
    set(h => h.showConnectors.set(false));
    expect(await chart.getConnectorCount()).toBe(0);
    expect((await chart.getSteps()).every(step => !step.connected)).toBe(true);
  });

  it('reads the ticks and the zero line, and no ticks with `showGrid` off', async () => {
    expect(await chart.hasGrid()).toBe(true);
    expect(await chart.getYTicks()).toEqual(['800', '600', '400', '200', '0']);
    expect(await chart.getZeroPercent()).toBe(0);

    set(h =>
      h.steps.set([
        { label: 'Up', value: 100 },
        { label: 'Down', value: -300 },
      ])
    );
    expect(await chart.getZeroPercent()).toBe(50);

    set(h => h.showGrid.set(false));
    expect(await chart.hasGrid()).toBe(false);
    expect(await chart.getYTicks()).toEqual([]);
  });

  it('reads the plot height off the style the component wrote', async () => {
    expect(await chart.getPlotHeight()).toBe(240);
  });

  it('refuses to read a table that is not rendered, then reads it', async () => {
    expect(await chart.hasDataTable()).toBe(false);
    await expect(chart.getTableRows()).rejects.toThrow(/`dataTable` is off/);
    await expect(chart.getTableColumns()).rejects.toThrow(/`dataTable` is off/);

    set(h => h.dataTable.set(true));
    expect(await chart.getTableColumns()).toEqual(['Change', 'Running total']);
    expect(await chart.getTableRows()).toEqual([
      { header: 'Opening', cells: ['', '400'] },
      { header: 'Sales', cells: ['+300', '700'] },
      { header: 'Refunds', cells: [`${MINUS}100`, '600'] },
      { header: 'Closing', cells: ['', '600'] },
    ]);
  });

  it('throws rather than reporting a bar on the frame when a step lost its ends', async () => {
    const step = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-waterfall-chart__step')!;
    step.style.removeProperty('--wr-waterfall-chart-lo');
    await expect(chart.getSteps()).rejects.toThrow(/carries no inline bar ends/);
  });

  it('throws rather than guessing when a step lost its kind', async () => {
    const step = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-waterfall-chart__step')!;
    step.classList.remove('wr-waterfall-chart__step--total');
    await expect(chart.getSteps()).rejects.toThrow(/carries no kind modifier/);
  });
});
