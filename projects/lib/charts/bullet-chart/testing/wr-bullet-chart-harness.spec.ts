import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrBulletChart } from 'ngwr/charts/bullet-chart';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBulletChartHarness } from './wr-bullet-chart-harness';

@Component({
  imports: [WrBulletChart],
  template: `
    <wr-bullet-chart
      [value]="value()"
      [target]="target()"
      [ranges]="ranges()"
      [max]="max()"
      [label]="label()"
      [subLabel]="subLabel()"
      [showScale]="showScale()"
    />
    <wr-bullet-chart label="Profit" [value]="-20" [ranges]="[0, 40]" ariaLabel="Profit is down 20" />
  `,
})
class Host {
  readonly value = signal<number | null>(270);
  readonly target = signal<number | null>(250);
  readonly ranges = signal<readonly number[]>([150, 225, 300]);
  readonly max = signal(0);
  readonly label = signal<string | null>('Revenue');
  readonly subLabel = signal<string | null>('USD, thousands');
  readonly showScale = signal(true);
}

/**
 * The drawing is one named image and the labels beside it are hidden, so what is heard
 * and what is seen are separate answers — and where the marks lie is read as the shares
 * the component wrote, the one geometry jsdom can hold.
 */
describe('WrBulletChartHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const revenue = (): Promise<WrBulletChartHarness> =>
    loader.getHarness(WrBulletChartHarness.with({ label: 'Revenue' }));

  const set = async (change: (host: Host) => void): Promise<void> => {
    change(fixture.componentInstance);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by label and by accessible name', async () => {
    expect(await loader.getAllHarnesses(WrBulletChartHarness)).toHaveLength(2);
    expect(await loader.getAllHarnesses(WrBulletChartHarness.with({ label: /^Rev/ }))).toHaveLength(1);

    const profit = await loader.getHarness(WrBulletChartHarness.with({ ariaLabel: 'Profit is down 20' }));
    expect(await profit.getLabel()).toBe('Profit');
  });

  it('reads the sentence that is heard apart from the labels that are seen', async () => {
    const chart = await revenue();

    expect(await chart.getAccessibleName()).toBe('Revenue: 270 of target 250');
    expect(await chart.getDescription()).toBe('USD, thousands');
    expect([await chart.getLabel(), await chart.getSubLabel()]).toEqual(['Revenue', 'USD, thousands']);
  });

  it('answers null for a label, a sub-label and a description that are not there', async () => {
    await set(host => {
      host.label.set(null);
      host.subLabel.set(null);
    });
    const chart = await loader.getHarness(WrBulletChartHarness.with({ ariaLabel: /^Bullet chart/ }));

    expect([await chart.getLabel(), await chart.getSubLabel(), await chart.getDescription()]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('throws for a description that names nothing, rather than answering null', async () => {
    const chart = await revenue();
    (fixture.nativeElement as HTMLElement).querySelector('.wr-bullet-chart__sub-label')!.removeAttribute('id');

    await expect(chart.getDescription()).rejects.toThrow(/nothing in the chart carries/);
  });

  it('reads where the bar, the marker and the bands lie along the scale', async () => {
    const chart = await revenue();

    expect(await chart.getValueExtent()).toEqual({ start: 0, end: 0.9 });
    expect(await chart.getTargetPosition()).toBeCloseTo(250 / 300, 4);
    expect(await chart.getRanges()).toEqual([
      { start: 0, end: 0.5 },
      { start: 0.5, end: 0.75 },
      { start: 0.75, end: 1 },
    ]);
  });

  it('starts a negative value at itself and ends it at zero', async () => {
    const profit = await loader.getHarness(WrBulletChartHarness.with({ label: 'Profit' }));

    // -20 to 40: zero is a third of the way along.
    const bar = await profit.getValueExtent();
    expect(bar!.start).toBe(0);
    expect(bar!.end).toBeCloseTo(1 / 3, 4);
  });

  it('answers null for a bar and a marker that are not drawn', async () => {
    await set(host => {
      host.value.set(null);
      host.target.set(null);
    });
    const chart = await revenue();

    expect([await chart.getValueExtent(), await chart.getTargetPosition()]).toEqual([null, null]);
    expect(await chart.getAccessibleName()).toBe('Revenue: no value');
  });

  it('drops a band a fixed max leaves no room for', async () => {
    await set(host => {
      host.max.set(200);
      host.value.set(100);
    });

    expect(await (await revenue()).getRanges()).toEqual([
      { start: 0, end: 0.75 },
      { start: 0.75, end: 1 },
    ]);
  });

  it('reads the scale, and an empty one with `showScale` off', async () => {
    const chart = await revenue();
    expect(await chart.hasScale()).toBe(true);
    expect(await chart.getScaleLabels()).toEqual(['0', '100', '200', '300']);

    await set(host => host.showScale.set(false));
    expect(await chart.hasScale()).toBe(false);
    expect(await chart.getScaleLabels()).toEqual([]);
  });

  it('throws for a mark that lost the share it is placed by, rather than answering zero', async () => {
    const chart = await revenue();
    (fixture.nativeElement as HTMLElement).querySelector('.wr-bullet-chart__bar')!.removeAttribute('style');

    await expect(chart.getValueExtent()).rejects.toThrow(/its absence is the bug/);
  });
});
