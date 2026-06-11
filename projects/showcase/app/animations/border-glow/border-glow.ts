import { Component, computed, signal } from '@angular/core';

import { WrBorderGlow } from 'ngwr/border-glow';
import { parseHex, rgbToHsl } from 'ngwr/color-picker';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-border-glow-page',
  templateUrl: './border-glow.html',
  imports: [
    WrBorderGlow,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class BorderGlowPage {
  // ── Live demo state ─────────────────────────────────────────────
  /** Hex form drives the color picker; an `hslColor` computed feeds wr-border-glow. */
  protected readonly glowColorHex = signal('#ebcc66');
  protected readonly borderRadius = signal(28);
  protected readonly glowRadius = signal(40);
  protected readonly coneSpread = signal(25);
  protected readonly glowIntensity = signal(1);
  protected readonly animated = signal(false);

  /** Hex → "H S L" string in the format `wr-border-glow` expects. */
  protected readonly glowColorHsl = computed(() => {
    const rgb = parseHex(this.glowColorHex());
    if (!rgb) return '40 80 80';
    const { h, s, l } = rgbToHsl(rgb);
    return `${Math.round(h)} ${Math.round(s * 100)} ${Math.round(l * 100)}`;
  });

  protected readonly snippet = computed(
    () =>
      `<wr-border-glow
  glowColor="${this.glowColorHsl()}"
  [borderRadius]="${this.borderRadius()}"
  [glowRadius]="${this.glowRadius()}"
  [coneSpread]="${this.coneSpread()}"
  [glowIntensity]="${this.glowIntensity()}"
  [animated]="${this.animated()}"
>
  …
</wr-border-glow>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Border Radius (px)', signal: this.borderRadius, min: 0, max: 60, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Glow Radius (px)', signal: this.glowRadius, min: 10, max: 120, step: 1, unit: 'px' },
    { kind: 'slider', label: 'Cone Spread (%)', signal: this.coneSpread, min: 5, max: 60, step: 1, unit: '%' },
    { kind: 'slider', label: 'Glow Intensity', signal: this.glowIntensity, min: 0, max: 2, step: 0.1, precision: 1 },
    { kind: 'toggle', label: 'Animated', signal: this.animated },
    { kind: 'color', label: 'Glow Color', signal: this.glowColorHex, alpha: false },
  ];

  protected readonly snippets = {
    install: `import { WrBorderGlow } from 'ngwr/border-glow';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'backgroundColor', description: 'Card background fill.', type: 'string', default: 'theme surface token' },
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
      default: 'theme-aware (deep amber on light, pale on dark)',
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
