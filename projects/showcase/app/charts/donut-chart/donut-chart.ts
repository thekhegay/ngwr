import { Component, signal } from '@angular/core';

import { WrDonutChart, type WrDonutSegment } from 'ngwr/charts/donut-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-donut-chart-page',
  templateUrl: './donut-chart.html',
  imports: [
    WrDonutChart,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DonutChartPageComponent {
  protected readonly segments: readonly WrDonutSegment[] = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25 },
    { label: 'Free', value: 15 },
  ];

  protected readonly devices: readonly WrDonutSegment[] = [
    { label: 'Desktop', value: 5440 },
    { label: 'Mobile', value: 3920 },
    { label: 'Tablet', value: 560 },
    { label: 'Other', value: 80 },
  ];

  protected readonly sources: readonly WrDonutSegment[] = [
    { label: 'Direct', value: 4812 },
    { label: 'Search', value: 3206 },
    { label: 'Social', value: 1157 },
    { label: 'Referral', value: 644 },
  ];

  protected readonly hiddenSegments = signal<readonly number[]>([]);

  protected readonly snippets = {
    basic: `<wr-donut-chart [segments]="segments" centerLabel="Disk" centerValue="60%" />`,
    pie: `<wr-donut-chart [segments]="segments" pie />`,
    tooltip: `<wr-donut-chart [segments]="segments" />
<wr-donut-chart [segments]="segments" [tooltip]="false" />`,
    toggle: `<wr-donut-chart [segments]="segments" toggleableLegend [(hiddenSegments)]="hidden" />`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
  };

  protected readonly typeSnippet = `interface WrDonutSegment {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly apiRows: readonly DocApiRow[] = [
    {
      name: 'segments',
      description: 'Slices to render.',
      type: 'readonly WrDonutSegment[]',
      default: '[]',
    },
    {
      name: 'ariaLabel',
      description:
        'Accessible name of the chart. Falls back to `donutChart.label`, or `donutChart.pieLabel` with `pie`.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'size', description: 'Diameter in CSS pixels (min 48).', type: 'number', default: '200' },
    {
      name: 'thickness',
      description: 'Ring thickness as a % of the radius. `0` fills to the centre. Ignored with `pie`.',
      type: 'number',
      default: '30',
    },
    {
      name: 'pie',
      description: 'Fill every slice to the centre. No centre text. The name falls back to `donutChart.pieLabel`.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'showLegend', description: 'Show the legend under the chart.', type: 'boolean', default: 'true' },
    {
      name: 'toggleableLegend',
      description: 'Make each legend row a toggle button that shows and hides its slice.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'hiddenSegments',
      description:
        'Positions in `segments` of the hidden slices. Two-way. The slices still shown fill the ring; the legend keeps the hidden rows.',
      type: 'readonly number[]',
      default: '[]',
    },
    {
      name: 'centerValue',
      description: 'Bold value text in the center. Not drawn with `pie`.',
      type: 'string',
      default: "''",
    },
    {
      name: 'centerLabel',
      description: 'Smaller label under the center value. Not drawn with `pie`.',
      type: 'string',
      default: "''",
    },
    {
      name: 'tooltip',
      description: 'Show the slice label and value on hover. With `pie`, a thin slice gets a wider hover target.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: 'valueFormat',
      description: 'Writes each value in the legend and the tooltip. `null` uses `Intl.NumberFormat` in `LOCALE_ID`.',
      type: '((value: number) => string) | null',
      default: 'null',
    },
  ];

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrDonutSegment', description: 'One slice of the ring.', type: 'interface' },
    { name: 'label', description: 'Legend label.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Slice size, as a share of the total.', type: 'number', required: true, sub: true },
    { name: 'color', description: 'CSS color for the slice.', type: 'string', default: 'palette', sub: true },
  ];
}
