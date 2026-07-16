import { Component } from '@angular/core';

import { WrLineChart } from 'ngwr/line-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-line-chart-page',
  templateUrl: './line-chart.html',
  imports: [WrLineChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class LineChartPageComponent {
  protected readonly series = [
    { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14], color: 'var(--wr-color-success)' },
  ];

  protected readonly xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly snippets = {
    install: `import { WrLineChart } from 'ngwr/line-chart';

@Component({ imports: [WrLineChart] })
export class MyComponent {
  protected readonly series = [
    { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14], color: 'var(--wr-color-success)' },
  ];
  protected readonly labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}`,
    basic: `<wr-line-chart [series]="series" [xLabels]="labels" />`,
  };

  protected readonly typeSnippet = `interface WrLineSeries {
  label: string;
  data: readonly number[];
  color?: string;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrLineSeries', description: 'One plotted line.', type: 'interface' },
    { name: 'label', description: 'Legend label.', type: 'string', required: true, sub: true },
    {
      name: 'data',
      description: 'Y values, evenly spaced along the x axis.',
      type: 'readonly number[]',
      required: true,
      sub: true,
    },
    { name: 'color', description: 'CSS color for the stroke.', type: 'string', default: 'palette', sub: true },
  ];
}
