import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrFallingText } from 'ngwr/falling-text';

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
  selector: 'ngwr-falling-text-page',
  templateUrl: './falling-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrFallingText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class FallingTextPage {
  protected readonly snippets = {
    install: `import { WrFallingText } from 'ngwr/falling-text';`,
    hover: `<wr-falling-text
  text="Hover this block. Each word falls and you can drag them around."
  [highlightWords]="['Hover', 'drag']"
  trigger="hover"
  fontSize="1.5rem"
/>`,
    auto: `<wr-falling-text
  text="ngwr ships an in-house physics simulator — gravity, walls, body collision, cursor drag, all dependency-free."
  [highlightWords]="['ngwr', 'physics']"
  trigger="auto"
  [gravity]="600"
  fontSize="1.125rem"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to render. Words are separated by spaces.', type: 'string', default: '— (required)', required: true },
    { name: 'highlightWords', description: 'Prefix-match keywords. Matching words get the `wr-falling-text__word--hl` class.', type: 'readonly string[]', default: '[]' },
    { name: 'trigger', description: 'When to release the words into the simulator.', type: "'auto' | 'scroll' | 'hover' | 'click'", default: "'auto'" },
    { name: 'gravity', description: 'Gravity in pixels/sec².', type: 'number', default: '980' },
    { name: 'fontSize', description: 'Font size as a CSS length.', type: 'string', default: "'1rem'" },
  ];
}
