import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-noop-page',
  templateUrl: './wr-noop.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrNoopPage {
  protected readonly snippet = `import { wrNoop } from 'ngwr/utils';

class MyService {
  private onChange: (v: string) => void = wrNoop;
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrNoop()',
      description: 'Does nothing. Use it as the default for a callback slot.',
      type: '() => void',
      default: '—',
    },
  ];
}
