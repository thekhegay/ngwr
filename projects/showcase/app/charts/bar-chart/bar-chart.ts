import { Component, signal } from '@angular/core';

import { WrBarChart, type WrBarChartDatum, type WrBarChartLine, type WrBarSeries } from 'ngwr/charts/bar-chart';

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
  selector: 'ngwr-bar-chart-page',
  templateUrl: './bar-chart.html',
  imports: [WrBarChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class BarChartPageComponent {
  protected readonly bars: readonly WrBarChartDatum[] = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
    { label: 'Wed', value: 9 },
    { label: 'Thu', value: 24, color: 'var(--wr-color-warning)' },
    { label: 'Fri', value: 17 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 11 },
  ];

  protected readonly quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  protected readonly regions: readonly WrBarSeries[] = [
    { label: 'North', data: [12, 18, 9, 22] },
    { label: 'South', data: [8, 11, 14, 10] },
    { label: 'West', data: [5, 7, 11, 13] },
  ];

  protected readonly balance: readonly WrBarSeries[] = [
    { label: 'Sales', data: [14, 18, 12, 20] },
    { label: 'Services', data: [6, 5, 8, 7] },
    { label: 'Refunds', data: [-3, -2, -6, -4] },
  ];

  protected readonly week: readonly WrBarChartDatum[] = this.bars.map(({ label, value }) => ({ label, value }));

  protected readonly target: readonly WrBarChartLine[] = [{ label: 'Target', data: [30, 34, 36, 42] }];

  protected readonly lastWeek: readonly WrBarChartLine[] = [{ label: 'Last week', data: [10, 15, 12, 20, 19, 8, 9] }];

  protected readonly browsers: readonly WrBarChartDatum[] = [
    { label: 'Chrome', value: 64 },
    { label: 'Safari', value: 19 },
    { label: 'Edge', value: 5 },
    { label: 'Firefox', value: 3 },
    { label: 'Samsung Internet', value: 2 },
  ];

  protected readonly hiddenSeries = signal<readonly number[]>([]);

  protected readonly snippets = {
    basic: `<wr-bar-chart [data]="bars" />`,
    grouped: `<wr-bar-chart
  [categories]="['Q1', 'Q2', 'Q3', 'Q4']"
  [series]="[
    { label: 'North', data: [12, 18, 9, 22] },
    { label: 'South', data: [8, 11, 14, 10] },
    { label: 'West', data: [5, 7, 11, 13] }
  ]"
/>`,
    stacked: `<wr-bar-chart [categories]="quarters" [series]="balance" stacked />`,
    stackedTs: `balance: WrBarSeries[] = [
  { label: 'Sales', data: [14, 18, 12, 20] },
  { label: 'Services', data: [6, 5, 8, 7] },
  // Negative values stack down from zero.
  { label: 'Refunds', data: [-3, -2, -6, -4] },
];`,
    horizontal: `<wr-bar-chart [data]="browsers" orientation="horizontal" [height]="180" />
<wr-bar-chart [categories]="quarters" [series]="regions" orientation="horizontal" [height]="240" />`,
    combo: `<wr-bar-chart [categories]="quarters" [series]="regions" [lines]="target" stacked />
<wr-bar-chart [data]="bars" [lines]="lastWeek" />`,
    comboTs: `target: WrBarChartLine[] = [{ label: 'Target', data: [30, 34, 36, 42] }];
lastWeek: WrBarChartLine[] = [{ label: 'Last week', data: [10, 15, 12, 20, 19, 8, 9] }];`,
    toggle: `<wr-bar-chart [categories]="quarters" [series]="regions" toggleableLegend [(hiddenSeries)]="hidden" />`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
    dataTable: `<wr-bar-chart [categories]="quarters" [series]="regions" ariaLabel="Sales by region" dataTable />`,
    tooltip: `<wr-bar-chart [data]="bars" />
<wr-bar-chart [data]="bars" [tooltip]="false" />`,
  };

  protected readonly typeSnippet = `interface WrBarChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface WrBarSeries {
  label: string;
  data: readonly (number | null)[];
  color?: string;
}

interface WrBarChartLine {
  label: string;
  data: readonly (number | null)[];
  color?: string;
}

type WrBarChartOrientation = 'vertical' | 'horizontal';`;

  protected readonly api = API.WrBarChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrBarChartDatum', description: 'One bar of data.', type: 'interface' },
    { name: 'label', description: 'Category label under the bar.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Bar magnitude.', type: 'number', required: true, sub: true },
    {
      // NOT a palette — that is the donut and the line chart, which rotate
      // through a fallback list per series. A bar chart is one series, so an
      // uncoloured bar takes the chart's own `color` input and every bar comes
      // out the same. Saying `palette` here promised five different bars.
      name: 'color',
      description: "CSS colour for this bar. Unset, it takes the chart's `color`.",
      type: 'string',
      default: 'the chart’s `color`',
      sub: true,
    },
    { name: 'WrBarSeries', description: 'One series of `series`.', type: 'interface' },
    {
      name: 'label',
      description: 'Legend, tooltip, bar name and table heading.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'data',
      description: 'One value per category. `null` or a non-finite value is missing.',
      type: 'readonly (number | null)[]',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'CSS colour for the bars, their outline and the legend key.',
      type: 'string',
      default: 'palette',
      sub: true,
    },
    { name: 'WrBarChartLine', description: 'One line of `lines`.', type: 'interface' },
    {
      name: 'label',
      description: 'Legend, tooltip, group name and table heading.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'data',
      description: 'One value per category. `null` or a non-finite value breaks the line.',
      type: 'readonly (number | null)[]',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'CSS colour for the line, its points and the legend key.',
      type: 'string',
      default: 'palette',
      sub: true,
    },
    {
      name: 'WrBarChartOrientation',
      description: 'Which way the bars run.',
      type: "'vertical' | 'horizontal'",
    },
  ];
}
