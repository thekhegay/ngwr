import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrCircularText } from 'ngwr/circular-text';

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
  selector: 'ngwr-circular-text-page',
  templateUrl: './circular-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrCircularText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class CircularTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('HELLO * NGWR * ');
  protected readonly spinDuration = signal(20);
  protected readonly onHover = signal<'speedUp' | 'slowDown' | 'pause' | 'goBonkers'>('speedUp');

  protected readonly snippet = computed(
    () =>
      `<wr-circular-text
  text="${this.text()}"
  [spinDuration]="${this.spinDuration()}"
  onHover="${this.onHover()}"
/>`,
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Spin Duration (s)', signal: this.spinDuration, min: 2, max: 60, step: 1, unit: 's' },
    { kind: 'select', label: 'On Hover', signal: this.onHover, options: ['speedUp', 'slowDown', 'pause', 'goBonkers'] as const },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'TEXT * ' },
  ];

  protected readonly snippets = {
    install: `import { WrCircularText } from 'ngwr/circular-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to lay out around the circle.', type: 'string', default: '— (required)', required: true },
    { name: 'spinDuration', description: 'Seconds per full revolution at rest.', type: 'number', default: '20' },
    { name: 'onHover', description: 'Hover behaviour. `null` disables hover reactivity.', type: "'speedUp' | 'slowDown' | 'pause' | 'goBonkers' | null", default: "'speedUp'" },
  ];
}
