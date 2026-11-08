import { Component } from '@angular/core';

import { WrAurora } from 'ngwr/animations/aurora';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-aurora-page',
  templateUrl: './aurora.html',
  imports: [WrAurora, WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class AuroraPageComponent {
  protected readonly snippets = {
    basic: `<section class="hero">
  <wr-aurora />
  <h2>Built on the new Angular.</h2>
</section>`,
    parent: `.hero {
  position: relative;
  isolation: isolate;
}`,
    colours: `<section class="hero" style="--wr-aurora-color-1: var(--wr-color-warning); --wr-aurora-strength: 20%">
  <wr-aurora />
  …
</section>`,
  };
}
