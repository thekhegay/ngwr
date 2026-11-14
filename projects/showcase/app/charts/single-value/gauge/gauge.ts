import { Component } from '@angular/core';

import { WrGauge } from 'ngwr/charts/gauge';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-gauge-page',
  templateUrl: './gauge.html',
  imports: [WrGauge, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class GaugePageComponent {
  protected readonly snippets = {
    basic: `<wr-gauge [value]="72" suffix="%" />`,
    colored: `<wr-gauge [value]="9.5" [min]="0" [max]="10" suffix="/10" valueColor="var(--wr-chart-3)" />
<wr-gauge [value]="94" suffix="%" valueColor="var(--wr-color-danger)" />`,
    stroke: `<wr-gauge [value]="72" [size]="96" [strokeWidth]="8" />
<wr-gauge [value]="72" [size]="200" [strokeWidth]="8" />`,
    states: `<wr-gauge [value]="72" suffix="%" loading />
<wr-gauge [value]="72" suffix="%" error errorLabel="Unavailable" />`,
    tooltip: `<wr-gauge [value]="72" suffix="%" [showValue]="false" ariaLabel="CPU" />`,
  };

  protected readonly api = API.WrGauge;
}
