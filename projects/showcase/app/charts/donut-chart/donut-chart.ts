import { Component } from '@angular/core';

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

  protected readonly snippets = {
    basic: `<wr-donut-chart [segments]="segments" centerLabel="Disk" centerValue="60%" />`,
    solid: `<wr-donut-chart [segments]="segments" thickness="0" />`,
    tooltip: `<wr-donut-chart [segments]="segments" />
<wr-donut-chart [segments]="segments" [tooltip]="false" />`,
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
      description: 'Accessible name of the chart. Falls back to the `donutChart.label` catalog key.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'size', description: 'Diameter in CSS pixels (min 48).', type: 'number', default: '200' },
    {
      name: 'thickness',
      description: 'Ring thickness as a % of the radius. `0` draws a solid pie.',
      type: 'number',
      default: '30',
    },
    { name: 'showLegend', description: 'Show the legend under the chart.', type: 'boolean', default: 'true' },
    { name: 'centerValue', description: 'Bold value text in the center.', type: 'string', default: "''" },
    { name: 'centerLabel', description: 'Smaller label under the center value.', type: 'string', default: "''" },
    {
      name: 'tooltip',
      description: 'Show the slice label and value on hover.',
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
