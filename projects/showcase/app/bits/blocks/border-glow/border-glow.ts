import { Component, computed, signal } from '@angular/core';

import { WrBorderGlow } from 'ngwr/bits/border-glow';

import {
  DocApiComponent,
  type DocApiRow,
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
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class BorderGlowPage {
  // Live demo state
  // Empty = theme-aware default; the picker writes a hex, which `glowColor` takes as is.
  protected readonly glowColor = signal('');
  protected readonly borderRadius = signal(28);
  protected readonly glowRadius = signal(40);
  protected readonly coneSpread = signal(25);
  protected readonly glowIntensity = signal(1);
  protected readonly animated = signal(false);
  protected readonly loop = signal(false);
  protected readonly speed = signal(6);

  protected readonly snippet = computed(
    () =>
      `<wr-border-glow${this.glowColor() ? `\n  glowColor="${this.glowColor()}"` : ''}
  [borderRadius]="${this.borderRadius()}"
  [glowRadius]="${this.glowRadius()}"
  [coneSpread]="${this.coneSpread()}"
  [glowIntensity]="${this.glowIntensity()}"
  [animated]="${this.animated()}"
  [loop]="${this.loop()}"${this.loop() ? `\n  [speed]="${this.speed()}"` : ''}
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
    { kind: 'toggle', label: 'Loop', signal: this.loop },
    { kind: 'slider', label: 'Speed (s)', signal: this.speed, min: 1, max: 12, step: 0.5, precision: 1, unit: 's' },
    { kind: 'color', label: 'Glow Color', signal: this.glowColor, alpha: false },
  ];

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'backgroundColor',
      description: 'Card fill. Unset, it uses the theme surface.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'borderRadius', description: 'Corner radius in pixels.', type: 'number', default: '28' },
    {
      name: 'glowRadius',
      description: 'How far the glow reaches past the edge, in px.',
      type: 'number',
      default: '40',
    },
    {
      name: 'glowIntensity',
      description: 'Glow opacity multiplier. Does nothing without a `glowColor`.',
      type: 'number',
      default: '1',
    },
    {
      name: 'coneSpread',
      description: 'Width of the lit part, as a % of the perimeter.',
      type: 'number',
      default: '25',
    },
    {
      name: 'edgeSensitivity',
      description: 'How fast the glow fades away from the edge. Lower is wider.',
      type: 'number',
      default: '30',
    },
    {
      name: 'fillOpacity',
      description: 'Strength of the inner fill near the edges, 0..1.',
      type: 'number',
      default: '0.5',
    },
    {
      name: 'glowColor',
      description: 'Glow colour: any CSS colour, or `"H S L"` parts. Unset, it follows the theme.',
      type: 'string | null',
      default: 'null',
    },
    {
      name: 'colors',
      description: 'Gradient colours of the lit border. Unset, they follow the theme.',
      type: 'readonly string[] | null',
      default: 'null',
    },
    {
      name: 'animated',
      description: 'Sweep the border once on mount.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'loop',
      description: 'Circle the border for ever, edge lit. Replaces `animated`; still under reduced motion.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'speed', description: 'Seconds per lap while `loop` is on.', type: 'number', default: '6' },
  ];
}
