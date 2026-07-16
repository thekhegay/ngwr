import { Component } from '@angular/core';

import { WrSparkline } from 'ngwr/sparkline';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-sparkline-page',
  templateUrl: './sparkline.html',
  imports: [WrSparkline, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
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

  protected readonly api: readonly DocApiRow[] = [
    { name: 'data', description: 'Values to plot.', type: 'readonly number[]', default: '[]' },
    { name: 'color', description: 'Stroke colour.', type: 'string', default: "'var(--wr-color-primary)'" },
    { name: 'strokeWidth', description: 'Stroke width in viewBox units.', type: 'number', default: '1.5' },
    { name: 'showArea', description: 'Fill the area below the line.', type: 'boolean', default: 'false' },
    { name: 'showTip', description: 'Show a dot at the last point.', type: 'boolean', default: 'true' },
    { name: 'width', description: 'CSS width.', type: 'string', default: "'8rem'" },
    { name: 'height', description: 'CSS height.', type: 'string', default: "'2rem'" },
  ];
}
