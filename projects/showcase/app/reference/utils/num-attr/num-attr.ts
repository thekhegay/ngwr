import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-num-attr-page',
  templateUrl: './num-attr.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class NumAttrPage {
  protected readonly snippet = `import { numAttr } from 'ngwr/utils';

readonly speed = input(4, { transform: numAttr(4) });

// speed="12"     gives 12
// speed="abc"    gives 4
// [speed]="null" gives 4`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'numAttr',
      description: 'Returns an input transform: a number, or `fallback` for `null`, `undefined` and unparsable input.',
      type: '(fallback: number) => (value: unknown) => number',
      default: '—',
    },
  ];
}
