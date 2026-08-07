import { Component } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrResult, WrResult403, WrResult404, WrResult500 } from 'ngwr/result';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-result-page',
  templateUrl: './result.html',
  styleUrl: './result.scss',
  imports: [
    WrButton,
    WrResult,
    WrResult404,
    WrResult403,
    WrResult500,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ResultPageComponent {
  protected readonly snippet = `<wr-result status="success" title="Submitted!" description="We'll be in touch.">
  <button wr-btn color="primary" wrResultExtra>Continue</button>
</wr-result>`;

  protected readonly presets = `<!-- Pre-built variants for the common HTTP statuses. Override
     title / description for localisation. -->
<wr-result-404 />
<wr-result-403 />
<wr-result-500 />

<!-- Custom copy: -->
<wr-result-404 title="Lost?" description="That URL didn't lead anywhere." />`;

  protected readonly api = API.WrResult;
}
