import { Component, signal } from '@angular/core';

import { WrScatterChart, type WrScatterAxis, type WrScatterSeries } from 'ngwr/charts/scatter-chart';

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
  selector: 'ngwr-scatter-chart-page',
  templateUrl: './scatter-chart.html',
  imports: [
    WrScatterChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ScatterChartPageComponent {
  protected readonly products: readonly WrScatterSeries[] = [
    {
      label: 'Headphones',
      data: [
        { x: 49, y: 3.6 },
        { x: 79, y: 3.9 },
        { x: 129, y: 4.2 },
        { x: 199, y: 4.4 },
        { x: 249, y: 4.1 },
        { x: 349, y: 4.7 },
        { x: 99, y: 4.5 },
        { x: 169, y: 3.8 },
      ],
    },
  ];

  protected readonly devices: readonly WrScatterSeries[] = [
    {
      label: 'Laptops',
      data: [
        { x: 1.2, y: 14 },
        { x: 1.4, y: 12 },
        { x: 1.6, y: 10 },
        { x: 2.1, y: 7 },
        { x: 2.4, y: 6 },
      ],
    },
    {
      label: 'Tablets',
      data: [
        { x: 0.45, y: 11 },
        { x: 0.5, y: 10 },
        { x: 0.6, y: 12 },
        { x: 0.68, y: 9 },
      ],
    },
    {
      label: 'Phones',
      data: [
        { x: 0.17, y: 20 },
        { x: 0.19, y: 23 },
        { x: 0.21, y: 18 },
        { x: 0.23, y: 26 },
      ],
    },
  ];

  protected readonly stores: readonly WrScatterSeries[] = [
    {
      label: 'City centre',
      data: [
        { x: 1450, y: 62, size: 320, label: 'Harbour' },
        { x: 1720, y: 71, size: 410, label: 'Old Town' },
        { x: 980, y: 48, size: 260, label: 'Station' },
      ],
    },
    {
      label: 'Suburbs',
      data: [
        { x: 620, y: 41, size: 900, label: 'Northgate' },
        { x: 540, y: 37, size: 1100, label: 'Riverside' },
        { x: 760, y: 52, size: 720, label: 'Hillcrest' },
      ],
    },
  ];

  protected readonly hiddenSeries = signal<readonly number[]>([]);

  private readonly usdFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  /** Price on x, a star rating on y. */
  protected readonly format = (value: number, axis: WrScatterAxis): string =>
    axis === 'x' ? this.usdFormat.format(value) : `${value.toFixed(1)} ★`;

  protected readonly snippets = {
    basic: `<wr-scatter-chart
  xLabel="Price"
  yLabel="Rating"
  [series]="[{ label: 'Headphones', data: [{ x: 49, y: 3.6 }, { x: 129, y: 4.2 }] }]"
/>`,
    series: `<wr-scatter-chart xLabel="Weight, kg" yLabel="Battery, h" [series]="devices" />`,
    bubbles: `<wr-scatter-chart
  xLabel="Visitors a day"
  yLabel="Revenue, k$"
  sizeLabel="Floor area, m²"
  [series]="stores"
/>`,
    bubblesTs: `stores: WrScatterSeries[] = [
  {
    label: 'City centre',
    data: [
      { x: 1450, y: 62, size: 320, label: 'Harbour' },
      { x: 1720, y: 71, size: 410, label: 'Old Town' },
    ],
  },
];`,
    format: `<wr-scatter-chart xLabel="Price" yLabel="Rating" [series]="products" [valueFormat]="format" />`,
    formatTs: `const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

format = (value: number, axis: WrScatterAxis): string =>
  axis === 'x' ? usd.format(value) : value.toFixed(1) + ' ★';`,
    toggle: `<wr-scatter-chart [series]="devices" toggleableLegend [(hiddenSeries)]="hidden" />`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
    table: `<wr-scatter-chart ariaLabel="Weight against battery life" dataTable [series]="devices" />`,
  };

  protected readonly typeSnippet = `interface WrScatterSeries {
  label: string;
  data: readonly WrScatterPoint[];
  color?: string;
}

interface WrScatterPoint {
  x: number;
  y: number;
  size?: number;
  label?: string;
}

type WrScatterAxis = 'x' | 'y' | 'size';`;

  protected readonly api = API.WrScatterChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrScatterSeries', description: 'One series of points.', type: 'interface' },
    {
      name: 'label',
      description: 'The series name: legend, tooltip, data table.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'data',
      description: 'The points, in any order.',
      type: 'readonly WrScatterPoint[]',
      required: true,
      sub: true,
    },
    { name: 'color', description: 'Any CSS colour.', type: 'string', default: 'palette', sub: true },
    { name: 'WrScatterPoint', description: 'One point.', type: 'interface' },
    {
      name: 'x',
      description: 'Position on the x axis. A non-finite point is not drawn.',
      type: 'number',
      required: true,
      sub: true,
    },
    { name: 'y', description: 'Position on the y axis.', type: 'number', required: true, sub: true },
    {
      name: 'size',
      description: "Drawn as the marker's area. The largest is drawn at `maxRadius`.",
      type: 'number',
      default: 'undefined',
      sub: true,
    },
    {
      name: 'label',
      description: "The point's name, in the tooltip and as its data table row.",
      type: 'string',
      default: 'undefined',
      sub: true,
    },
    { name: 'WrScatterAxis', description: 'Which number `valueFormat` writes.', type: "'x' | 'y' | 'size'" },
  ];
}
