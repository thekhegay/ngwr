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
import { API } from '#core/generated/api';

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
    pie: `<wr-donut-chart [segments]="devices" pie />`,
    tooltip: `<wr-donut-chart [segments]="segments" />
<wr-donut-chart [segments]="segments" [tooltip]="false" />`,
    toggle: `<wr-donut-chart [segments]="sources" toggleableLegend [(hiddenSegments)]="hidden" />`,
    toggleTs: `hidden = signal<readonly number[]>([]);`,
  };

  protected readonly typeSnippet = `interface WrDonutSegment {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly api = API.WrDonutChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrDonutSegment', description: 'One slice of the ring.', type: 'interface' },
    { name: 'label', description: 'Legend label.', type: 'string', required: true, sub: true },
    {
      name: 'value',
      description: 'Slice size, as a share of the total. A negative or non-finite value draws no slice.',
      type: 'number',
      required: true,
      sub: true,
    },
    { name: 'color', description: 'CSS color for the slice.', type: 'string', default: 'palette', sub: true },
  ];
}
