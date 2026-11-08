import { Component } from '@angular/core';

import { WrShine } from 'ngwr/animations/shine';
import { WrBadge, WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-shine-page',
  templateUrl: './shine.html',
  imports: [
    WrShine,
    WrBadge,
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
    basic: `<wr-badge size="sm" shape="pill"><span wrShine>Added in v15.7</span></wr-badge>
<h2><span wrShine>A band of light across the glyphs.</span></h2>`,
    fill: `<wr-tag color="primary" style="--wr-shine-peak: var(--wr-color-primary-contrast)">
  <span wrShine>On a fill</span>
</wr-tag>`,
    hover: `<button wr-btn color="primary" type="button"><span wrShine>Hover or focus me</span></button>`,
    styled: `.promo span {
  --wr-shine-pass: 2s;
  --wr-shine-pause: 8s;
  --wr-shine-strength: 100%;
}`,
  };
}
