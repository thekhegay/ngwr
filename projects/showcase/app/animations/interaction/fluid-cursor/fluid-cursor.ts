import { Component } from '@angular/core';

import { WrFluidCursor } from 'ngwr/animations/fluid-cursor';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-fluid-cursor-page',
  templateUrl: './fluid-cursor.html',
  imports: [WrFluidCursor, WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
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
    colours: `<section style="--wr-fluid-cursor-tint-a: var(--wr-color-warning); --wr-fluid-cursor-tint-b: var(--wr-color-danger)">
  <wr-fluid-cursor />
  …
</section>`,
  };
}
