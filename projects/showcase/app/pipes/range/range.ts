import { Component } from '@angular/core';

import { WrRange } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-range-page',
  templateUrl: './range.html',
  imports: [WrRange, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class RangePipePageComponent {
  protected readonly snippets = {
    install: `import { WrRange } from 'ngwr/pipes';

@Component({ imports: [WrRange] })
export class MyComponent { /* ... */ }`,

    usage: `@for (i of (5 | wrRange); track i) {
  <li>Item {{ i + 1 }}</li>
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrRange',
      description: 'Create `[0, 1, …, length - 1]` — useful for `@for` over a fixed count.',
      type: '(length: number) => number[]',
      default: '—',
    },
  ];
}
