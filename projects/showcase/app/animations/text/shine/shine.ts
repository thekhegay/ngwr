import { Component } from '@angular/core';

import { WrShine } from 'ngwr/animations/shine';
import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-shine-page',
  templateUrl: './shine.html',
  imports: [
    WrShine,
    WrTag,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class ShinePageComponent {
  protected readonly snippets = {
    basic: `<p class="muted"><span wrShine>New in 15.7: the animations family.</span></p>
<h2><span wrShine style="--wr-shine-peak: var(--wr-color-primary-ink)">A band of light across the glyphs.</span></h2>`,
    fill: `<wr-tag color="primary" outlined style="--wr-shine-peak: var(--wr-color-primary-contrast)">
  <span wrShine>Signals-first</span>
</wr-tag>
<wr-tag color="primary" style="--wr-shine-peak: var(--wr-color-primary-soft); --wr-shine-strength: 100%">
  <span wrShine>Signals-first</span>
</wr-tag>`,
    hover: `<button wr-btn outlined type="button">
  <span wrShine style="--wr-shine-peak: var(--wr-color-primary)">Hover or focus me</span>
</button>`,
    styled: `.promo span {
  --wr-shine-band: 5em;
  --wr-shine-strength: 100%;
  --wr-shine-pass: 2.4s;
  --wr-shine-pause: 1s;
}`,
  };
}
