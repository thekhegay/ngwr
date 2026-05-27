import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrSpotlight, WrSpotlightCard } from 'ngwr/spotlight-card';

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
    WrSpotlight,
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
    directive: `// Directive variant — same package, drops on any element.
import { WrSpotlight } from 'ngwr/spotlight-card';

<div wrSpotlight class="card">…</div>

// Then in your CSS:
// background: radial-gradient(
//   400px circle at var(--wr-spotlight-x, 50%) var(--wr-spotlight-y, 50%),
//   rgba(var(--wr-color-primary-rgb), 0.15),
//   transparent 60%
// );`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'spotlightColor',
      description: 'Highlight colour on `<wr-spotlight-card>`. Any CSS colour string.',
      type: 'string',
      default: "'rgba(255, 255, 255, 0.25)'",
    },
    {
      name: '[wrSpotlight]',
      description: 'Directive variant — writes `--wr-spotlight-x/y` (in `%`) to any host based on pointer position. Pair with a radial-gradient/mask in your CSS.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrSpotlight].resetX / .resetY',
      description: 'Default coordinates when no pointer is over the host.',
      type: 'string',
      default: "'50%'",
    },
  ];
}
