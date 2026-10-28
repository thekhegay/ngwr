import { Component, signal } from '@angular/core';

import { type WrFunnelConversion, WrFunnelChart, type WrFunnelStage } from 'ngwr/charts/funnel-chart';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';

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
  selector: 'ngwr-funnel-chart-page',
  templateUrl: './funnel-chart.html',
  imports: [
    WrFunnelChart,
    WrSegmented,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FunnelChartPageComponent {
  protected readonly signups: readonly WrFunnelStage[] = [
    { label: 'Visited', value: 12000 },
    { label: 'Signed up', value: 4800 },
    { label: 'Activated', value: 2880 },
    { label: 'Paid', value: 720 },
  ];

  protected readonly conversion = signal<WrFunnelConversion>('both');

  protected readonly conversionOptions: readonly WrSegmentedOption<WrFunnelConversion>[] = [
    { value: 'both', label: 'both' },
    { value: 'previous', label: 'previous' },
    { value: 'first', label: 'first' },
    { value: 'none', label: 'none' },
  ];

  protected readonly campaign: readonly WrFunnelStage[] = [
    { label: 'Emailed', value: 5000 },
    { label: 'Opened', value: 2100 },
    { label: 'Shared', value: 2600 },
    { label: 'Clicked', value: Number.NaN },
    { label: 'Converted', value: 0 },
  ];

  protected readonly web: readonly WrFunnelStage[] = [
    { label: 'Visited', value: 9000 },
    { label: 'Added to cart', value: 2700 },
    { label: 'Checked out', value: 1100 },
  ];

  protected readonly mobile: readonly WrFunnelStage[] = [
    { label: 'Visited', value: 4000 },
    { label: 'Added to cart', value: 1500 },
    { label: 'Checked out', value: 800 },
  ];

  protected readonly orders: readonly WrFunnelStage[] = [
    { label: 'Quoted', value: 1_250_000 },
    { label: 'Ordered', value: 410_000 },
    { label: 'Delivered', value: 380_000 },
    { label: 'Disputed', value: 260 },
  ];

  private readonly usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  });

  protected readonly money = (value: number): string => this.usd.format(value);

  private readonly percents = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });

  protected readonly percent = (ratio: number): string => this.percents.format(ratio);

  protected readonly snippets = {
    basic: `<wr-funnel-chart
  ariaLabel="Sign-up funnel"
  [stages]="[
    { label: 'Visited', value: 12000 },
    { label: 'Signed up', value: 4800 },
    { label: 'Activated', value: 2880 },
    { label: 'Paid', value: 720 }
  ]"
/>`,
    conversion: `<wr-funnel-chart ariaLabel="Sign-up funnel" [stages]="signups" [conversion]="conversion()" />`,
    conversionTs: `conversion = signal<WrFunnelConversion>('both'); // 'previous' | 'first' | 'none'`,
    honest: `<wr-funnel-chart ariaLabel="Email campaign" [stages]="campaign" />`,
    honestTs: `campaign: WrFunnelStage[] = [
  { label: 'Emailed', value: 5000 },
  { label: 'Opened', value: 2100 },
  // More than the stage before: drawn wider, 123.8% of previous.
  { label: 'Shared', value: 2600 },
  // Not measured: no bar, no band, no conversion to or from it.
  { label: 'Clicked', value: NaN },
  // A real zero: a hairline.
  { label: 'Converted', value: 0 },
];`,
    scale: `<!-- One full width for both: the larger funnel's top stage -->
<wr-funnel-chart ariaLabel="Web" [stages]="web" [max]="9000" />
<wr-funnel-chart ariaLabel="Mobile" [stages]="mobile" [max]="9000" />`,
    format: `<wr-funnel-chart ariaLabel="Orders by value" [stages]="orders" [valueFormat]="money" [percentFormat]="percent" />`,
    formatTs: `usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });
money = (value: number) => this.usd.format(value);

// A ratio in, as Intl's percent style takes it: 0.25 is a quarter.
percents = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });
percent = (ratio: number) => this.percents.format(ratio);`,
    dataTable: `<wr-funnel-chart [stages]="signups" ariaLabel="Sign-up funnel" dataTable />`,
  };

  protected readonly typeSnippet = `interface WrFunnelStage {
  label: string;
  value: number;
  color?: string;
}

type WrFunnelConversion = 'both' | 'previous' | 'first' | 'none';`;

  protected readonly api = API.WrFunnelChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrFunnelStage', description: 'One stage.', type: 'interface' },
    {
      name: 'label',
      description: 'Beside the bar, in the tooltip and in the table.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'value',
      description: 'How many reached it. A non-finite value is missing.',
      type: 'number',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'CSS colour for the bar and its bands.',
      type: 'string',
      default: "the chart's `color`",
      sub: true,
    },
    {
      name: 'WrFunnelConversion',
      description: 'Which conversions the drawing prints.',
      type: "'both' | 'previous' | 'first' | 'none'",
    },
  ];
}
