import { Component, computed, signal } from '@angular/core';

import { WrSplitText } from 'ngwr/split-text';

import {
  type DocApiRow,
  type DocControl,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-split-text-page',
  templateUrl: './split-text.html',
  imports: [
    WrSplitText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class SplitTextPage {
  // Live demo state
  protected readonly text = signal('Hello, ngwr!');
  protected readonly splitType = signal<'chars' | 'words'>('chars');
  protected readonly delay = signal(40);
  protected readonly duration = signal(1.2);

  /** Replayable key — bump it to remount and re-trigger the animation. */
  protected readonly replayKey = signal(0);

  /** Live snippet that reflects the current control values. */
  protected readonly snippet = computed(
    () =>
      `<wr-split-text
  text="${this.text()}"
  splitType="${this.splitType()}"
  [delay]="${this.delay()}"
  [duration]="${this.duration()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Split Type', signal: this.splitType, options: ['chars', 'words'] as const },
    { kind: 'slider', label: 'Stagger Delay (ms)', signal: this.delay, min: 0, max: 200, step: 5 },
    {
      kind: 'slider',
      label: 'Duration (s)',
      signal: this.duration,
      min: 0.2,
      max: 3,
      step: 0.1,
      precision: 1,
      unit: 's',
    },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text to animate' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrSplitText } from 'ngwr/split-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to animate.', type: 'string', default: '— (required)', required: true },
    { name: 'splitType', description: 'Split granularity.', type: "'chars' | 'words'", default: "'chars'" },
    { name: 'delay', description: 'Stagger delay between pieces in ms.', type: 'number', default: '50' },
    { name: 'duration', description: 'Animation duration in seconds.', type: 'number', default: '1.25' },
    {
      name: 'easing',
      description: 'CSS easing function.',
      type: 'string',
      default: "'cubic-bezier(0.16, 1, 0.3, 1)' (~power3.out)",
    },
    {
      name: 'from',
      description: 'Start state for each piece. Properties: `opacity`, `x`, `y` (px), `scale`, `rotate` (deg).',
      type: 'WrSplitTextMotion',
      default: '{ opacity: 0, y: 40 }',
    },
    {
      name: 'to',
      description: 'End state for each piece. Same shape as `from`.',
      type: 'WrSplitTextMotion',
      default: '{ opacity: 1, y: 0 }',
    },
    { name: 'threshold', description: 'IntersectionObserver threshold (0..1).', type: 'number', default: '0.1' },
    { name: 'rootMargin', description: 'IntersectionObserver rootMargin.', type: 'string', default: "'-100px'" },
    {
      name: 'textAlign',
      description: 'Text alignment on the host.',
      type: "'left' | 'center' | 'right' | 'justify'",
      default: "'center'",
    },
    {
      name: '(animationComplete)',
      description: 'Emitted once all pieces finish animating.',
      type: 'EventEmitter<void>',
      default: '—',
    },
  ];
}
