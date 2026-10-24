import { Component } from '@angular/core';

import { WrBoxplotChart, type WrBoxplotGroup } from 'ngwr/charts/boxplot-chart';

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
  selector: 'ngwr-boxplot-chart-page',
  templateUrl: './boxplot-chart.html',
  imports: [
    WrBoxplotChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BoxplotChartPageComponent {
  /** Response times in ms, a sample per region. */
  protected readonly regions: readonly WrBoxplotGroup[] = [
    { label: 'Europe', values: [96, 102, 108, 111, 115, 118, 120, 124, 127, 131, 135, 140, 148, 156, 290] },
    { label: 'North America', values: [31, 104, 112, 119, 125, 130, 134, 139, 143, 150, 158, 166, 175] },
    { label: 'Asia', values: [120, 131, 140, 148, 155, 161, 168, 174, 181, 190, 199, 210, 224, 238] },
    { label: 'South America', values: [150, 172, 181, 188, 194, 199, 204, 209, 215, 221, 230, 340, 365] },
  ];

  /** Build times in seconds, summarised by the CI. */
  protected readonly releases: readonly WrBoxplotGroup[] = [
    { label: 'v14', stats: { min: 80, q1: 101, median: 118, q3: 134, max: 170, outliers: [240, 262] } },
    { label: 'v15', stats: { min: 70, q1: 92, median: 104, q3: 121, max: 150, outliers: [31] } },
    { label: 'v15.1', stats: { min: 61, q1: 80, median: 90, q3: 101, max: 128 }, color: 'var(--wr-color-success)' },
  ];

  /** Ten values and one far above them. */
  protected readonly anatomy: readonly WrBoxplotGroup[] = [
    { label: 'Sample', values: [12, 14, 15, 17, 18, 19, 21, 22, 24, 27, 48] },
  ];

  private readonly secondsFormat = new Intl.NumberFormat('en-US', { style: 'unit', unit: 'second' });

  /** Build times, with their unit. */
  protected readonly seconds = (value: number): string => this.secondsFormat.format(value);

  protected readonly snippets = {
    basic: `<wr-boxplot-chart
  xLabel="Region"
  yLabel="Response time, ms"
  [groups]="[
    { label: 'Europe', values: [96, 102, 108, 111, 115, 290] },
    { label: 'Asia', values: [120, 131, 140, 148, 155, 161] }
  ]"
/>`,
    stats: `<wr-boxplot-chart yLabel="Build time, s" [groups]="releases" />`,
    statsTs: `releases: WrBoxplotGroup[] = [
  { label: 'v14', stats: { min: 80, q1: 101, median: 118, q3: 134, max: 170, outliers: [240, 262] } },
  { label: 'v15', stats: { min: 70, q1: 92, median: 104, q3: 121, max: 150, outliers: [31] } },
  { label: 'v15.1', stats: { min: 61, q1: 80, median: 90, q3: 101, max: 128 }, color: 'var(--wr-color-success)' },
];`,
    anatomy: `<wr-boxplot-chart [groups]="[{ label: 'Sample', values: [12, 14, 15, 17, 18, 19, 21, 22, 24, 27, 48] }]" />`,
    format: `<wr-boxplot-chart yLabel="Build time" [groups]="releases" [valueFormat]="seconds" />`,
    formatTs: `const unit = new Intl.NumberFormat('en-US', { style: 'unit', unit: 'second' });

seconds = (value: number): string => unit.format(value);`,
    table: `<wr-boxplot-chart ariaLabel="Response time by region" dataTable [groups]="regions" />`,
  };

  protected readonly typeSnippet = `interface WrBoxplotGroup {
  label: string;
  values?: readonly number[];
  stats?: WrBoxplotStats;
  color?: string;
}

interface WrBoxplotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: readonly number[];
}`;

  protected readonly api = API.WrBoxplotChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrBoxplotGroup', description: 'One box.', type: 'interface' },
    {
      name: 'label',
      description: 'The group name: under its box, in the tooltip and the data table.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'values',
      description: 'Raw values to summarise. A non-finite value is left out. Ignored when `stats` is given.',
      type: 'readonly number[]',
      default: 'undefined',
      sub: true,
    },
    {
      name: 'stats',
      description: 'A summary worked out elsewhere, drawn as given.',
      type: 'WrBoxplotStats',
      default: 'undefined',
      sub: true,
    },
    { name: 'color', description: 'Any CSS colour.', type: 'string', default: "the chart's `color`", sub: true },
    { name: 'WrBoxplotStats', description: 'The five numbers and the outliers.', type: 'interface' },
    {
      name: 'min',
      description: 'The lower whisker’s end: the smallest value that is not an outlier.',
      type: 'number',
      required: true,
      sub: true,
    },
    { name: 'q1', description: 'The first quartile: the box’s lower edge.', type: 'number', required: true, sub: true },
    { name: 'median', description: 'The line across the box.', type: 'number', required: true, sub: true },
    { name: 'q3', description: 'The third quartile: the box’s upper edge.', type: 'number', required: true, sub: true },
    {
      name: 'max',
      description: 'The upper whisker’s end: the largest value that is not an outlier.',
      type: 'number',
      required: true,
      sub: true,
    },
    {
      name: 'outliers',
      description: 'Values drawn as dots past the whiskers.',
      type: 'readonly number[]',
      default: 'undefined',
      sub: true,
    },
  ];
}
