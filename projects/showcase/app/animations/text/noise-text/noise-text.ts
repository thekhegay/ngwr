import { Component } from '@angular/core';

import { WrNoiseText } from 'ngwr/animations/noise-text';
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
  selector: 'ngwr-noise-text-page',
  templateUrl: './noise-text.html',
  imports: [
    WrNoiseText,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class NoiseTextPageComponent {
  protected readonly snippets = {
    basic: `<h2><span wrNoiseText>Hover me</span></h2>`,
    focus: `<button wr-btn outlined type="button"><span wrNoiseText>Hover or focus me</span></button>`,
    shift: `<h2><span wrNoiseText shift="0.4">Heat haze</span></h2>`,
  };

  protected readonly api = API.WrNoiseText;
}
