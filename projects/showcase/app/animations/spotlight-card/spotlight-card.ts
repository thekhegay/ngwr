import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrSpotlightCard } from 'ngwr/spotlight-card';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-spotlight-card-page',
  templateUrl: './spotlight-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrSpotlightCard,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class SpotlightCardPage {
  protected readonly snippets = {
    install: `import { WrSpotlightCard } from 'ngwr/spotlight-card';`,
    basic: `<wr-spotlight-card>
  <h3>Cursor-tracked spotlight</h3>
  <p>Move the pointer across this card.</p>
</wr-spotlight-card>`,
    color: `<wr-spotlight-card spotlightColor="rgba(120, 180, 255, 0.35)">
  <h3>Blue spotlight</h3>
  <p>Pass any CSS colour.</p>
</wr-spotlight-card>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'spotlightColor',
      description: 'Highlight colour. Any CSS colour string (rgba, hsl, named, …).',
      type: 'string',
      default: "'rgba(255, 255, 255, 0.25)'",
    },
  ];
}
