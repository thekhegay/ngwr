import { Component } from '@angular/core';

import { WrCalendarHeatmap, type WrHeatmapDatum } from 'ngwr/charts/calendar-heatmap';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

/** The last day the demos draw: a fixed date, so every build draws the same year. */
const END_DATE = '2026-09-30';

/**
 * A year of days up to `END_DATE`, about seven in ten of them with a count, as ISO date
 * strings. Seeded rather than `Math.random()` and anchored to a fixed day rather than
 * `new Date()`: the prerendered grid and the one that hydrates it are then the same year
 * with the same shades, and the nightly browser sweeps meet the same page every night.
 */
function makeHeatmap(seed: number): readonly WrHeatmapDatum[] {
  // The Park–Miller generator: whole numbers below 2³¹, every product exact in a double.
  let state = seed;
  const random = (): number => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  const end = Date.parse(`${END_DATE}T00:00:00Z`);
  const out: WrHeatmapDatum[] = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    if (random() > 0.3) out.push({ date, value: Math.round(random() * 8) });
  }
  return out;
}

@Component({
  selector: 'ngwr-calendar-heatmap-page',
  templateUrl: './calendar-heatmap.html',
  imports: [
    WrCalendarHeatmap,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CalendarHeatmapPageComponent {
  protected readonly data = makeHeatmap(20_260_930);

  protected readonly endDate = END_DATE;

  protected readonly snippets = {
    basic: `<wr-calendar-heatmap [data]="contributions" endDate="2026-09-30" ariaLabel="Commits in the year to 30 September" />`,
    basicTs: `contributions: WrHeatmapDatum[] = [
  { date: '2025-10-01', value: 3 },
  { date: '2025-10-02', value: 7 },
  // …one entry per day; a day with no entry is drawn as zero
];`,
    tooltip: `<wr-calendar-heatmap [data]="contributions" [tooltip]="false" />`,
    dataTable: `<wr-calendar-heatmap [data]="contributions" ariaLabel="Commits in the year to 30 September" dataTable />`,
  };

  protected readonly typeSnippet = `interface WrHeatmapDatum {
  date: string | Date;
  value: number;
}`;

  protected readonly api = API.WrCalendarHeatmap;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrHeatmapDatum', description: 'One contribution cell.', type: 'interface' },
    {
      name: 'date',
      description: 'ISO date string (YYYY-MM-DD) or Date.',
      type: 'string | Date',
      required: true,
      sub: true,
    },
    {
      name: 'value',
      description: 'Count for the day, shown as a shade.',
      type: 'number',
      required: true,
      sub: true,
    },
  ];
}
