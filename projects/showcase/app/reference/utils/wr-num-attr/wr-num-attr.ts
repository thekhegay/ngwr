import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-num-attr-page',
  templateUrl: './wr-num-attr.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrNumAttrPage {
  protected readonly snippet = `import { wrNumAttr } from 'ngwr/utils';

readonly speed = input(4, { transform: wrNumAttr(4) });

// speed="12"     gives 12
// speed="abc"    gives 4
// [speed]="null" gives 4`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrNumAttr',
      description: 'Returns an input transform: a number, or `fallback` for `null`, `undefined` and unparsable input.',
      type: '(fallback: number) => (value: unknown) => number',
      default: '—',
    },
  ];
}
