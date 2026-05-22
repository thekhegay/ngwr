import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrTruncatePipe } from 'ngwr/pipes';

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
  templateUrl: './wr-truncate.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTruncatePipe,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class WrTruncatePipePageComponent {
  protected readonly longText = signal('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');

  protected readonly snippets = {
    install: `import { WrTruncatePipe } from 'ngwr/pipes';

@Component({ imports: [WrTruncatePipe] })
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
