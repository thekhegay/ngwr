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
    count: `<wr-thread-lines count="40" reach="260" />`,
    low: `<section class="opt-in" style="--wr-thread-lines-low: 1">
  <wr-thread-lines />
  …
</section>`,
  };

  protected readonly api = API.WrThreadLines;
}
