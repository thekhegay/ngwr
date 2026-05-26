import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrDecryptText } from 'ngwr/decrypt-text';

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
  selector: 'ngwr-decrypt-text-page',
  templateUrl: './decrypt-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrDecryptText,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class DecryptTextPage {
  protected readonly snippets = {
    install: `import { WrDecryptText } from 'ngwr/decrypt-text';`,
    hover: `<wr-decrypt-text text="Hover to decrypt!" />`,
    sequentialCenter: `<wr-decrypt-text
  text="Sequential from center"
  [sequential]="true"
  revealDirection="center"
  animateOn="view"
/>`,
    clickToggle: `<wr-decrypt-text
  text="Click to toggle encrypted state"
  animateOn="click"
  clickMode="toggle"
/>`,
    onlyOriginalChars: `<wr-decrypt-text
  text="ONLY ORIGINAL CHARS"
  [sequential]="true"
  [useOriginalCharsOnly]="true"
  animateOn="view"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'text', description: 'Text to reveal.', type: 'string', default: '— (required)', required: true },
    { name: 'speed', description: 'Tick interval in ms.', type: 'number', default: '50' },
    { name: 'maxIterations', description: 'Non-sequential mode only — total scramble ticks before snapping to plain.', type: 'number', default: '10' },
    { name: 'sequential', description: 'Reveal one char per tick instead of scrambling all of them.', type: 'boolean', default: 'false' },
    { name: 'revealDirection', description: 'Order in which chars are revealed in sequential mode.', type: "'start' | 'end' | 'center'", default: "'start'" },
    { name: 'useOriginalCharsOnly', description: 'Scramble using only glyphs present in `text` (minus spaces).', type: 'boolean', default: 'false' },
    { name: 'characters', description: 'Pool of glyphs to scramble through.', type: 'string', default: "'ABC…!@#$…'" },
    { name: 'animateOn', description: 'When to start the animation.', type: "'hover' | 'click' | 'view' | 'inViewHover'", default: "'hover'" },
    { name: 'clickMode', description: "Click behaviour: `'once'` decrypts then stops; `'toggle'` flips state on each click.", type: "'once' | 'toggle'", default: "'once'" },
  ];
}
