import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrTypewriter } from 'ngwr/typewriter';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
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
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class TypewriterPage {
  protected readonly snippets = {
    install: `import { WrTypewriter } from 'ngwr/typewriter';`,
    basic: `<wr-typewriter [texts]="['design.', 'ship.', 'iterate.']" />`,
    single: `<wr-typewriter
  text="Hello, ngwr."
  [loop]="false"
  [typingSpeed]="40"
  cursorCharacter="▎"
/>`,
    variable: `<wr-typewriter
  [texts]="['Some text types fast.', 'Some types slow.', 'Some in between.']"
  [variableSpeed]="{ min: 20, max: 120 }"
  [pauseDuration]="1200"
/>`,
    colors: `<wr-typewriter
  [texts]="['React', 'Vue', 'Angular', 'Svelte']"
  [textColors]="['#06b6d4', '#10b981', '#dc2626', '#f59e0b']"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text / texts', description: 'A single string or an array to cycle.', type: 'string | readonly string[]', default: '— (one of them required)' },
    { name: 'typingSpeed', description: 'Per-char typing speed in ms.', type: 'number', default: '50' },
    { name: 'initialDelay', description: 'Delay before typing starts, in ms.', type: 'number', default: '0' },
    { name: 'pauseDuration', description: 'Pause after typing complete, before deleting, in ms.', type: 'number', default: '2000' },
    { name: 'deletingSpeed', description: 'Per-char deletion speed in ms.', type: 'number', default: '30' },
    { name: 'loop', description: 'Loop back to the first string after the last.', type: 'boolean', default: 'true' },
    { name: 'showCursor', description: 'Show the cursor glyph.', type: 'boolean', default: 'true' },
    { name: 'hideCursorWhileTyping', description: 'Hide the cursor while typing / deleting.', type: 'boolean', default: 'false' },
    { name: 'cursorCharacter', description: 'Cursor glyph.', type: 'string', default: "'|'" },
    { name: 'cursorBlinkDuration', description: 'Cursor blink half-cycle in seconds.', type: 'number', default: '0.5' },
    { name: 'textColors', description: 'Cycle through these colours per string.', type: 'readonly string[]', default: '[]' },
    { name: 'variableSpeed', description: 'Randomise typing speed per char between `min` and `max`.', type: '{ min: number; max: number }', default: '—' },
    { name: 'reverseMode', description: 'Type each string backwards.', type: 'boolean', default: 'false' },
    { name: 'startOnVisible', description: 'Start only after the host enters the viewport.', type: 'boolean', default: 'false' },
    { name: '(sentenceComplete)', description: 'Emits `{ text, index }` when a string finishes typing.', type: 'EventEmitter', default: '—' },
  ];
}
