import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrSpotlight, WrSpotlightCard } from 'ngwr/spotlight-card';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
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
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class SpotlightCardPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly spotlightColor = signal('rgba(255, 255, 255, 0.25)');

  protected readonly snippet = computed(
    () =>
      `<wr-spotlight-card spotlightColor="${this.spotlightColor()}">
  <h3>Cursor-tracked spotlight</h3>
  <p>Move the pointer across this card.</p>
</wr-spotlight-card>`,
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'text', label: 'Spotlight Color', signal: this.spotlightColor, placeholder: 'CSS colour' },
  ];

  protected readonly snippets = {
    install: `import { WrSpotlightCard } from 'ngwr/spotlight-card';`,
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
