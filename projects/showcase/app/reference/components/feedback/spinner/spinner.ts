import { Component } from '@angular/core';

import { WrSpinner } from 'ngwr/spinner';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-spinner-page',
  templateUrl: './spinner.html',
  imports: [WrSpinner, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
})
export default class SpinnerComponent {
  protected readonly snippets = {
    basic: `<wr-spinner />`,
    sizes: `<wr-spinner size="sm" />
<wr-spinner size="md" />
<wr-spinner size="lg" />`,
    color: `<div style="color: var(--wr-color-primary)">
  <wr-spinner />
</div>`,
  };

  protected readonly api = API.WrSpinner;
}
