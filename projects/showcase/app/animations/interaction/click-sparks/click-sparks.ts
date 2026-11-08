import { Component } from '@angular/core';

import { WrClickSparks } from 'ngwr/animations/click-sparks';
import { WrButton } from 'ngwr/button';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-click-sparks-page',
  templateUrl: './click-sparks.html',
  imports: [
    WrClickSparks,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ClickSparksPageComponent {
  protected readonly snippets = {
    basic: `<a wr-btn outlined size="lg" routerLink="/docs" wrClickSparks>Get started</a>`,
    count: `<button wr-btn outlined type="button" wrClickSparks="12">Twelve strokes</button>`,
    color: `<button wr-btn type="button" wrClickSparks style="--wr-click-sparks-color: var(--wr-color-primary)">
  Filled
</button>`,
  };

  protected readonly api = API.WrClickSparks;
}
