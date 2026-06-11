import { Component, computed, signal } from '@angular/core';

import { WrRotatingText } from 'ngwr/rotating-text';

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
  selector: 'ngwr-rotating-text-page',
  templateUrl: './rotating-text.html',
  imports: [
    WrRotatingText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class RotatingTextPage {
  protected readonly texts = signal<readonly string[]>(['design', 'ship', 'iterate']);

  // ── Live demo state ─────────────────────────────────────────────
  protected readonly rotationInterval = signal(2000);
  protected readonly splitBy = signal<'characters' | 'words' | 'lines'>('characters');
  protected readonly duration = signal(0.6);
  protected readonly easing = signal<'cubic-bezier(0.16, 1, 0.3, 1)' | 'ease-out' | 'ease-in-out' | 'linear'>(
    'cubic-bezier(0.16, 1, 0.3, 1)'
  );
  protected readonly staggerDuration = signal(0);
  protected readonly staggerFrom = signal<'first' | 'last' | 'center'>('first');
  protected readonly loop = signal(true);

  protected readonly snippet = computed(
    () =>
      `<wr-rotating-text
  [texts]="['design', 'ship', 'iterate']"
  [rotationInterval]="${this.rotationInterval()}"
  splitBy="${this.splitBy()}"
  [duration]="${this.duration()}"
  easing="${this.easing()}"
  [staggerDuration]="${this.staggerDuration()}"
  staggerFrom="${this.staggerFrom()}"
  [loop]="${this.loop()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    {
      kind: 'slider',
      label: 'Interval (ms)',
      signal: this.rotationInterval,
      min: 500,
      max: 6000,
      step: 100,
      unit: 'ms',
    },
    { kind: 'select', label: 'Split By', signal: this.splitBy, options: ['characters', 'words', 'lines'] as const },
    {
      kind: 'slider',
      label: 'Duration (s)',
      signal: this.duration,
      min: 0.1,
      max: 2,
      step: 0.05,
      precision: 2,
      unit: 's',
    },
    {
      kind: 'select',
      label: 'Easing',
      signal: this.easing,
      options: ['cubic-bezier(0.16, 1, 0.3, 1)', 'ease-out', 'ease-in-out', 'linear'] as const,
    },
    {
      kind: 'slider',
      label: 'Stagger (s)',
      signal: this.staggerDuration,
      min: 0,
      max: 0.2,
      step: 0.01,
      precision: 2,
      unit: 's',
    },
    { kind: 'select', label: 'Stagger From', signal: this.staggerFrom, options: ['first', 'last', 'center'] as const },
    { kind: 'toggle', label: 'Loop', signal: this.loop },
  ];

  protected readonly snippets = {
    install: `import { WrRotatingText } from 'ngwr/rotating-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'texts',
      description: 'Strings to cycle.',
      type: 'readonly string[]',
      default: '— (required)',
      required: true,
    },
    { name: 'rotationInterval', description: 'Auto-advance interval in ms.', type: 'number', default: '2000' },
    {
      name: 'splitBy',
      description: 'Granularity of the split.',
      type: "'characters' | 'words' | 'lines'",
      default: "'characters'",
    },
    { name: 'auto', description: 'Auto-advance on a timer.', type: 'boolean', default: 'true' },
    { name: 'loop', description: 'Loop back to the first string after the last.', type: 'boolean', default: 'true' },
    { name: 'duration', description: 'Per-swap tween duration in seconds.', type: 'number', default: '0.6' },
    {
      name: 'easing',
      description: 'CSS easing of the per-piece tween.',
      type: 'string',
      default: "'cubic-bezier(0.16, 1, 0.3, 1)'",
    },
    { name: 'staggerDuration', description: 'Per-piece stagger in seconds.', type: 'number', default: '0' },
    { name: 'staggerFrom', description: 'Stagger origin.', type: "'first' | 'last' | 'center'", default: "'first'" },
    {
      name: '(nextChange)',
      description: 'Emits with the new index on every rotation.',
      type: 'EventEmitter<number>',
      default: '—',
    },
    {
      name: 'next() / previous() / jumpTo(i) / reset()',
      description: 'Imperative methods on the component instance.',
      type: 'method',
      default: '—',
    },
  ];
}
