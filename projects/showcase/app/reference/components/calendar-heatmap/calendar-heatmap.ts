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

  protected readonly typeSnippet = `interface WrHeatmapDatum {
  date: string | Date;
  value: number;
}`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'data', description: 'Value per day.', type: 'readonly WrHeatmapDatum[]', default: '[]' },
    {
      name: 'endDate',
      description: 'Last day of the grid. `null` uses today.',
      type: 'string | Date | null',
      default: 'null',
    },
    { name: 'weeks', description: 'Number of week columns. Floored at 4.', type: 'number', default: '53' },
    { name: 'cellSize', description: 'Cell edge in pixels. Floored at 4.', type: 'number', default: '11' },
    { name: 'cellGap', description: 'Gap between cells in pixels.', type: 'number', default: '2' },
    {
      name: 'color',
      description: 'Colour of the most intense cell.',
      type: 'string',
      default: "'var(--wr-color-primary)'",
    },
    {
      name: 'emptyColor',
      description: 'Colour of a day with no data.',
      type: 'string',
      default: "'rgba(var(--wr-color-light-rgb), 0.5)'",
    },
    { name: 'showLabels', description: 'Render month and weekday labels.', type: 'boolean', default: 'true' },
  ];

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
