import { Component } from '@angular/core';

import { WrTilt } from 'ngwr/animations/tilt';
import { WrCard } from 'ngwr/card';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-tilt-page',
  templateUrl: './tilt.html',
  imports: [WrTilt, WrCard, WrTypography, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class TiltPageComponent {
  protected readonly tiles = [
    { title: 'Forms guide', text: 'Signal Forms, end to end.' },
    { title: 'Theming', text: 'Tokens, dark mode and a rebrand in one call.' },
    { title: 'SSR', text: 'What renders on the server, and how to check it.' },
  ];

  protected readonly snippets = {
    basic: `<a class="link-card" routerLink="/guides/forms" wrTilt>
  <span class="link-card__title">Forms guide</span>
  <span class="link-card__desc">Signal Forms, end to end.</span>
</a>`,
  };
}
