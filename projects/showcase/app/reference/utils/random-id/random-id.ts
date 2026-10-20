import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-random-id-page',
  templateUrl: './random-id.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class RandomIdUtilPageComponent {
  protected readonly snippet = `import { randomId } from 'ngwr/utils';

const id = randomId('wr-input');       // 'wr-input-a8f2bx1k9q4z'
const short = randomId('wr-input', 6); // 'wr-input-h7m4k2'`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'randomId(prefix?, length?, random?)',
      description:
        'Random id such as `wr-input-a8f2bx1k9q4z`, safe on the server. `length` is the random part, clamped to `[4, 64]`. `random` replaces the byte source, for a fixed id in tests.',
      type: "(prefix = 'wr', length = 12, random?: (byteLength: number) => Uint8Array) => string",
      default: '—',
    },
  ];
}
