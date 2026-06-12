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

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrDonutSegment', description: 'One slice of the ring.', type: 'interface' },
    { name: 'label', description: 'Legend label.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Slice magnitude — share of the total.', type: 'number', required: true, sub: true },
    { name: 'color', description: 'CSS color for the slice.', type: 'string', default: 'palette', sub: true },
  ];
}
