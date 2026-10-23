import { Component, signal } from '@angular/core';

import { WrLineChart, type WrLineSeries } from 'ngwr/charts/line-chart';

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
  selector: 'ngwr-line-chart-page',
  templateUrl: './line-chart.html',
  imports: [WrLineChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class LineChartPageComponent {
  protected readonly series: readonly WrLineSeries[] = [
    { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14], color: 'var(--wr-color-success)' },
  ];

  protected readonly xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly traffic: readonly WrLineSeries[] = [
    { label: 'Visits', data: [1200, 1480, 1310, 1720, 1950, 1640, 2100] },
    { label: 'Signups', data: [86, 112, 94, 131, 158, 120, 176] },
    { label: 'Errors', data: [24, 18, 31, 15, 12, 20, 9] },
  ];

  protected readonly channels: readonly WrLineSeries[] = [
    { label: 'Organic', data: [420, 480, 450, 530, 610, 580, 660] },
    { label: 'Direct', data: [260, 240, 300, 310, 290, 340, 360] },
    { label: 'Referral', data: [120, 150, 140, 180, 210, 190, 230] },
  ];

  protected readonly hiddenSeries = signal<readonly number[]>([]);

  protected readonly revenue: readonly WrLineSeries[] = [
    { label: 'Revenue', data: [182_000, 240_500, 315_000, 298_250, 412_000, 1_050_000, 1_240_000] },
  ];

  private readonly usdFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  protected readonly usd = (value: number): string => this.usdFormat.format(value);

  protected readonly snippets = {
    basic: `<wr-line-chart [series]="series" [xLabels]="labels" />`,
    area: `<wr-line-chart [series]="series" [xLabels]="labels" showArea />`,
    stacked: `<wr-line-chart [series]="channels" [xLabels]="labels" showArea stacked />`,
    dataTable: `<wr-line-chart [series]="series" [xLabels]="labels" ariaLabel="Weekly traffic" dataTable />`,
    tooltip: `<wr-line-chart [series]="series" [xLabels]="labels" />
<wr-line-chart [series]="series" [xLabels]="labels" [tooltip]="false" />`,
    toggle: `<wr-line-chart
  [series]="series"
  [xLabels]="labels"
  toggleableLegend
  [(hiddenSeries)]="hidden"
/>`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
    format: `<wr-line-chart [series]="revenue" [xLabels]="labels" />
<wr-line-chart [series]="revenue" [xLabels]="labels" [valueFormat]="usd" />`,
    formatTs: `const usdFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

usd = (value: number): string => usdFormat.format(value);`,
  };

  protected readonly typeSnippet = `interface WrLineSeries {
  label: string;
  data: readonly number[];
  color?: string;
}`;

  protected readonly api = API.WrLineChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrLineSeries', description: 'One plotted line.', type: 'interface' },
    { name: 'label', description: 'Legend label.', type: 'string', required: true, sub: true },
    {
      name: 'data',
      description: 'Y values, evenly spaced along the x axis.',
      type: 'readonly number[]',
      required: true,
      sub: true,
    },
    { name: 'color', description: 'CSS color for the stroke.', type: 'string', default: 'palette', sub: true },
  ];
}
