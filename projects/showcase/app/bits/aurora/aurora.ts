import { Component, computed, signal } from '@angular/core';

import { WrAurora } from 'ngwr/bits/aurora';

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
  // Live demo state.
  //
  // Deliberately EMPTY until the reader picks one. Prefilling them from the
  // resolved `--wr-aurora-stop-*` read in a one-shot `afterNextRender` froze
  // the palette at whatever the theme was on load: the stops genuinely differ
  // per theme, so a page opened in light and toggled to dark kept the light
  // triple, and the printed snippet then advertised that frozen triple as the
  // thing to paste. Empty means `[colorStops]` stays `null`, the component
  // resolves its own hook, and the demo follows the theme — which is also the
  // better demo, because it shows the hook working.
  protected readonly stopA = signal('');
  protected readonly stopB = signal('');
  protected readonly stopC = signal('');

  protected readonly amplitude = signal(1);
  protected readonly blend = signal(0.5);
  protected readonly speed = signal(1);

  protected readonly colorStops = computed<readonly string[] | null>(() =>
    this.stopA() && this.stopB() && this.stopC() ? [this.stopA(), this.stopB(), this.stopC()] : null
  );

  protected readonly snippet = computed(
    () =>
      `<wr-aurora${
        this.colorStops() ? `\n  [colorStops]="['${this.stopA()}', '${this.stopB()}', '${this.stopC()}']"` : ''
      }
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
    install: `import { WrAurora } from 'ngwr/bits/aurora';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'colorStops',
      description:
        'Exactly three colour stops, ramped left → right. Unset, the theme decides: deep violet/emerald on light, the neon reactbits palette on dark.',
      type: 'readonly string[] | null',
      default: 'null',
    },
    { name: 'amplitude', description: 'Wave height multiplier.', type: 'number', default: '1' },
    { name: 'blend', description: "Softness of the aurora's lower edge, 0..1.", type: 'number', default: '0.5' },
    { name: 'speed', description: 'Time multiplier.', type: 'number', default: '1' },
  ];
}
