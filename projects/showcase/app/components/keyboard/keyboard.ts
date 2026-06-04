import { Component } from '@angular/core';

import { WrKbd } from 'ngwr/keyboard';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-keyboard-page',
  templateUrl: './keyboard.html',
  imports: [WrKbd, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class KeyboardPageComponent {
  protected readonly snippets = {
    install: `import { WrKbd } from 'ngwr/keyboard';

@Component({ imports: [WrKbd] })
export class MyComponent {}`,
    basic: `<wr-kbd>⌘</wr-kbd> + <wr-kbd>K</wr-kbd>`,
    sizes: `<wr-kbd size="sm">Esc</wr-kbd>
<wr-kbd size="md">Enter</wr-kbd>
<wr-kbd size="lg">⌫</wr-kbd>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'size',
      type: `'sm' | 'md' | 'lg'`,
      default: `'md'`,
      description: 'Visual size variant.',
    },
  ];
}
