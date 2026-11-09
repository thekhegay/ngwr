import { Component } from '@angular/core';

import { WrDestruct } from 'ngwr/animations/destruct';
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
  selector: 'ngwr-destruct-page',
  templateUrl: './destruct.html',
  imports: [
    WrDestruct,
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DestructPageComponent {
  protected readonly snippets = {
    basic: `<h2><span wrDestruct>Hover me</span></h2>`,
    focus: `<button wr-btn outlined type="button"><span wrDestruct>Hover or focus me</span></button>`,
    shift: `<h2><span wrDestruct shift="0.4">Heat haze</span></h2>`,
  };

  protected readonly api = API.WrDestruct;
}
