import { Component } from '@angular/core';

import { WrBulletChart } from 'ngwr/charts/bullet-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

/** One row of the dashboard demo. */
interface Kpi {
  readonly label: string;
  readonly subLabel: string;
  readonly value: number;
  readonly target: number;
  readonly ranges: readonly number[];
}

@Component({
  selector: 'ngwr-bullet-chart-page',
  templateUrl: './bullet-chart.html',
  imports: [
    WrBulletChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BulletChartPageComponent {
  protected readonly kpis: readonly Kpi[] = [
    { label: 'Revenue', subLabel: 'USD, thousands', value: 270, target: 250, ranges: [150, 225, 300] },
    { label: 'Profit', subLabel: '%', value: 22, target: 26, ranges: [20, 25, 30] },
    { label: 'Order size', subLabel: 'USD, average', value: 545, target: 550, ranges: [350, 500, 600] },
    { label: 'New customers', subLabel: 'count', value: 1650, target: 2100, ranges: [1400, 2000, 2500] },
    { label: 'Satisfaction', subLabel: 'out of 5', value: 4.6, target: 4.2, ranges: [3.5, 4.25, 5] },
  ];

  private readonly usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });

  protected readonly format = (value: number): string => this.usd.format(value * 1000);

  protected readonly snippets = {
    basic: `<wr-bullet-chart
  label="Revenue"
  subLabel="USD, thousands"
  [value]="270"
  [target]="250"
  [ranges]="[150, 225, 300]"
/>`,
    column: `@for (kpi of kpis; track kpi.label) {
  <wr-bullet-chart
    style="--wr-bullet-chart-label-width: 7rem"
    [label]="kpi.label"
    [subLabel]="kpi.subLabel"
    [value]="kpi.value"
    [target]="kpi.target"
    [ranges]="kpi.ranges"
  />
}`,
    scale: `<!-- Ends at 300, the largest of the three -->
<wr-bullet-chart label="Default" [value]="270" [target]="250" [ranges]="[150, 225, 300]" />

<!-- A fixed end: 270 is drawn to it -->
<wr-bullet-chart label="max 250" [value]="270" [target]="200" [ranges]="[150, 225, 300]" [max]="250" />

<!-- Below zero: the bar runs from -20 up to zero -->
<wr-bullet-chart label="Margin" subLabel="%" [value]="-20" [target]="10" [ranges]="[0, 20, 40]" />`,
    format: `<wr-bullet-chart label="Revenue" [value]="270" [target]="250" [ranges]="[150, 225, 300]" [valueFormat]="format" />`,
    formatTs: `const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });

// The figures are thousands: 270 reads "$270K".
format = (value: number): string => usd.format(value * 1000);`,
    missing: `<!-- No value yet: no bar, and the name says so -->
<wr-bullet-chart label="Revenue" [value]="null" [target]="250" [ranges]="[150, 225, 300]" />

<!-- No target: no marker -->
<wr-bullet-chart label="Revenue" [value]="270" [ranges]="[150, 225, 300]" />`,
  };

  protected readonly api = API.WrBulletChart;
}
