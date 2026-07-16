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

// <wr-thing speed="12" />   → 12 (string attribute coerced)
// <wr-thing [speed]="x" />  → x ?? 4`;

  protected readonly whySnippet = `// Angular built-in: NaN fallback leaks into your math.
readonly a = input(0, { transform: numberAttribute }); // 'abc' → NaN

// ngwr: declared fallback.
readonly b = input(4, { transform: numAttr(4) });      // 'abc' → 4`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'numAttr',
      description: 'Returns an input transform that coerces to number with a fallback.',
      type: '(fallback: number) => (value: unknown) => number',
      default: '—',
    },
  ];
}
