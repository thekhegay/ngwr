import { Component } from '@angular/core';

import { WrDonutChart } from 'ngwr/donut-chart';

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
  protected readonly segments = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25 },
    { label: 'Free', value: 15 },
  ];

  protected readonly snippets = {
    install: `import { WrDonutChart } from 'ngwr/donut-chart';

@Component({ imports: [WrDonutChart] })
export class MyComponent {
  protected readonly segments = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25 },
    { label: 'Free', value: 15 },
  ];
}`,
    basic: `<wr-donut-chart [segments]="segments" centerLabel="Disk" centerValue="60%" />`,
    solid: `<wr-donut-chart [segments]="segments" thickness="0" />`,
  };

  protected readonly typeSnippet = `interface WrDonutSegment {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly apiRows: readonly DocApiRow[] = [
    { name: 'segments', description: 'Slices to render.', type: 'WrDonutSegment[]', default: '[]' },
    { name: 'size', description: 'Diameter in CSS pixels (min 48).', type: 'number', default: '200' },
    {
      name: 'thickness',
      description: 'Inner-ring thickness as a % of radius. 0 = solid pie.',
      type: 'number',
      default: '30',
    },
    { name: 'showLegend', description: 'Show the legend under the chart.', type: 'boolean', default: 'true' },
    { name: 'centerValue', description: 'Bold value text in the center.', type: 'string', default: "''" },
    { name: 'centerLabel', description: 'Smaller label under the center value.', type: 'string', default: "''" },
  ];

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrDonutSegment', description: 'One slice of the ring.', type: 'interface' },
    { name: 'label', description: 'Legend label.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Slice magnitude — share of the total.', type: 'number', required: true, sub: true },
    { name: 'color', description: 'CSS color for the slice.', type: 'string', default: 'palette', sub: true },
  ];
}
