import { Component } from '@angular/core';

import { WrDotGrid } from 'ngwr/animations/dot-grid';
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
  selector: 'ngwr-dot-grid-page',
  templateUrl: './dot-grid.html',
  imports: [
    WrDotGrid,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DotGridPageComponent {
  protected readonly snippets = {
    basic: `<section class="bento">
  <wr-dot-grid />
  <h2>Every component by name.</h2>
</section>`,
    parent: `.bento {
  position: relative;
  isolation: isolate;
}`,
    spacing: `<wr-dot-grid spacing="40" reach="220" />`,
  };

  protected readonly api = API.WrDotGrid;
}
