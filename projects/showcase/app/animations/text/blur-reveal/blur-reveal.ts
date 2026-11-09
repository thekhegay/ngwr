import { Component } from '@angular/core';

import { WrBlurReveal } from 'ngwr/animations/blur-reveal';
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
  selector: 'ngwr-blur-reveal-page',
  templateUrl: './blur-reveal.html',
  imports: [
    WrBlurReveal,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocReplayComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BlurRevealPageComponent {
  protected readonly snippets = {
    basic: `<h2 wrBlurReveal>Signal Forms, with nothing in between.</h2>`,
    letters: `<h2 wrBlurReveal by="letters">Built on the new Angular.</h2>`,
    above: `<h2 wrBlurReveal from="above">The checks behind ngwr.</h2>`,
    timing: `<p wrBlurReveal delay="300" stagger="120">Each word waits for the one before it.</p>`,
    styled: `.hero h2 {
  --wr-blur-reveal-blur: 0.4em;
  --wr-blur-reveal-duration: 1s;
}`,
  };

  protected readonly api = API.WrBlurReveal;
}
