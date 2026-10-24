import { Component, signal } from '@angular/core';

import { WrRadarChart, type WrRadarSeries } from 'ngwr/charts/radar-chart';

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
  selector: 'ngwr-radar-chart-page',
  templateUrl: './radar-chart.html',
  imports: [
    WrRadarChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class RadarChartPageComponent {
  protected readonly axes = ['Speed', 'Power', 'Range', 'Comfort', 'Price'];

  protected readonly models: readonly WrRadarSeries[] = [
    { label: 'Model A', data: [80, 65, 70, 90, 55] },
    { label: 'Model B', data: [60, 85, 75, 60, 80] },
  ];

  protected readonly skills = ['Design', 'Frontend', 'Backend', 'Testing', 'Writing', 'Ops'];

  protected readonly ratings: readonly WrRadarSeries[] = [
    { label: 'Ana', data: [5, 4, 2, 3, 4, 1] },
    { label: 'Ben', data: [2, 3, 5, 4, 2, 4] },
  ];

  protected readonly survey: readonly WrRadarSeries[] = [
    { label: '2025', data: [62, 71, 58, 66, 74] },
    { label: '2026', data: [70, 76, null, 72, 79] },
  ];

  protected readonly teams: readonly WrRadarSeries[] = [
    { label: 'North', data: [72, 64, 81, 58, 69] },
    { label: 'South', data: [55, 78, 62, 74, 60] },
    { label: 'East', data: [66, 59, 70, 83, 77] },
  ];

  protected readonly directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  protected readonly wind: readonly WrRadarSeries[] = [
    { label: 'Winter', data: [42, 30, 12, 8, 10, 18, 36, 48] },
    { label: 'Summer', data: [12, 16, 28, 34, 30, 22, 14, 10] },
  ];

  protected readonly hiddenSeries = signal<readonly number[]>([]);

  protected readonly snippets = {
    basic: `<wr-radar-chart
  [axes]="['Speed', 'Power', 'Range', 'Comfort', 'Price']"
  [series]="[
    { label: 'Model A', data: [80, 65, 70, 90, 55] },
    { label: 'Model B', data: [60, 85, 75, 60, 80] }
  ]"
  [max]="100"
/>`,
    scale: `<!-- Fitted: 0 to a readable step above the data -->
<wr-radar-chart [axes]="axes" [series]="models" />

<!-- Fixed: a rating out of 5, one ring per point -->
<wr-radar-chart [axes]="skills" [series]="ratings" [max]="5" />`,
    polar: `<wr-radar-chart variant="polar-area" [axes]="directions" [series]="wind" toggleableLegend />`,
    polarTs: `directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Hours of wind from each direction. A wedge's area, not its radius, is the value.
wind: WrRadarSeries[] = [
  { label: 'Winter', data: [42, 30, 12, 8, 10, 18, 36, 48] },
  { label: 'Summer', data: [12, 16, 28, 34, 30, 22, 14, 10] },
];`,
    gaps: `<wr-radar-chart [axes]="axes" [series]="survey" [max]="100" />`,
    gapsTs: `survey: WrRadarSeries[] = [
  { label: '2025', data: [62, 71, 58, 66, 74] },
  // No Range figure for 2026: the outline breaks there and is not filled.
  { label: '2026', data: [70, 76, null, 72, 79] },
];`,
    toggle: `<wr-radar-chart [axes]="axes" [series]="teams" [max]="100" toggleableLegend [(hiddenSeries)]="hidden" />`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
    dataTable: `<wr-radar-chart [axes]="axes" [series]="models" [max]="100" ariaLabel="Two models compared" dataTable />`,
  };

  protected readonly typeSnippet = `interface WrRadarSeries {
  label: string;
  data: readonly (number | null)[];
  color?: string;
}

type WrRadarVariant = 'polygon' | 'polar-area';`;

  protected readonly api = API.WrRadarChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrRadarSeries', description: 'One polygon.', type: 'interface' },
    { name: 'label', description: 'Legend, tooltip and table name.', type: 'string', required: true, sub: true },
    {
      name: 'data',
      description: 'One value per axis, in the order of `axes`. `null`, a non-finite or an absent value is missing.',
      type: 'readonly (number | null)[]',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'CSS colour for the outline and fill.',
      type: 'string',
      default: 'palette',
      sub: true,
    },
    {
      name: 'WrRadarVariant',
      description: 'How the series are drawn: polygons, or wedges whose area is the value.',
      type: "'polygon' | 'polar-area'",
    },
  ];
}
