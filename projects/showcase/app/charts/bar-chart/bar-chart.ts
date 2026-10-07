import { Component } from '@angular/core';

import { WrBarChart, type WrBarChartDatum } from 'ngwr/charts/bar-chart';

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
  selector: 'ngwr-bar-chart-page',
  templateUrl: './bar-chart.html',
  imports: [WrBarChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class BarChartPageComponent {
  protected readonly bars: readonly WrBarChartDatum[] = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
    { label: 'Wed', value: 9 },
    { label: 'Thu', value: 24, color: 'var(--wr-color-warning)' },
    { label: 'Fri', value: 17 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 11 },
  ];

  protected readonly snippets = {
    basic: `<wr-bar-chart [data]="bars" />`,
    tooltip: `<!-- On by default; hover either chart below to compare. -->
<wr-bar-chart [data]="bars" />
<wr-bar-chart [data]="bars" [tooltip]="false" />`,
  };

  protected readonly typeSnippet = `interface WrBarChartDatum {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly api = API.WrBarChart;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrBarChartDatum', description: 'One bar of data.', type: 'interface' },
    { name: 'label', description: 'Category label under the bar.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Bar magnitude.', type: 'number', required: true, sub: true },
    {
      // NOT a palette — that is the donut and the line chart, which rotate
      // through a fallback list per series. A bar chart is one series, so an
      // uncoloured bar takes the chart's own `color` input and every bar comes
      // out the same. Saying `palette` here promised five different bars.
      name: 'color',
      description:
        "CSS color for this bar. Unset falls back to the chart's own `color` input, so by default every bar is the same.",
      type: 'string',
      default: 'the chart’s `color`',
      sub: true,
    },
  ];
}
