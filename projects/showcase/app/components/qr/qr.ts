import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { WrQr } from 'ngwr/qr';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-qr-page',
  templateUrl: './qr.html',
  imports: [
    FormsModule,
    WrQr,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class QrComponent {
  protected readonly text = signal('https://ngwr.dev');

  protected readonly snippets = {
    install: `import { WrQr } from 'ngwr/qr';

@Component({ imports: [WrQr] })
export class MyComponent {}`,
    basic: `<wr-qr value="https://ngwr.dev" />`,
    sized: `<wr-qr value="ngwr" [size]="240" level="H" color="#3969e2" />`,
    interactive: `<wr-qr [value]="text()" [size]="200" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'value', description: 'Text or URL to encode.', type: 'string', required: true },
    { name: 'level', description: 'Error correction level.', type: "'L' | 'M' | 'Q' | 'H'", default: "'M'" },
    { name: 'size', description: 'Side length in pixels.', type: 'number', default: '160' },
    { name: 'padding', description: 'Outer quiet-zone padding in pixels.', type: 'number', default: '10' },
    { name: 'color', description: 'Module (dot) color.', type: 'string', default: "'#000000'" },
    { name: 'bgColor', description: 'Background color.', type: 'string', default: "'#ffffff'" },
    {
      name: 'iconUrl',
      description: 'Optional image overlay in the center. Use level="H" when set.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'iconSize', description: 'Center icon size in logical pixels.', type: 'number', default: '42' },
  ];
}
