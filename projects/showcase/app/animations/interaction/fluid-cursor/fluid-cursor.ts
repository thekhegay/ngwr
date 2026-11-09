import { Component } from '@angular/core';

import { WrFluidCursor } from 'ngwr/animations/fluid-cursor';
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
  selector: 'ngwr-fluid-cursor-page',
  templateUrl: './fluid-cursor.html',
  imports: [
    WrFluidCursor,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FluidCursorPageComponent {
  protected readonly snippets = {
    basic: `<footer class="site-footer">
  <wr-fluid-cursor />
  …
</footer>`,
    parent: `.site-footer {
  position: relative;
  isolation: isolate;
}`,
    rainbow: `<wr-fluid-cursor rainbow />`,
    colours: `<section style="--wr-fluid-cursor-color-1: var(--wr-color-warning); --wr-fluid-cursor-color-2: var(--wr-color-danger)">
  <wr-fluid-cursor />
  …
</section>`,
    calm: `<wr-fluid-cursor swirl="0.3" force="0.5" size="40" intensity="0.6" trail="5" />`,
    splash: `<wr-fluid-cursor [clickSplash]="false" />`,
    quality: `<wr-fluid-cursor quality="high" />`,
  };

  protected readonly api = API.WrFluidCursor;
}
