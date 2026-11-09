import { Component } from '@angular/core';

import { WrAlert } from 'ngwr/alert';
import { WrAurora } from 'ngwr/animations/aurora';
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
  selector: 'ngwr-aurora-page',
  templateUrl: './aurora.html',
  imports: [
    WrAlert,
    WrAurora,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
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
    edge: `<wr-aurora edge="bottom" height="0.6" />`,
    colours: `<wr-aurora style="--wr-aurora-color-1: var(--wr-color-warning); --wr-aurora-color-2: var(--wr-color-danger); --wr-aurora-color-3: var(--wr-color-primary)" />`,
    calm: `<wr-aurora amplitude="0.5" scale="1.6" speed="0.5" layers="1" />`,
    lively: `<wr-aurora amplitude="1.5" scale="0.7" speed="1.8" layers="3" />`,
    rays: `<wr-aurora rays="0" />`,
    intro: `<wr-aurora intro follow="false" />`,
  };

  protected readonly api = API.WrAurora;
}
