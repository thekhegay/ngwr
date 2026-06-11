import { Component, computed, signal } from '@angular/core';

import { WrTypography } from 'ngwr/typography';
import { WrWaves } from 'ngwr/waves';

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
  selector: 'ngwr-waves-page',
  templateUrl: './waves.html',
  imports: [
    WrWaves,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class WavesPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly waveAmpX = signal(32);
  protected readonly waveAmpY = signal(16);
  protected readonly xGap = signal(10);
  protected readonly yGap = signal(32);

  protected readonly snippet = computed(
    () =>
      `<section style="position: relative">
  <wr-waves [waveAmpX]="${this.waveAmpX()}" [waveAmpY]="${this.waveAmpY()}" [xGap]="${this.xGap()}" [yGap]="${this.yGap()}" />
  <h1>Content above the waves</h1>
</section>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Amp X', signal: this.waveAmpX, min: 0, max: 80, step: 2 },
    { kind: 'slider', label: 'Amp Y', signal: this.waveAmpY, min: 0, max: 60, step: 2 },
    { kind: 'slider', label: 'X Gap', signal: this.xGap, min: 6, max: 40, step: 1 },
    { kind: 'slider', label: 'Y Gap', signal: this.yGap, min: 12, max: 80, step: 2 },
  ];

  protected readonly snippets = {
    install: `import { WrWaves } from 'ngwr/waves';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'lineColor',
      description: 'Line stroke colour.',
      type: 'string',
      default: 'theme-aware (dark tint on light, white-alpha on dark)',
    },
    { name: 'backgroundColor', description: 'Fill behind the lines.', type: 'string', default: "'transparent'" },
    { name: 'waveSpeedX', description: 'Horizontal noise drift per ms.', type: 'number', default: '0.0125' },
    { name: 'waveSpeedY', description: 'Vertical noise drift per ms.', type: 'number', default: '0.005' },
    { name: 'waveAmpX', description: 'Horizontal wave amplitude (px).', type: 'number', default: '32' },
    { name: 'waveAmpY', description: 'Vertical wave amplitude (px).', type: 'number', default: '16' },
    { name: 'xGap', description: 'Gap between lines (px).', type: 'number', default: '10' },
    { name: 'yGap', description: 'Gap between points on a line (px).', type: 'number', default: '32' },
    { name: 'friction', description: 'Cursor-spring damping, 0..1.', type: 'number', default: '0.925' },
    { name: 'tension', description: 'Cursor-spring pull-back strength.', type: 'number', default: '0.005' },
    { name: 'maxCursorMove', description: 'Max px a point drags from rest.', type: 'number', default: '100' },
  ];
}
