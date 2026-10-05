import { Component } from '@angular/core';

import { WrLineChart, type WrLineSeries } from 'ngwr/charts/line-chart';

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
  selector: 'ngwr-line-chart-page',
  templateUrl: './line-chart.html',
  imports: [WrLineChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class LineChartPageComponent {
  protected readonly series: readonly WrLineSeries[] = [
    { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14], color: 'var(--wr-color-success)' },
  ];

  protected readonly xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly snippets = {
    basic: `<wr-line-chart [series]="series" [xLabels]="labels" />`,
    tooltip: `<!-- On by default; hover either plot below to compare. Turning it off drops
     the crosshair and the point markers with it. -->
<wr-line-chart [series]="series" [xLabels]="labels" />
<wr-line-chart [series]="series" [xLabels]="labels" [tooltip]="false" />`,
  };

  protected readonly typeSnippet = `interface WrLineSeries {
  label: string;
  data: readonly number[];
  color?: string;
}`;

  protected readonly api = API.WrLineChart;

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
