import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-noop-page',
  templateUrl: './noop.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class NoopPage {
  protected readonly snippet = `import { noop } from 'ngwr/utils';

class MyService {
  private onChange: (v: string) => void = noop;
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'noop()',
      description: 'Does nothing. Use it as the default for a callback slot.',
      type: '() => void',
      default: '—',
    },
  ];
}
