import { Component } from '@angular/core';

import { WrFlowLines } from 'ngwr/animations/flow-lines';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-flow-lines-page',
  templateUrl: './flow-lines.html',
  imports: [
    WrFlowLines,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FlowLinesPageComponent {
  protected readonly snippets = {
    basic: `<section class="hero">
  <wr-flow-lines />
  <h1>Angular components that bind straight to Signal Forms.</h1>
</section>`,
    parent: `.hero {
  position: relative;
  isolation: isolate;
}`,
    tuning: `<wr-flow-lines gap="16" sway="40" lift="20" reach="200" />`,
  };

  protected readonly api = API.WrFlowLines;
}
