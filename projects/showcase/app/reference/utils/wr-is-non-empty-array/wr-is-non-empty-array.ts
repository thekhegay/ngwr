import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-is-non-empty-array-page',
  templateUrl: './wr-is-non-empty-array.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrIsNonEmptyArrayPage {
  protected readonly snippet = `import { wrIsNonEmptyArray } from 'ngwr/utils';

if (wrIsNonEmptyArray(rows)) {
  highlight(rows[0]); // Row, not Row | undefined
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrIsNonEmptyArray(value)',
      description: 'Narrows to `[T, ...T[]]`, so index 0 is not nullable. Accepts a `null` or `undefined` list too.',
      type: '<T>(value: WrMaybe<T[]>) => value is [T, ...T[]]',
      default: '—',
    },
  ];
}
