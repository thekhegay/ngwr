import { Component } from '@angular/core';

import { WrHeatmapChart, type WrHeatmapMatrix } from 'ngwr/charts/heatmap-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-heatmap-chart-page',
  templateUrl: './heatmap-chart.html',
  imports: [
    WrHeatmapChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class HeatmapChartPageComponent {
  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

  /** Visits per slot: busy at lunch and after work on weekdays, flatter at the weekend. */
  protected readonly visits: WrHeatmapMatrix = [
    [12, 28, 46, 31, 27, 44, 19],
    [14, 30, 49, 33, 29, 47, 21],
    [11, 27, 44, 30, 26, 41, 18],
    [15, 32, 52, 35, 31, 50, 24],
    [13, 29, 47, 33, 34, 38, 30],
    [6, 18, 35, 38, 36, 30, 22],
    [4, 14, 29, 33, 31, 24, 15],
  ];

  protected readonly hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

  /** Orders per hour: a lunch peak and a bigger evening one, quieter at the weekend and overnight. */
  protected readonly orders: WrHeatmapMatrix = this.days.map((_, d) =>
    this.hours.map((__, h) =>
      Math.round((2 + 24 * Math.exp(-((h - 12.5) ** 2) / 3) + 38 * Math.exp(-((h - 19) ** 2) / 5)) * (d >= 5 ? 0.7 : 1))
    )
  );

  protected readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  protected readonly teams = ['Billing', 'Shipping', 'Returns', 'Accounts'];

  /** The share of each team's tickets resolved within a day, in percent. */
  protected readonly resolved: WrHeatmapMatrix = [
    [62, 64, 67, 69, 71, 74],
    [48, 51, 55, 58, 63, 66],
    [35, 37, 42, 47, 52, 58],
    [8, 11, 15, 21, 28, 37],
  ];

  protected readonly stores = ['Centre', 'Airport', 'Station'];

  /** Sales per store and day; the airport store is closed on Sunday and the station one on Saturday. */
  protected readonly sales: WrHeatmapMatrix = [
    [42, 38, 45, 51, 63, 71, 34],
    [55, 52, 58, 60, 74, 66, null],
    [31, 35, 33, 36, 40, null, 18],
  ];

  protected readonly percent = (value: number): string => `${value}%`;

  protected readonly snippets = {
    basic: `<wr-heatmap-chart
  [rows]="['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
  [columns]="['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']"
  [data]="visits"
  ariaLabel="Visits by weekday and time"
/>`,
    basicTs: `visits: WrHeatmapMatrix = [
  [12, 28, 46, 31, 27, 44, 19], // Mon
  [14, 30, 49, 33, 29, 47, 21], // Tue
  // …one array per row, one value per column
];`,
    values: `<wr-heatmap-chart
  [rows]="days"
  [columns]="slots"
  [data]="visits"
  ariaLabel="Visits by weekday and time"
  showValues
/>`,
    scale: `<!-- Held at 0 to 100, in four levels -->
<wr-heatmap-chart
  [rows]="teams"
  [columns]="months"
  [data]="resolved"
  [min]="0"
  [max]="100"
  [levels]="4"
  [valueFormat]="percent"
  ariaLabel="Tickets resolved within a day, by team and month"
  showValues
/>`,
    scaleTs: `percent = (value: number) => \`\${value}%\`;`,
    empty: `<wr-heatmap-chart
  [rows]="stores"
  [columns]="days"
  [data]="sales"
  ariaLabel="Sales by store and day"
  noDataLabel="Closed"
  showValues
/>`,
    emptyTs: `sales: WrHeatmapMatrix = [
  [42, 38, 45, 51, 63, 71, 34],
  [55, 52, 58, 60, 74, 66, null], // closed on Sunday
  [31, 35, 33, 36, 40, null, 18], // closed on Saturday
];`,
    hours: `<wr-heatmap-chart [rows]="days" [columns]="hours" [data]="orders" ariaLabel="Orders by weekday and hour" />`,
    hoursTs: `hours = Array.from({ length: 24 }, (_, h) => \`\${String(h).padStart(2, '0')}:00\`);
// 00:00 … 23:00, drawn as every second or third name where they do not fit`,
    color: `<wr-heatmap-chart
  [rows]="stores"
  [columns]="days"
  [data]="sales"
  color="var(--wr-color-success)"
  ariaLabel="Sales by store and day"
  noDataLabel="Closed"
  showValues
/>`,
    dataTable: `<wr-heatmap-chart [rows]="days" [columns]="slots" [data]="visits" ariaLabel="Visits by weekday and time" dataTable />`,
  };

  protected readonly typeSnippet = `type WrHeatmapMatrix = readonly (readonly (number | null)[])[];`;

  protected readonly api = API.WrHeatmapChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    {
      name: 'WrHeatmapMatrix',
      description:
        'The values, rows × columns. A `null`, a value that is not a finite number or one past the end of a shorter row is an empty cell.',
      type: 'readonly (readonly (number | null)[])[]',
    },
  ];
}
