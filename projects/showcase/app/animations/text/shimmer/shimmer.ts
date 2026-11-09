import { Component } from '@angular/core';

import { WrShimmer } from 'ngwr/animations/shimmer';
import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-shimmer-page',
  templateUrl: './shimmer.html',
  imports: [
    WrShimmer,
    WrTag,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class ShimmerPageComponent {
  protected readonly snippets = {
    basic: `<p class="muted"><span wrShimmer>New in 15.7: the animations family.</span></p>
<h2><span wrShimmer style="--wr-shimmer-peak: var(--wr-color-primary-ink)">A band of light across the glyphs.</span></h2>`,
    fill: `<wr-tag color="primary" outlined style="--wr-shimmer-peak: var(--wr-color-primary-contrast)">
  <span wrShimmer>Signals-first</span>
</wr-tag>
<wr-tag color="primary" style="--wr-shimmer-peak: var(--wr-color-primary-soft); --wr-shimmer-strength: 100%">
  <span wrShimmer>Signals-first</span>
</wr-tag>`,
    hover: `<button wr-btn outlined type="button">
  <span wrShimmer style="--wr-shimmer-peak: var(--wr-color-primary)">Hover or focus me</span>
</button>`,
    styled: `.promo span {
  --wr-shimmer-band: 5em;
  --wr-shimmer-strength: 100%;
  --wr-shimmer-pass: 2.4s;
  --wr-shimmer-pause: 1s;
}`,
  };
}
