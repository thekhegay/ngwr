import { Component } from '@angular/core';

import { WrSparkline } from 'ngwr/charts/sparkline';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-sparkline-page',
  templateUrl: './sparkline.html',
  imports: [WrSparkline, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class SparklinePageComponent {
  protected readonly data = [12, 18, 9, 22, 30, 25, 27, 35, 32, 41, 38, 45];

  protected readonly snippets = {
    basic: `<wr-sparkline [data]="[12, 14, 9, 17, 21, 18, 23]" />`,
    area: `<wr-sparkline [data]="data" [showArea]="true" color="var(--wr-color-success)" />`,
    tooltip: `<!-- On by default; hover either line below to compare. The tooltip is named
     by ariaLabel when one is given. -->
<wr-sparkline [data]="data" ariaLabel="Signups" />
<wr-sparkline [data]="data" ariaLabel="Signups" [tooltip]="false" />`,
  };

  protected readonly api = API.WrSparkline;
}
