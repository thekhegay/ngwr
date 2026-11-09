import { Component } from '@angular/core';

import { WrGradientFlow } from 'ngwr/animations/gradient-flow';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-gradient-flow-page',
  templateUrl: './gradient-flow.html',
  imports: [WrGradientFlow, WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class GradientFlowPageComponent {
  protected readonly snippets = {
    basic: `<h2><span wrGradientFlow>ngtrue</span></h2>`,
    colours: `<span
  wrGradientFlow
  style="--wr-gradient-flow-from: var(--wr-color-danger-ink); --wr-gradient-flow-via: var(--wr-color-warning-ink)"
  >Sunset</span
>`,
    cadence: `.brand {
  --wr-gradient-flow-cycle: 4s;
  --wr-gradient-flow-steps: 60;
}`,
  };
}
