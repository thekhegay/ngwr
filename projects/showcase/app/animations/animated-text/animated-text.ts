import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrAnimatedText } from 'ngwr/animated-text';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-animated-text-page',
  templateUrl: './animated-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrAnimatedText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AnimatedTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('Hello, ngwr!');
  protected readonly mode = signal<'typewriter' | 'scramble' | 'split'>('typewriter');
  protected readonly speed = signal(60);
  protected readonly startDelay = signal(0);
  protected readonly loop = signal(false);

  protected readonly replayKey = signal(0);

  protected readonly snippet = computed(
    () =>
      `<wr-animated-text
  text="${this.text()}"
  mode="${this.mode()}"
  [speed]="${this.speed()}"
  [startDelay]="${this.startDelay()}"
  [loop]="${this.loop()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Mode', signal: this.mode, options: ['typewriter', 'scramble', 'split'] as const },
    { kind: 'slider', label: 'Speed (ms)', signal: this.speed, min: 10, max: 200, step: 5, unit: 'ms' },
    { kind: 'slider', label: 'Start Delay (ms)', signal: this.startDelay, min: 0, max: 1000, step: 50, unit: 'ms' },
    { kind: 'toggle', label: 'Loop', signal: this.loop },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text to animate' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrAnimatedText } from 'ngwr/animated-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Target text.', type: 'string', default: "''" },
    {
      name: 'mode',
      description: 'Animation style.',
      type: "'typewriter' | 'scramble' | 'split'",
      default: "'typewriter'",
    },
    { name: 'speed', description: 'Per-character delay (ms).', type: 'number', default: '60' },
    { name: 'startDelay', description: 'Initial delay before animation starts (ms).', type: 'number', default: '0' },
    { name: 'loop', description: 'Loop the animation forever.', type: 'boolean', default: 'false' },
  ];
}
