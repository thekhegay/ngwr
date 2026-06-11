import { Component, ElementRef, afterNextRender, computed, signal, viewChild } from '@angular/core';

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
  // Prefilled from the theme's resolved `--wr-aurora-stop-*` defaults
  // after first render, so the pickers show working colours right away.
  protected readonly stopA = signal('');
  protected readonly stopB = signal('');
  protected readonly stopC = signal('');

  private readonly auroraRef = viewChild(WrAurora, { read: ElementRef });

  constructor() {
    afterNextRender(() => {
      const el = this.auroraRef()?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      const style = getComputedStyle(el);
      this.stopA.set(style.getPropertyValue('--wr-aurora-stop-1').trim() || '#5227ff');
      this.stopB.set(style.getPropertyValue('--wr-aurora-stop-2').trim() || '#7cff67');
      this.stopC.set(style.getPropertyValue('--wr-aurora-stop-3').trim() || '#5227ff');
    });
  }
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
    install: `import { WrAurora } from 'ngwr/aurora';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'colorStops',
      description: 'Exactly three colour stops, ramped left → right.',
      type: 'readonly string[]',
      default: 'theme-aware (deep violet/emerald on light, neon on dark)',
    },
    { name: 'amplitude', description: 'Wave height multiplier.', type: 'number', default: '1' },
    { name: 'blend', description: "Softness of the aurora's lower edge, 0..1.", type: 'number', default: '0.5' },
    { name: 'speed', description: 'Time multiplier.', type: 'number', default: '1' },
  ];
}
