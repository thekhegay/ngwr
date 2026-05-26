import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrBorderGlow } from 'ngwr/border-glow';

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
  selector: 'ngwr-border-glow-page',
  templateUrl: './border-glow.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrBorderGlow,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class BorderGlowPage {
  protected readonly snippets = {
    install: `import { WrBorderGlow } from 'ngwr/border-glow';`,
    basic: `<wr-border-glow>
  <h3>Hover me</h3>
  <p>The border lights up where the cursor is.</p>
</wr-border-glow>`,
    animated: `<!-- One-shot sweep on mount. -->
<wr-border-glow [animated]="true">
  <p>This card draws attention to itself.</p>
</wr-border-glow>`,
    custom: `<wr-border-glow
  glowColor="320 100 70"
  [colors]="['#f472b6', '#fbbf24', '#34d399']"
  [borderRadius]="20"
  [glowRadius]="60"
  [coneSpread]="35"
>
  …
</wr-border-glow>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'backgroundColor', description: 'Card background fill.', type: 'string', default: "'#120F17'" },
    { name: 'borderRadius', description: 'Corner radius in pixels.', type: 'number', default: '28' },
    {
      name: 'glowRadius',
      description: 'Halo extent in pixels — how far the outer glow reaches past the card edge.',
      type: 'number',
      default: '40',
    },
    {
      name: 'glowIntensity',
      description: 'Halo opacity multiplier (1 = full strength).',
      type: 'number',
      default: '1',
    },
    {
      name: 'coneSpread',
      description: 'Width of the lit cone as a percentage of the perimeter.',
      type: 'number',
      default: '25',
    },
    {
      name: 'edgeSensitivity',
      description: 'How sharply the halo fades as the cursor leaves the edge. Lower = wider falloff.',
      type: 'number',
      default: '30',
    },
    {
      name: 'fillOpacity',
      description: 'Strength of the soft-light interior fill near edges (0..1).',
      type: 'number',
      default: '0.5',
    },
    {
      name: 'glowColor',
      description: 'Halo colour as `"H S L"` (HSL parts, no commas).',
      type: 'string',
      default: "'40 80 80'",
    },
    {
      name: 'colors',
      description: 'Mesh-gradient palette for the visible border slice.',
      type: 'readonly string[]',
      default: "['#c084fc', '#f472b6', '#38bdf8']",
    },
    {
      name: 'animated',
      description: 'Play a one-shot perimeter sweep on mount, then fade out.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
