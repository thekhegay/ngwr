import { Component } from '@angular/core';

import { WrFallingLetters } from 'ngwr/animations/falling-letters';
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
  selector: 'ngwr-falling-letters-page',
  templateUrl: './falling-letters.html',
  imports: [
    WrFallingLetters,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FallingLettersPageComponent {
  protected readonly snippets = {
    basic: `<section class="arena">
  <p wrFallingLetters>Click this line and watch it fall.</p>
</section>`,
    target: `<wr-result-404 wrFallingLetters=".wr-result__description" />`,
    floor: `<main>
  <p wrFallingLetters [floor]="'main'" rest="2000">Lands on the floor of <code>main</code>.</p>
</main>`,
  };

  protected readonly api = API.WrFallingLetters;
}
