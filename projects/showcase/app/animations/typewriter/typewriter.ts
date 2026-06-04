import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrTypewriter } from 'ngwr/typewriter';

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
  selector: 'ngwr-typewriter-page',
  templateUrl: './typewriter.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTypewriter,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class TypewriterPage {
  protected readonly texts = signal<readonly string[]>(['design.', 'ship.', 'iterate.']);

  // ── Live demo state ─────────────────────────────────────────────
  protected readonly typingSpeed = signal(50);
  protected readonly deletingSpeed = signal(30);
  protected readonly pauseDuration = signal(2000);
  protected readonly loop = signal(true);
  protected readonly cursorCharacter = signal('|');

  protected readonly snippet = computed(
    () =>
      `<wr-typewriter
  [texts]="['design.', 'ship.', 'iterate.']"
  [typingSpeed]="${this.typingSpeed()}"
  [deletingSpeed]="${this.deletingSpeed()}"
  [pauseDuration]="${this.pauseDuration()}"
  [loop]="${this.loop()}"
  cursorCharacter="${this.cursorCharacter()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Typing Speed (ms)', signal: this.typingSpeed, min: 10, max: 200, step: 5, unit: 'ms' },
    { kind: 'slider', label: 'Deleting Speed (ms)', signal: this.deletingSpeed, min: 5, max: 150, step: 5, unit: 'ms' },
    { kind: 'slider', label: 'Pause (ms)', signal: this.pauseDuration, min: 200, max: 5000, step: 100, unit: 'ms' },
    { kind: 'toggle', label: 'Loop', signal: this.loop },
    { kind: 'text', label: 'Cursor', signal: this.cursorCharacter, placeholder: '|' },
  ];

  protected readonly snippets = {
    install: `import { WrTypewriter } from 'ngwr/typewriter';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'text / texts',
      description: 'A single string or an array to cycle.',
      type: 'string | readonly string[]',
      default: '— (one of them required)',
    },
    { name: 'typingSpeed', description: 'Per-char typing speed in ms.', type: 'number', default: '50' },
    { name: 'initialDelay', description: 'Delay before typing starts, in ms.', type: 'number', default: '0' },
    {
      name: 'pauseDuration',
      description: 'Pause after typing complete, before deleting, in ms.',
      type: 'number',
      default: '2000',
    },
    { name: 'deletingSpeed', description: 'Per-char deletion speed in ms.', type: 'number', default: '30' },
    { name: 'loop', description: 'Loop back to the first string after the last.', type: 'boolean', default: 'true' },
    { name: 'showCursor', description: 'Show the cursor glyph.', type: 'boolean', default: 'true' },
    {
      name: 'hideCursorWhileTyping',
      description: 'Hide the cursor while typing / deleting.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'cursorCharacter', description: 'Cursor glyph.', type: 'string', default: "'|'" },
    { name: 'cursorBlinkDuration', description: 'Cursor blink half-cycle in seconds.', type: 'number', default: '0.5' },
    {
      name: 'textColors',
      description: 'Cycle through these colours per string.',
      type: 'readonly string[]',
      default: '[]',
    },
    {
      name: 'variableSpeed',
      description: 'Randomise typing speed per char between `min` and `max`.',
      type: '{ min: number; max: number }',
      default: '—',
    },
    { name: 'reverseMode', description: 'Type each string backwards.', type: 'boolean', default: 'false' },
    {
      name: 'startOnVisible',
      description: 'Start only after the host enters the viewport.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: '(sentenceComplete)',
      description: 'Emits `{ text, index }` when a string finishes typing.',
      type: 'EventEmitter',
      default: '—',
    },
  ];
}
