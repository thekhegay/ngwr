import { Component } from '@angular/core';

import { WrReveal } from 'ngwr/animations/reveal';
import { WrTag } from 'ngwr/badge';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocReplayComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-reveal-page',
  templateUrl: './reveal.html',
  imports: [
    WrReveal,
    WrTag,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocReplayComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class RevealPageComponent {
  protected readonly snippets = {
    basic: `<h1><wr-reveal text="Components that bind straight to Signal Forms." /></h1>`,
    words: `<h1><wr-reveal text="One word at a time." by="words" /></h1>`,
    masked: `<h1><wr-reveal text="Up from under the line." masked /></h1>`,
    sequence: `<h1>
  <span class="wr-reveal__item" style="--wr-reveal-i: 0"><wr-tag>Angular</wr-tag></span>
  <wr-reveal text="components for" start="1" />
  <em><wr-reveal text="Signal Forms" start="15" /></em>
</h1>`,
    view: `<h2><wr-reveal text="Plays when it scrolls into view." trigger="view" /></h2>`,
    styled: `h1 {
  --wr-reveal-offset: 0.5em;
  --wr-reveal-duration: 0.8s;
}`,
  };

  protected readonly api = API.WrReveal;
}
