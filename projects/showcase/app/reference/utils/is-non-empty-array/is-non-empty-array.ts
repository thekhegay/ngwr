import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-is-non-empty-array-page',
  templateUrl: './is-non-empty-array.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class IsNonEmptyArrayPage {
  protected readonly snippet = `import { isNonEmptyArray } from 'ngwr/utils';

if (isNonEmptyArray(rows)) {
  highlight(rows[0]); // Row, not Row | undefined
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isNonEmptyArray(value)',
      description: 'Narrows to `[T, ...T[]]`, so index 0 is not nullable. Accepts a `null` or `undefined` list too.',
      type: '<T>(value: Maybe<T[]>) => value is [T, ...T[]]',
      default: '—',
    },
  ];
}
