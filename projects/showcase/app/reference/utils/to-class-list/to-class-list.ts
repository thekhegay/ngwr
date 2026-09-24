import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-to-class-list-page',
  templateUrl: './to-class-list.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ToClassListPage {
  protected readonly snippet = `import { toClassList } from 'ngwr/utils';

toClassList('p-4 rounded-xl');            // ['p-4', 'rounded-xl']
toClassList(['btn', 'p-4 rounded'], 'x'); // ['btn', 'p-4', 'rounded', 'x']
toClassList('a', null, false, '  ', 'a'); // ['a']`;

  protected readonly whySnippet = `// The CDK hands panelClass to classList.add() without splitting it:
//   coerceArray('p-4 rounded')  →  ['p-4 rounded']
//   classList.add('p-4 rounded')  →  InvalidCharacterError
//
// So every ngwr overlay routes its classes through this first.
panelClass: toClassList('wr-select-overlay', asSheet && 'wr-overlay-sheet', this.panelClass());`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'toClassList',
      description:
        'Flattens class inputs into a de-duplicated token array, splitting on whitespace. Accepts false so a call site can inline a condition; skips null, undefined and empty tokens.',
      type: '(...values: readonly (WrClassInput | false)[]) => string[]',
      default: '—',
    },
  ];
}
