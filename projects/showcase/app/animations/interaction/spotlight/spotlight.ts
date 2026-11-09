import { Component } from '@angular/core';

import { WrSpotlight } from 'ngwr/animations/spotlight';
import { WrCard } from 'ngwr/card';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-spotlight-page',
  templateUrl: './spotlight.html',
  imports: [
    WrSpotlight,
    WrCard,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class SpotlightPageComponent {
  protected readonly tiles = [
    { title: 'Signals first', text: 'Every input, output and state is a signal.' },
    { title: 'Zoneless', text: 'No zone.js, no change detection you did not ask for.' },
    { title: 'SSR-safe', text: 'Every component renders on the server and hydrates.' },
  ];

  protected readonly snippets = {
    basic: `<wr-card wrSpotlight>
  <h3>Signals first</h3>
  <p>Every input, output and state is a signal.</p>
</wr-card>`,
    colour: `<wr-card wrSpotlight style="--wr-spotlight-color: var(--wr-color-success)">…</wr-card>
<wr-card wrSpotlight style="--wr-spotlight-radius: 120px; --wr-spotlight-ring-radius: 90px">…</wr-card>
<wr-card wrSpotlight style="--wr-spotlight-strength: 30%">…</wr-card>
<wr-card wrSpotlight style="--wr-spotlight-strength: 0%; --wr-spotlight-ring-strength: 100%; --wr-spotlight-ring-radius: 260px">…</wr-card>`,
  };
}
