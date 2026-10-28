import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCalendarHeatmap, type WrHeatmapDatum } from 'ngwr/charts/calendar-heatmap';
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
      [dataTable]="dataTable()"
    />
  `,
})
class Host {
  readonly data = signal<readonly WrHeatmapDatum[]>(DATA);
  readonly endDate = signal<string | Date | null>('2026-01-31');
  readonly weeks = signal(6);
  readonly showLabels = signal(true);
  readonly ariaLabel = signal<string | null>(null);
  readonly dataTable = signal(false);
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

  it('draws the weekday and month labels by default', async () => {
    const harness = await heatmap();

    expect(await harness.hasLabels()).toBe(true);
    // Six weeks to 31 Jan 2026 start on 21 Dec 2025, so January's 1st is the one month
    // that starts inside them — named in `LOCALE_ID`, en-US by default.
    expect(await harness.getMonthLabels()).toEqual(['Jan']);
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

  it('reads the data table, and refuses one that is not rendered', async () => {
    const harness = await heatmap();
    expect(await harness.hasDataTable()).toBe(false);
    await expect(harness.getTableRows()).rejects.toThrow(/renders no data table/);

    fixture.componentInstance.dataTable.set(true);
    await fixture.whenStable();

    expect(await harness.hasDataTable()).toBe(true);
    expect(await harness.getTableColumns()).toHaveLength(7);
    const rows = await harness.getTableRows();
    expect(rows).toHaveLength(6);
    // The week of 4 Jan 2026: Monday the 5th and Tuesday the 6th carry the data.
    expect(rows[2].cells).toEqual(['0', '3', '7', '0', '0', '0', '0']);
    // The last week ends on Saturday the 31st, so every cell is drawn.
    expect(rows[5].cells.every(cell => cell !== '')).toBe(true);
  });

  it('matches on the accessible name', async () => {
    fixture.componentInstance.ariaLabel.set('Commits');
    await fixture.whenStable();

    expect(await loader.getHarnessOrNull(WrCalendarHeatmapHarness.with({ ariaLabel: 'Commits' }))).not.toBeNull();
    expect(await loader.getHarnessOrNull(WrCalendarHeatmapHarness.with({ ariaLabel: 'Builds' }))).toBeNull();
  });
});
