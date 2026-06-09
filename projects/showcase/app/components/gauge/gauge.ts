import { Component } from '@angular/core';

import { WrGauge } from 'ngwr/gauge';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-gauge-page',
  templateUrl: './gauge.html',
  imports: [WrGauge, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class GaugePageComponent {
  protected readonly snippets = {
    install: `import { WrGauge } from 'ngwr/gauge';

@Component({ imports: [WrGauge] })
export class MyComponent {}`,
    basic: `<wr-gauge [value]="72" suffix="%" />`,
    colored: `<wr-gauge [value]="9.5" [min]="0" [max]="10" suffix="/10" valueColor="var(--wr-color-warning)" />`,
  };
}
