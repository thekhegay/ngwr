import { Component } from '@angular/core';

import { WrRippleGrid } from 'ngwr/animations/ripple-grid';
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
  selector: 'ngwr-ripple-grid-page',
  templateUrl: './ripple-grid.html',
  imports: [
    WrRippleGrid,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class RippleGridPageComponent {
  protected readonly snippets = {
    basic: `<main class="not-found">
  <wr-ripple-grid />
  <wr-result-404 />
</main>`,
    parent: `.not-found {
  position: relative;
  isolation: isolate;
}`,
    spacing: `<wr-ripple-grid spacing="48" />`,
  };

  protected readonly api = API.WrRippleGrid;
}
