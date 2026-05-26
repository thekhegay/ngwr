import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrBytes } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-bytes-page',
  templateUrl: './wr-bytes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrBytes, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class WrBytesPipePage {
  protected readonly bytes = signal(1234567);

  protected readonly snippets = {
    install: `import { WrBytes } from 'ngwr/pipes';

@Component({ imports: [WrBytes] })
export class MyComponent { /* ... */ }`,

    usage: `{{ 1234     | wrBytes }}     <!-- "1.2 KB"   -->
{{ 1234567  | wrBytes: 0 }}  <!-- "1 MB"     -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrBytes',
      description: 'Humanise byte counts using binary (1024-based) units.',
      type: '(value: number, decimals = 1) => string',
      default: '—',
    },
  ];
}
