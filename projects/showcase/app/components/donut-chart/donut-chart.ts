import { Component } from '@angular/core';

import { WrDonutChart } from 'ngwr/donut-chart';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-donut-chart-page',
  templateUrl: './donut-chart.html',
  imports: [WrDonutChart, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
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
}
