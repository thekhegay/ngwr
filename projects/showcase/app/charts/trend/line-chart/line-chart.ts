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
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14] },
  ];

  protected readonly visits: readonly WrLineSeries[] = [this.series[0]];

  protected readonly balance: readonly WrLineSeries[] = [{ label: 'Balance', data: [14, 6, -8, -12, 4, 18, 9] }];

  /** Four thousand readings: several times more points than the plot has pixels. */
  protected readonly load: readonly WrLineSeries[] = [
    {
      label: 'Load',
      data: Array.from(
        { length: 4000 },
        (_, i) => 50 + 30 * Math.sin(i / 400) + 12 * Math.sin(i / 23) + ((i * 7919) % 11)
      ),
    },
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
    grid: `<wr-line-chart [series]="series" [xLabels]="labels" [showGrid]="false" />
<wr-line-chart [series]="series" [xLabels]="labels" [showAxis]="false" />`,
    legend: `<wr-line-chart [series]="series" [xLabels]="labels" legendPosition="top" />
<wr-line-chart [series]="series" [xLabels]="labels" legendPosition="end" />
<wr-line-chart [series]="visits" [xLabels]="labels" showLegend />`,
    states: `<wr-line-chart [series]="[]" />
<wr-line-chart [series]="series" loading />
<wr-line-chart [series]="series" error errorLabel="Traffic is unavailable" />`,
    decimate: `<wr-line-chart [series]="load" [showDots]="false" />
<wr-line-chart [series]="load" [showDots]="false" [decimate]="false" />`,
    theme: `.wr-line-chart {
  --wr-line-chart-line-width: 3px;
  --wr-line-chart-dot-size: 8px;
}

/* The tooltip is drawn in an overlay: style it by its own class. */
.wr-line-chart__tooltip {
  --wr-line-chart-tooltip-radius: var(--wr-border-radius-base);
}`,
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
      description:
        'Y values, evenly spaced along the x axis. A non-finite value (`NaN`) is a hole: the line breaks there.',
      type: 'readonly number[]',
      required: true,
      sub: true,
    },
    { name: 'color', description: 'CSS color for the stroke.', type: 'string', default: 'palette', sub: true },
  ];
}
