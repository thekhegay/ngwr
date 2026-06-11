import { Component, computed, signal } from '@angular/core';

import { WrAurora } from 'ngwr/aurora';

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
  selector: 'ngwr-aurora-page',
  templateUrl: './aurora.html',
  imports: [
    WrAurora,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class AuroraPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly stopA = signal('#5227ff');
  protected readonly stopB = signal('#7cff67');
  protected readonly stopC = signal('#5227ff');
  protected readonly amplitude = signal(1);
  protected readonly blend = signal(0.5);
  protected readonly speed = signal(1);

  protected readonly colorStops = computed(() => [this.stopA(), this.stopB(), this.stopC()]);

  protected readonly snippet = computed(
    () =>
      `<wr-aurora
  [colorStops]="['${this.stopA()}', '${this.stopB()}', '${this.stopC()}']"
  [amplitude]="${this.amplitude()}"
  [blend]="${this.blend()}"
  [speed]="${this.speed()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'color', label: 'Stop A', signal: this.stopA, alpha: false },
    { kind: 'color', label: 'Stop B', signal: this.stopB, alpha: false },
    { kind: 'color', label: 'Stop C', signal: this.stopC, alpha: false },
    { kind: 'slider', label: 'Amplitude', signal: this.amplitude, min: 0.2, max: 2.5, step: 0.1, precision: 1 },
    { kind: 'slider', label: 'Blend', signal: this.blend, min: 0, max: 1, step: 0.05, precision: 2 },
    { kind: 'slider', label: 'Speed', signal: this.speed, min: 0.1, max: 3, step: 0.1, precision: 1 },
  ];

  protected readonly snippets = {
    install: `import { WrAurora } from 'ngwr/aurora';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'colorStops',
      description: 'Exactly three colour stops, ramped left → right.',
      type: 'readonly string[]',
      default: "['#5227ff', '#7cff67', '#5227ff']",
    },
    { name: 'amplitude', description: 'Wave height multiplier.', type: 'number', default: '1' },
    { name: 'blend', description: "Softness of the aurora's lower edge, 0..1.", type: 'number', default: '0.5' },
    { name: 'speed', description: 'Time multiplier.', type: 'number', default: '1' },
  ];
}
