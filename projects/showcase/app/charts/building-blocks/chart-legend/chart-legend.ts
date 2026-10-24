import { Component, computed, signal } from '@angular/core';

import { WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import { WrSparkline } from 'ngwr/charts/sparkline';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

interface Metric {
  readonly label: string;
  readonly color: string;
  readonly data: readonly number[];
}

@Component({
  selector: 'ngwr-chart-legend-page',
  templateUrl: './chart-legend.html',
  imports: [
    WrChartLegend,
    WrSparkline,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ChartLegendPageComponent {
  protected readonly sources: readonly WrChartLegendItem[] = [
    { label: 'Direct', color: 'var(--wr-color-primary)', value: '4,812' },
    { label: 'Search', color: 'var(--wr-color-success)', value: '3,206' },
    { label: 'Social', color: 'var(--wr-color-warning)', value: '1,157' },
    { label: 'Referral', color: 'var(--wr-color-danger)', value: '644' },
  ];

  protected readonly keys: readonly WrChartLegendItem[] = [
    { label: 'Solid line', color: 'var(--wr-color-primary)', dash: '' },
    { label: 'Dashed line', color: 'var(--wr-color-success)', dash: '7 4' },
    { label: 'Square', color: 'var(--wr-color-warning)', marker: 'square' },
    { label: 'Triangle', color: 'var(--wr-color-danger)', marker: 'triangle' },
    { label: 'Line with points', color: 'var(--wr-color-on-surface-muted)', dash: '2 3', marker: 'diamond' },
  ];

  protected readonly metrics: readonly Metric[] = [
    { label: 'Visits', color: 'var(--wr-color-primary)', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', color: 'var(--wr-color-success)', data: [3, 5, 4, 8, 11, 9, 14] },
    { label: 'Errors', color: 'var(--wr-color-danger)', data: [6, 4, 7, 3, 2, 4, 1] },
  ];

  protected readonly hidden = signal<readonly number[]>([]);

  protected readonly metricItems = computed<readonly WrChartLegendItem[]>(() =>
    this.metrics.map(({ label, color }) => ({ label, color, dash: '' }))
  );

  protected readonly snippets = {
    basic: `<ul
  wr-chart-legend
  [items]="[
    { label: 'Direct', color: 'var(--wr-color-primary)', value: '4,812' },
    { label: 'Search', color: 'var(--wr-color-success)', value: '3,206' }
  ]"
></ul>`,
    keys: `<ul
  wr-chart-legend
  [items]="[
    { label: 'Dashed line', color: 'var(--wr-color-success)', dash: '7 4' },
    { label: 'Triangle', color: 'var(--wr-color-danger)', marker: 'triangle' },
    { label: 'Line with points', color: 'var(--wr-color-on-surface-muted)', dash: '2 3', marker: 'diamond' }
  ]"
></ul>`,
    toggle: `<ul wr-chart-legend toggleable [items]="items" [(hiddenSeries)]="hidden"></ul>

@for (metric of metrics; track $index) {
  @if (!hidden().includes($index)) {
    <wr-sparkline [data]="metric.data" [color]="metric.color" [ariaLabel]="metric.label" />
  }
}`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
  };

  protected readonly typeSnippet = `interface WrChartLegendItem {
  label: string;
  color: string;
  value?: string | null;
  marker?: WrChartMarker;
  dash?: string;
}

type WrChartMarker = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'triangle-down';

interface WrChartLegendToggle {
  index: number;
  label: string;
  hidden: boolean;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrChartLegendItem', description: 'One row of the legend.', type: 'interface' },
    {
      name: 'label',
      description: "The series' name, and the toggle's name.",
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'color',
      description: 'Any CSS colour. Fills a dot or a marker, strokes a line.',
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'value',
      description: 'Printed after the label, muted, as given. No value element when left out.',
      type: 'string | null',
      default: 'undefined',
      sub: true,
    },
    {
      name: 'marker',
      description: 'Draws the key as this shape. With `dash`, the shape sits on the line.',
      type: 'WrChartMarker',
      default: 'undefined',
      sub: true,
    },
    {
      name: 'dash',
      description: "Draws the key as a line in this `stroke-dasharray`. `''` is solid.",
      type: 'string',
      default: 'undefined',
      sub: true,
    },
    { name: 'WrChartLegendToggle', description: 'What `(toggled)` emits.', type: 'interface' },
    { name: 'index', description: "The row's position in `items`.", type: 'number', required: true, sub: true },
    {
      name: 'label',
      description: "The row's label. Labels can repeat, so key on `index`.",
      type: 'string',
      required: true,
      sub: true,
    },
    { name: 'hidden', description: 'Whether the series is hidden now.', type: 'boolean', required: true, sub: true },
  ];

  protected readonly api = API.WrChartLegend;
}
