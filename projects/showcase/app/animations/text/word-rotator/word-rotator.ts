import { Component } from '@angular/core';

import { WrWordRotator } from 'ngwr/animations/word-rotator';
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
  selector: 'ngwr-word-rotator-page',
  templateUrl: './word-rotator.html',
  imports: [
    WrWordRotator,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WordRotatorPageComponent {
  protected readonly qualities: readonly string[] = ['tree-shakable', 'accessible', 'RTL-ready', 'themeable'];
  protected readonly verbs: readonly string[] = ['renders', 'validates', 'formats'];
  protected readonly tones: readonly string[] = ['calm', 'quick', 'bold'];

  protected readonly snippets = {
    basic: `<p>Zoneless, SSR-safe, <wr-word-rotator [words]="qualities" /> with no accessor layer in between.</p>`,
    loop: `<p>Signal Forms <wr-word-rotator [words]="verbs" loop hold="1200" /> on every keystroke.</p>`,
    delay: `<p>Built to be <wr-word-rotator [words]="tones" delay="1700" />.</p>`,
    label: `<p>Built to be <wr-word-rotator [words]="tones" conjunctionLabel="or" />.</p>`,
    styled: `.hero p {
  --wr-word-rotator-offset: 1.4em;
  --wr-word-rotator-gap: 40ms;
}`,
  };

  protected readonly api = API.WrWordRotator;
}
