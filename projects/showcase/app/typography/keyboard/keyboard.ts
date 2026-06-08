import { Component } from '@angular/core';

import { WrKbd } from 'ngwr/keyboard';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-typography-keyboard-page',
  templateUrl: './keyboard.html',
  imports: [
    WrKbd,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TypographyKeyboardPage {
  protected readonly snippets = {
    install: `import { WrKbd } from 'ngwr/keyboard';

@Component({ imports: [WrKbd] })
export class MyComponent {}`,
    basic: `<wr-kbd>⌘</wr-kbd> + <wr-kbd>K</wr-kbd> to search.`,
    sizes: `<wr-kbd size="sm">Esc</wr-kbd>
<wr-kbd size="md">Enter</wr-kbd>
<wr-kbd size="lg">Space</wr-kbd>`,
    prose: `<p wrTypography>
  Press <wr-kbd>⌘</wr-kbd> + <wr-kbd>P</wr-kbd> to open the command palette.
</p>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'size', type: `'sm' | 'md' | 'lg'`, default: `'md'`, description: 'Visual size of the keycap.' },
  ];
}
