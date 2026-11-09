import { Component } from '@angular/core';

import { WrRotateReveal } from 'ngwr/animations/rotate-reveal';
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
  selector: 'ngwr-rotate-reveal-page',
  templateUrl: './rotate-reveal.html',
  imports: [
    WrRotateReveal,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class RotateRevealPageComponent {
  protected readonly qualities: readonly string[] = ['tree-shakable', 'accessible', 'RTL-ready', 'themeable'];
  protected readonly verbs: readonly string[] = ['renders', 'validates', 'formats'];
  protected readonly tones: readonly string[] = ['calm', 'quick', 'bold'];

  protected readonly snippets = {
    basic: `<p>Zoneless, SSR-safe, <wr-rotate-reveal [words]="qualities" /> with no accessor layer in between.</p>`,
    loop: `<p>Signal Forms <wr-rotate-reveal [words]="verbs" loop hold="1200" /> on every keystroke.</p>`,
    delay: `<p>Built to be <wr-rotate-reveal [words]="tones" delay="1700" />.</p>`,
    label: `<p>Built to be <wr-rotate-reveal [words]="tones" conjunctionLabel="or" />.</p>`,
    styled: `.hero p {
  --wr-rotate-reveal-offset: 1.4em;
  --wr-rotate-reveal-gap: 40ms;
}`,
  };

  protected readonly api = API.WrRotateReveal;
}
