import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCalendarHeatmap, type WrHeatmapDatum } from 'ngwr/calendar-heatmap';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCalendarHeatmapHarness } from './wr-calendar-heatmap-harness';

const DATA: readonly WrHeatmapDatum[] = [
  { date: '2026-01-05', value: 3 },
  { date: '2026-01-06', value: 7 },
];

@Component({
  imports: [WrCalendarHeatmap],
  template: `
    <wr-calendar-heatmap
      [data]="data()"
      [endDate]="endDate()"
      [weeks]="weeks()"
      [showLabels]="showLabels()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrHeatmapDatum[]>(DATA);
  readonly endDate = signal<string | Date | null>('2026-01-31');
  readonly weeks = signal(6);
  readonly showLabels = signal(true);
  readonly ariaLabel = signal<string | null>(null);
}

/**
 * Every square is `aria-hidden` and the grid is one named image — a year of
 * individually announced days would be unusable — so a square's `title` is the only
 * text a spec can read, and the harness parses it.
 */
describe('WrCalendarHeatmapHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const heatmap = (): Promise<WrCalendarHeatmapHarness> => loader.getHarness(WrCalendarHeatmapHarness);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('is one named image rather than a few hundred anonymous nodes', async () => {
    const harness = await heatmap();

    expect(await harness.getRole()).toBe('img');
    expect(await harness.getAccessibleName()).toBe('Calendar heatmap');
  });

  it('draws a square per day of the window it was given', async () => {
    // Six weeks of seven days, ending on the given date.
    expect(await (await heatmap()).getCellCount()).toBe(42);
  });

  it('reads a day from the only text a square carries', async () => {
    const harness = await heatmap();

    expect(await harness.getValueFor('2026-01-06')).toBe('7');
    expect(await harness.getValueFor('2026-01-07')).toBe('0');
    expect(await harness.getValueFor('2019-01-01')).toBeNull();
  });

  it('places each square by week and weekday', async () => {
    const cells = await (await heatmap()).getCells();
    const marked = cells.find(cell => cell.iso === '2026-01-05');

    expect(marked).toBeDefined();
    expect(marked!.week).toBeGreaterThan(0);
    expect(marked!.day).toBeGreaterThan(0);
  });

  it('leaves four weekday labels blank, which is the layout and not a bug', async () => {
    const labels = await (await heatmap()).getWeekdayLabels();

    expect(labels).toHaveLength(7);
    expect(labels.filter(label => label === '')).toHaveLength(4);
  });

  it('drops both label rows when told to', async () => {
    fixture.componentInstance.showLabels.set(false);
    await fixture.whenStable();

    const harness = await heatmap();
    expect([await harness.hasLabels(), await harness.getWeekdayLabels(), await harness.getMonthLabels()]).toEqual([
      false,
      [],
      [],
    ]);
  });

  it('matches on the accessible name', async () => {
    fixture.componentInstance.ariaLabel.set('Commits');
    await fixture.whenStable();

    expect(await loader.getHarnessOrNull(WrCalendarHeatmapHarness.with({ ariaLabel: 'Commits' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrCalendarHeatmapHarness.with({ ariaLabel: 'Builds' }))).toBeNull();
  });
});
