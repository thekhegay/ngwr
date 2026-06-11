import { Component, computed, signal } from '@angular/core';

import { WrStarBorder } from 'ngwr/star-border';

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
  selector: 'ngwr-star-border-page',
  templateUrl: './star-border.html',
  imports: [
    WrStarBorder,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class StarBorderPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly mode = signal<'infinite' | 'hover'>('infinite');
  protected readonly rays = signal<'mirror' | 'single'>('mirror');
  protected readonly speed = signal(6);

  protected readonly snippet = computed(
    () => `<wr-star-border mode="${this.mode()}" rays="${this.rays()}" [speed]="${this.speed()}">
  Star border
</wr-star-border>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Mode', signal: this.mode, options: ['infinite', 'hover'] as const },
    { kind: 'select', label: 'Rays', signal: this.rays, options: ['mirror', 'single'] as const },
    { kind: 'slider', label: 'Speed (s)', signal: this.speed, min: 1, max: 12, step: 0.5, precision: 1, unit: 's' },
  ];

  protected readonly snippets = {
    install: `import { WrStarBorder } from 'ngwr/star-border';`,
    button: `<button wr-star-border mode="hover" rays="single" type="button">
  Hover me
</button>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'color',
      description: 'Ray colour.',
      type: 'string',
      default: 'theme-aware (primary on light, white on dark)',
    },
    { name: 'speed', description: 'Seconds per ray sweep.', type: 'number', default: '6' },
    { name: 'thickness', description: 'Vertical ray bleed past the panel (px).', type: 'number', default: '1' },
    {
      name: 'mode',
      description: 'Always animating, or only on hover.',
      type: "'infinite' | 'hover'",
      default: "'infinite'",
    },
    {
      name: 'rays',
      description: 'Rays along both edges, or just the bottom.',
      type: "'mirror' | 'single'",
      default: "'mirror'",
    },
  ];
}
