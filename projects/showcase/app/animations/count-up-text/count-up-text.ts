import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrCountUpText } from 'ngwr/count-up-text';

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
  selector: 'ngwr-count-up-text-page',
  templateUrl: './count-up-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrCountUpText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class CountUpTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly from = signal(0);
  protected readonly to = signal(2025);
  protected readonly duration = signal(2);
  protected readonly direction = signal<'up' | 'down'>('up');
  protected readonly separator = signal(',');

  protected readonly replayKey = signal(0);

  protected readonly snippet = computed(
    () =>
      `<wr-count-up-text
  [from]="${this.from()}"
  [to]="${this.to()}"
  [duration]="${this.duration()}"
  direction="${this.direction()}"
  separator="${this.separator()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'From', signal: this.from, min: 0, max: 10000, step: 1 },
    { kind: 'slider', label: 'To', signal: this.to, min: 0, max: 1000000, step: 1 },
    {
      kind: 'slider',
      label: 'Duration (s)',
      signal: this.duration,
      min: 0.2,
      max: 6,
      step: 0.1,
      precision: 1,
      unit: 's',
    },
    { kind: 'select', label: 'Direction', signal: this.direction, options: ['up', 'down'] as const },
    { kind: 'text', label: 'Separator', signal: this.separator, placeholder: ',' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrCountUpText } from 'ngwr/count-up-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'to', description: 'Target value.', type: 'number', default: '— (required)', required: true },
    { name: 'from', description: 'Starting value.', type: 'number', default: '0' },
    {
      name: 'direction',
      description: "Direction of count. `'down'` swaps the start/end pair.",
      type: "'up' | 'down'",
      default: "'up'",
    },
    { name: 'delay', description: 'Delay before starting in seconds.', type: 'number', default: '0' },
    {
      name: 'duration',
      description: 'Approximate animation duration in seconds (tunes the spring).',
      type: 'number',
      default: '2',
    },
    {
      name: 'separator',
      description: 'Thousands separator. Empty string disables grouping.',
      type: 'string',
      default: "''",
    },
    { name: 'startWhen', description: 'Start the animation only when `true`.', type: 'boolean', default: 'true' },
    { name: '(started)', description: 'Emits when the animation begins.', type: 'EventEmitter<void>', default: '—' },
    { name: '(ended)', description: 'Emits when the animation settles.', type: 'EventEmitter<void>', default: '—' },
  ];
}
