import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-is-defined-page',
  templateUrl: './is-defined.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class IsDefinedPage {
  protected readonly snippet = `import { isDefined } from 'ngwr/utils';

const items: (string | null | undefined)[] = ['a', null, 'b', undefined];
const present = items.filter(isDefined); // string[]`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'isDefined(v)',
      description: 'Narrows out `null` and `undefined`. Pass it straight to `Array.filter`.',
      type: '<T>(v: T | null | undefined) => v is T',
      default: '—',
    },
  ];
}
