import { Component, signal } from '@angular/core';

import { WrGlitch } from 'ngwr/animations/glitch';
import { WrButton } from 'ngwr/button';
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
  selector: 'ngwr-glitch-page',
  templateUrl: './glitch.html',
  imports: [
    WrGlitch,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class GlitchPageComponent {
  protected readonly snippets = {
    basic: `<h2 wrGlitch>Hover me</h2>`,
    target: `<wr-result-404 wrGlitch=".wr-result__title" />`,
    hover: `<button wr-btn outlined type="button"><span wrGlitch>Hover or focus me</span></button>`,
    active: `<h2 wrGlitch [active]="on()">Signal lost</h2>`,
    styled: `.signal {
  --wr-glitch-cycle: 2s;
  --wr-glitch-shift: 0.2em;
  --wr-glitch-skew: 4deg;
  --wr-glitch-strength: 40%;
}`,
  };

  protected readonly active = signal(false);

  protected readonly api = API.WrGlitch;
}
