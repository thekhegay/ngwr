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
    calm: `<wr-flow-lines spacing="14" amplitude="16" speed="0.5" push="0.6" />`,
    dense: `<wr-flow-lines spacing="7" lineWidth="0.75" twist="-8" amplitude="36" />`,
    dashed: `<wr-flow-lines dashed speed="1.4" />`,
    ripple: `<wr-flow-lines ripple="false" />`,
    intro: `<wr-flow-lines intro />`,
    colours: `<wr-flow-lines style="--wr-flow-lines-color: var(--wr-color-info); --wr-flow-lines-accent: var(--wr-color-warning)" />`,
  };

  protected readonly api = API.WrFlowLines;
}
