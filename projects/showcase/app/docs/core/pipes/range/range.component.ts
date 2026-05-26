import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrRangePipe } from 'ngwr/pipes';

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
  templateUrl: './range.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrRangePipe, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class RangePipePageComponent {
  protected readonly snippets = {
    install: `import { WrRangePipe } from 'ngwr/pipes';

@Component({ imports: [WrRangePipe] })
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
