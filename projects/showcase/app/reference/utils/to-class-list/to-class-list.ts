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

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'toClassList',
      description: 'Splits on whitespace and de-duplicates. Skips `false`, `null`, `undefined` and empty tokens.',
      type: '(...values: readonly (WrClassInput | false)[]) => string[]',
      default: '—',
    },
  ];
}
