import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrDecryptText } from 'ngwr/decrypt-text';

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
  selector: 'ngwr-decrypt-text-page',
  templateUrl: './decrypt-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrDecryptText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class DecryptTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('Hover to decrypt!');
  protected readonly speed = signal(50);
  protected readonly sequential = signal(false);
  protected readonly revealDirection = signal<'start' | 'end' | 'center'>('start');
  protected readonly animateOn = signal<'hover' | 'click' | 'view' | 'inViewHover'>('hover');
  protected readonly useOriginalCharsOnly = signal(false);

  protected readonly replayKey = signal(0);

  protected readonly snippet = computed(
    () =>
      `<wr-decrypt-text
  text="${this.text()}"
  [speed]="${this.speed()}"
  [sequential]="${this.sequential()}"
  revealDirection="${this.revealDirection()}"
  animateOn="${this.animateOn()}"
  [useOriginalCharsOnly]="${this.useOriginalCharsOnly()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    {
      kind: 'select',
      label: 'Animate On',
      signal: this.animateOn,
      options: ['hover', 'click', 'view', 'inViewHover'] as const,
    },
    { kind: 'slider', label: 'Speed (ms)', signal: this.speed, min: 10, max: 200, step: 5, unit: 'ms' },
    { kind: 'toggle', label: 'Sequential', signal: this.sequential },
    {
      kind: 'select',
      label: 'Reveal Direction',
      signal: this.revealDirection,
      options: ['start', 'end', 'center'] as const,
    },
    { kind: 'toggle', label: 'Original Chars Only', signal: this.useOriginalCharsOnly },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrDecryptText } from 'ngwr/decrypt-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to reveal.', type: 'string', default: '— (required)', required: true },
    { name: 'speed', description: 'Tick interval in ms.', type: 'number', default: '50' },
    {
      name: 'maxIterations',
      description: 'Non-sequential mode only — total scramble ticks before snapping to plain.',
      type: 'number',
      default: '10',
    },
    {
      name: 'sequential',
      description: 'Reveal one char per tick instead of scrambling all of them.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'revealDirection',
      description: 'Order in which chars are revealed in sequential mode.',
      type: "'start' | 'end' | 'center'",
      default: "'start'",
    },
    {
      name: 'useOriginalCharsOnly',
      description: 'Scramble using only glyphs present in `text` (minus spaces).',
      type: 'boolean',
      default: 'false',
    },
    { name: 'characters', description: 'Pool of glyphs to scramble through.', type: 'string', default: "'ABC…!@#$…'" },
    {
      name: 'animateOn',
      description: 'When to start the animation.',
      type: "'hover' | 'click' | 'view' | 'inViewHover'",
      default: "'hover'",
    },
    {
      name: 'clickMode',
      description: "Click behaviour: `'once'` decrypts then stops; `'toggle'` flips state on each click.",
      type: "'once' | 'toggle'",
      default: "'once'",
    },
  ];
}
