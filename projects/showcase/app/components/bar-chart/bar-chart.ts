import { Component } from '@angular/core';

import { WrBarChart } from 'ngwr/bar-chart';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-bar-chart-page',
  templateUrl: './bar-chart.html',
  imports: [WrBarChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
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
}
