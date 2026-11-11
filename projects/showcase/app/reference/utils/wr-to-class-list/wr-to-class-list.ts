import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-to-class-list-page',
  templateUrl: './wr-to-class-list.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrToClassListPage {
  protected readonly snippet = `import { wrToClassList } from 'ngwr/utils';

wrToClassList('p-4 rounded-xl');            // ['p-4', 'rounded-xl']
wrToClassList(['btn', 'p-4 rounded'], 'x'); // ['btn', 'p-4', 'rounded', 'x']
wrToClassList('a', null, false, '  ', 'a'); // ['a']`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrToClassList',
      description: 'Splits on whitespace and de-duplicates. Skips `false`, `null`, `undefined` and empty tokens.',
      type: '(...values: readonly (WrClassInput | false)[]) => string[]',
      default: '—',
    },
  ];
}
