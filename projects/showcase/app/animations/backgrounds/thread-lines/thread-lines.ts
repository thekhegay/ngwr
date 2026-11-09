import { Component } from '@angular/core';

import { WrThreadLines } from 'ngwr/animations/thread-lines';
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
  selector: 'ngwr-thread-lines-page',
  templateUrl: './thread-lines.html',
  imports: [
    WrThreadLines,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ThreadLinesPageComponent {
  protected readonly snippets = {
    basic: `<section class="opt-in">
  <wr-thread-lines />
  <h2>Opt in to what you need.</h2>
</section>`,
    parent: `.opt-in {
  position: relative;
  isolation: isolate;
}`,
    calm: `<wr-thread-lines count="48" amplitude="8" speed="0.6" fray="0.6" />`,
    dense: `<wr-thread-lines count="110" fray="1.6" angle="-10" thickness="0.8" />`,
    colours: `<section style="--wr-thread-lines-color: var(--wr-color-info); --wr-thread-lines-accent: var(--wr-color-warning)">
  <wr-thread-lines />
  …
</section>`,
    parting: `<wr-thread-lines parting="0" />`,
  };

  protected readonly api = API.WrThreadLines;
}
