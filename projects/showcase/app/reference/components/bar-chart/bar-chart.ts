import { Component } from '@angular/core';

import { WrBarChart } from 'ngwr/bar-chart';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-bar-chart-page',
  templateUrl: './bar-chart.html',
  imports: [WrBarChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class BarChartPageComponent {
  protected readonly bars = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
    { label: 'Wed', value: 9 },
    { label: 'Thu', value: 24, color: 'var(--wr-color-warning)' },
    { label: 'Fri', value: 17 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 11 },
  ];

  protected readonly snippets = {
    install: `import { WrBarChart } from 'ngwr/bar-chart';

@Component({ imports: [WrBarChart] })
export class MyComponent {
  protected readonly bars = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
    { label: 'Wed', value: 9 },
    { label: 'Thu', value: 24, color: 'var(--wr-color-warning)' },
    { label: 'Fri', value: 17 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 11 },
  ];
}`,
    basic: `<wr-bar-chart [data]="bars" />`,
  };

  protected readonly typeSnippet = `interface WrBarChartDatum {
  label: string;
  value: number;
  color?: string;
}`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'data', description: 'Bars to render.', type: 'readonly WrBarChartDatum[]', default: '[]' },
    { name: 'color', description: 'Bar fill.', type: 'string', default: "'var(--wr-color-primary)'" },
    { name: 'showValues', description: 'Print each value above its bar.', type: 'boolean', default: 'true' },
    { name: 'height', description: 'Chart height in pixels. Floored at 40.', type: 'number', default: '200' },
    {
      name: 'max',
      description: 'Upper bound of the value axis. `0` scales to the largest datum.',
      type: 'number',
      default: '0',
    },
  ];

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrBarChartDatum', description: 'One bar of data.', type: 'interface' },
    { name: 'label', description: 'Category label under the bar.', type: 'string', required: true, sub: true },
    { name: 'value', description: 'Bar magnitude.', type: 'number', required: true, sub: true },
    { name: 'color', description: 'CSS color for the bar.', type: 'string', default: 'palette', sub: true },
  ];
}
