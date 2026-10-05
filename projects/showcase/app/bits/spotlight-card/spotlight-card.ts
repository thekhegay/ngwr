import { Component, computed, signal } from '@angular/core';

import { WrSpotlight, WrSpotlightCard } from 'ngwr/bits/spotlight-card';

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
  // Prefilled from the theme's resolved spotlight colour after first
  // render, so the picker shows a working value right away.
  // Empty until the reader picks one, for the reason `aurora` records: the
  // one-shot read froze a ROLE token — `rgba(var(--wr-color-on-surface-rgb),
  // 0.15)` light, `0.22` dark — so a dark card loaded in light got a near-black
  // glow on a near-black surface and the demo looked broken.
  protected readonly spotlightColor = signal('');
  protected readonly radius = signal(80);

  protected readonly snippet = computed(
    () =>
      `<wr-spotlight-card${this.spotlightColor() ? ` spotlightColor="${this.spotlightColor()}"` : ''}>
  <h3>Cursor-tracked spotlight</h3>
  <p>Move the pointer across this card.</p>
</wr-spotlight-card>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'color', label: 'Spotlight Color', signal: this.spotlightColor },
    { kind: 'slider', label: 'Radius (%)', signal: this.radius, min: 30, max: 100, step: 5, unit: '%' },
  ];

  protected readonly snippets = {
    directive: `// Directive variant — same package, drops on any element.
import { WrSpotlight } from 'ngwr/bits/spotlight-card';

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
      name: 'radius',
      description: 'Where the spotlight fades out (% of the gradient).',
      type: 'number',
      default: '80',
    },
    {
      name: 'spotlightColor',
      description:
        'Highlight colour on `<wr-spotlight-card>`. Any CSS colour string. Unset, the theme decides: a dark-ish glow on light surfaces, a light glow on dark.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: '[wrSpotlight]',
      description:
        'Directive variant — writes `--wr-spotlight-x/y` (in `%`) to any host based on pointer position. Pair with a radial-gradient/mask in your CSS.',
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
