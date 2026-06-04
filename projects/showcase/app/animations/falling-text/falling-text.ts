import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrFallingText } from 'ngwr/falling-text';

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
  selector: 'ngwr-falling-text-page',
  templateUrl: './falling-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrFallingText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class FallingTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('Hover this block. Each word falls and you can drag them around.');
  protected readonly trigger = signal<'auto' | 'scroll' | 'hover' | 'click'>('hover');
  protected readonly gravity = signal(980);
  protected readonly fontSize = signal('1.5rem');

  protected readonly replayKey = signal(0);

  protected readonly snippet = computed(
    () =>
      `<wr-falling-text
  text="${this.text()}"
  trigger="${this.trigger()}"
  [gravity]="${this.gravity()}"
  fontSize="${this.fontSize()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Trigger', signal: this.trigger, options: ['auto', 'hover', 'click', 'scroll'] as const },
    { kind: 'slider', label: 'Gravity', signal: this.gravity, min: 100, max: 2000, step: 50 },
    { kind: 'text', label: 'Font Size', signal: this.fontSize, placeholder: '1.5rem' },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text' },
  ];

  protected replay(): void {
    this.replayKey.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrFallingText } from 'ngwr/falling-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'text',
      description: 'Text to render. Words are separated by spaces.',
      type: 'string',
      default: '— (required)',
      required: true,
    },
    {
      name: 'highlightWords',
      description: 'Prefix-match keywords. Matching words get the `wr-falling-text__word--hl` class.',
      type: 'readonly string[]',
      default: '[]',
    },
    {
      name: 'trigger',
      description: 'When to release the words into the simulator.',
      type: "'auto' | 'scroll' | 'hover' | 'click'",
      default: "'auto'",
    },
    { name: 'gravity', description: 'Gravity in pixels/sec².', type: 'number', default: '980' },
    { name: 'fontSize', description: 'Font size as a CSS length.', type: 'string', default: "'1rem'" },
  ];
}
