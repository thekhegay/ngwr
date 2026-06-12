import { Component } from '@angular/core';

import { WrCalendarHeatmap, type WrHeatmapDatum } from 'ngwr/calendar-heatmap';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

function makeHeatmap(): readonly WrHeatmapDatum[] {
  const out: WrHeatmapDatum[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.3) out.push({ date: d, value: Math.round(Math.random() * 8) });
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
  protected readonly data = makeHeatmap();

  protected readonly snippets = {
    install: `import { WrCalendarHeatmap, type WrHeatmapDatum } from 'ngwr/calendar-heatmap';

@Component({ imports: [WrCalendarHeatmap] })
export class MyComponent {
  // Each cell: { date, value }. Higher value → darker shade.
  protected readonly contributions: WrHeatmapDatum[] = [
    { date: new Date('2026-01-15'), value: 3 },
    { date: new Date('2026-02-04'), value: 8 },
    { date: new Date('2026-03-22'), value: 5 },
    // ... one entry per active day
  ];
}`,
    basic: `<wr-calendar-heatmap [data]="contributions" />`,
  };

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
      description: 'Magnitude — bucketed into intensity steps.',
      type: 'number',
      required: true,
      sub: true,
    },
  ];
}
