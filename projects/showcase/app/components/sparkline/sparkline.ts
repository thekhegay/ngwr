import { Component } from '@angular/core';

import { WrSparkline } from 'ngwr/sparkline';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-sparkline-page',
  templateUrl: './sparkline.html',
  imports: [WrSparkline, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class SparklinePageComponent {
  protected readonly data = [12, 18, 9, 22, 30, 25, 27, 35, 32, 41, 38, 45];

  protected readonly snippets = {
    install: `import { WrSparkline } from 'ngwr/sparkline';

@Component({ imports: [WrSparkline] })
export class MyComponent {
  protected readonly data = [12, 18, 9, 22, 30, 25, 27, 35, 32, 41, 38, 45];
}`,
    basic: `<wr-sparkline [data]="[12, 14, 9, 17, 21, 18, 23]" />`,
    area: `<wr-sparkline [data]="data" [showArea]="true" color="var(--wr-color-success)" />`,
  };
}
