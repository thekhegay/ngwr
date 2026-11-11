import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-is-defined-page',
  templateUrl: './wr-is-defined.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrIsDefinedPage {
  protected readonly snippet = `import { wrIsDefined } from 'ngwr/utils';

const items: (string | null | undefined)[] = ['a', null, 'b', undefined];
const present = items.filter(wrIsDefined); // string[]`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrIsDefined(v)',
      description: 'Narrows out `null` and `undefined`. Pass it straight to `Array.filter`.',
      type: '<T>(v: T | null | undefined) => v is T',
      default: '—',
    },
  ];
}
