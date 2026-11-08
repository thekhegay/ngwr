import { Component } from '@angular/core';

import { WrLetterStagger } from 'ngwr/animations/letter-stagger';
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
  selector: 'ngwr-letter-stagger-page',
  templateUrl: './letter-stagger.html',
  imports: [
    WrLetterStagger,
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
export default class LetterStaggerPageComponent {
  protected readonly snippets = {
    basic: `<h1><wr-letter-stagger text="Components that bind straight to Signal Forms." /></h1>`,
    words: `<h1><wr-letter-stagger text="One word at a time." by="words" /></h1>`,
    masked: `<h1><wr-letter-stagger text="Up from under the line." masked /></h1>`,
    sequence: `<h1>
  <span class="wr-letter-stagger__item" style="--wr-letter-stagger-i: 0"><wr-tag>Angular</wr-tag></span>
  <wr-letter-stagger text="components for" start="1" />
  <em><wr-letter-stagger text="Signal Forms" start="15" /></em>
</h1>`,
    view: `<h2><wr-letter-stagger text="Plays when it scrolls into view." trigger="view" /></h2>`,
    styled: `h1 {
  --wr-letter-stagger-offset: 0.5em;
  --wr-letter-stagger-duration: 0.8s;
}`,
  };

  protected readonly api = API.WrLetterStagger;
}
