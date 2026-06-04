import { Component } from '@angular/core';

import { WrResult, WrResult403, WrResult404, WrResult500 } from 'ngwr/result';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-result-page',
  templateUrl: './result.html',
  imports: [
    WrResult,
    WrResult404,
    WrResult403,
    WrResult500,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class ResultPageComponent {
  protected readonly snippet = `<wr-result status="success" title="Submitted!" description="We'll be in touch.">
  <button wrResultExtra>Continue</button>
</wr-result>`;

  protected readonly presets = `<!-- Pre-built variants for the common HTTP statuses. Override
     title / description for localisation. -->
<wr-result-404 />
<wr-result-403 />
<wr-result-500 />

<!-- Custom copy: -->
<wr-result-404 title="Lost?" description="That URL didn't lead anywhere." />`;
}
