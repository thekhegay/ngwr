import { Component } from '@angular/core';

import { WrWaterfallChart, type WrWaterfallStep } from 'ngwr/charts/waterfall-chart';

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
  selector: 'ngwr-waterfall-chart-page',
  templateUrl: './waterfall-chart.html',
  imports: [
    WrWaterfallChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WaterfallChartPageComponent {
  /** 4,200 to 5,000: every change adds up to the closing total. */
  protected readonly bridge: readonly WrWaterfallStep[] = [
    { label: 'Opening', value: 4200, total: true },
    { label: 'Sales', value: 1800 },
    { label: 'Services', value: 650 },
    { label: 'Refunds', value: -350 },
    { label: 'Payroll', value: -900 },
    { label: 'Rent', value: -400 },
    { label: 'Closing', value: 5000, total: true },
  ];

  /** Two subtotals: a quarter, then a half year. */
  protected readonly months: readonly WrWaterfallStep[] = [
    { label: 'Start', value: 1200, total: true },
    { label: 'Jan', value: 300 },
    { label: 'Feb', value: -150 },
    { label: 'Mar', value: 420 },
    { label: 'Q1', value: 1770, total: true },
    { label: 'Apr', value: -80 },
    { label: 'May', value: 260 },
    { label: 'Jun', value: 190 },
    { label: 'H1', value: 2140, total: true },
  ];

  /** A cash flow that dips below zero and climbs back. */
  protected readonly cash: readonly WrWaterfallStep[] = [
    { label: 'Opening', value: 300, total: true },
    { label: 'Equipment', value: -900 },
    { label: 'Operations', value: 450 },
    { label: 'Loan', value: 200 },
    { label: 'Closing', value: 50, total: true },
  ];

  private readonly usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  /** Dollars, whole. The chart writes the sign in front of every figure. */
  protected readonly format = (value: number): string => this.usd.format(value);

  protected readonly snippets = {
    basic: `<wr-waterfall-chart
  ariaLabel="Profit bridge"
  [steps]="[
    { label: 'Opening', value: 4200, total: true },
    { label: 'Sales', value: 1800 },
    { label: 'Refunds', value: -350 },
    { label: 'Payroll', value: -900 },
    { label: 'Closing', value: 4750, total: true }
  ]"
/>`,
    totals: `<wr-waterfall-chart [steps]="months" />`,
    totalsTs: `months: WrWaterfallStep[] = [
  { label: 'Start', value: 1200, total: true }, // opens the chart
  { label: 'Jan', value: 300 },
  { label: 'Feb', value: -150 },
  { label: 'Mar', value: 420 },
  { label: 'Q1', value: 1770, total: true }, // checked: 1200 + 300 − 150 + 420
  { label: 'Apr', value: -80 },
  { label: 'May', value: 260 },
  { label: 'Jun', value: 190 },
  { label: 'H1', value: 2140, total: true },
];`,
    negative: `<wr-waterfall-chart [steps]="cash" />`,
    colors: `<wr-waterfall-chart totalColor="var(--wr-color-on-surface-muted)" [steps]="bridge" />`,
    format: `<wr-waterfall-chart [steps]="bridge" [valueFormat]="format" />`,
    formatTs: `const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Every figure arrives as its magnitude; the chart writes + or − in front.
format = (value: number): string => usd.format(value);`,
    quiet: `<wr-waterfall-chart [steps]="bridge" [showValues]="false" [showGrid]="false" />`,
    table: `<wr-waterfall-chart ariaLabel="Profit bridge" dataTable [steps]="bridge" />`,
  };

  protected readonly typeSnippet = `interface WrWaterfallStep {
  label: string;
  value: number;
  total?: boolean;
}`;

  protected readonly api = API.WrWaterfallChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrWaterfallStep', description: 'One step: a change, or a total.', type: 'interface' },
    {
      name: 'label',
      description: 'The step name: under the bar, tooltip, data table.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'value',
      description:
        'The change. Zero, or not a number, is a neutral hairline. On a total, the expected total: checked, not drawn. A total before every change opens the chart at it.',
      type: 'number',
      required: true,
      sub: true,
    },
    {
      name: 'total',
      description: 'Draw a bar from zero to the running total.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
  ];
}
