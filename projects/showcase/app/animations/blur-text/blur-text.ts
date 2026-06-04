import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrBlurText } from 'ngwr/blur-text';

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
  selector: 'ngwr-blur-text-page',
  templateUrl: './blur-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrBlurText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class BlurTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('Welcome to ngwr');
  protected readonly animateBy = signal<'chars' | 'words'>('words');
  protected readonly direction = signal<'top' | 'bottom'>('top');
  protected readonly delay = signal(200);
  protected readonly stepDuration = signal(0.35);

  protected readonly replayKey = signal(0);

  protected readonly snippet = computed(
    () =>
      `<wr-blur-text
  text="${this.text()}"
  animateBy="${this.animateBy()}"
  direction="${this.direction()}"
  [delay]="${this.delay()}"
  [stepDuration]="${this.stepDuration()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Animate By', signal: this.animateBy, options: ['words', 'chars'] as const },
    { kind: 'select', label: 'Direction', signal: this.direction, options: ['top', 'bottom'] as const },
    { kind: 'slider', label: 'Delay (ms)', signal: this.delay, min: 0, max: 500, step: 10, unit: 'ms' },
    {
      kind: 'slider',
      label: 'Step Duration (s)',
      signal: this.stepDuration,
      min: 0.1,
      max: 1.5,
      step: 0.05,
      precision: 2,
      unit: 's',
    },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text to animate' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrBlurText } from 'ngwr/blur-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to animate.', type: 'string', default: '— (required)', required: true },
    { name: 'animateBy', description: 'Split granularity.', type: "'chars' | 'words'", default: "'words'" },
    {
      name: 'direction',
      description: "Entry direction: `'top'` slides down into place, `'bottom'` slides up.",
      type: "'top' | 'bottom'",
      default: "'top'",
    },
    { name: 'delay', description: 'Per-piece stagger in ms.', type: 'number', default: '200' },
    {
      name: 'stepDuration',
      description: 'Duration of each keyframe step in seconds (total = 2 × stepDuration).',
      type: 'number',
      default: '0.35',
    },
    { name: 'easing', description: 'CSS easing function.', type: 'string', default: "'linear'" },
    { name: 'threshold', description: 'IntersectionObserver threshold (0..1).', type: 'number', default: '0.1' },
    { name: 'rootMargin', description: 'IntersectionObserver rootMargin.', type: 'string', default: "'0px'" },
    {
      name: '(animationComplete)',
      description: 'Emitted once all pieces finish animating.',
      type: 'EventEmitter<void>',
      default: '—',
    },
  ];
}
