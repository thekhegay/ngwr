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
  // The Statuses section used to print the `snippet` below — a success result
  // with a button, which says nothing about statuses and is the very next
  // section's example. A reader copying the block under a heading gets what
  // that heading promised.
  protected readonly statuses = `<wr-result status="success" title="Submitted" />
<wr-result status="warning" title="Heads up" />
<wr-result status="error" title="Failed" />
<wr-result status="info" title="In review" />
<wr-result status="empty" title="No projects" />`;

  protected readonly snippet = `<wr-result status="success" title="Submitted!" description="We'll be in touch.">
  <button wr-btn type="button" color="primary" wrResultExtra>Continue</button>
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
