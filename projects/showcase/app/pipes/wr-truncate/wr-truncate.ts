import { Component, signal } from '@angular/core';

import { WrTruncate } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-truncate-page',
  templateUrl: './wr-truncate.html',
  imports: [WrTruncate, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class WrTruncatePipePage {
  protected readonly longText = signal('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');

  protected readonly snippets = {
    install: `import { WrTruncate } from 'ngwr/pipes';

@Component({ imports: [WrTruncate] })
export class MyComponent { /* ... */ }`,

    usage: `{{ 'Hello, world' | wrTruncate: 5 }}           <!-- "Hello…"      -->
{{ 'Hello, world' | wrTruncate: 8: '...' }}    <!-- "Hello, w..." -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrTruncate',
      description: 'Clamp string length with optional ellipsis (defaults to "…").',
      type: '(value: string, length = 80, ellipsis = "…") => string',
      default: '—',
    },
  ];
}
