import { Component, computed, signal } from '@angular/core';

import { WrTruncate } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-truncate-page',
  templateUrl: './wr-truncate.html',
  imports: [
    WrTruncate,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
  ],
})
export default class WrTruncatePipePage {
  protected readonly longText = signal('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');

  protected readonly text = signal('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
  protected readonly length = signal(24);
  protected readonly ellipsis = signal('…');

  protected readonly playgroundSnippet = computed(
    () => `{{ text | wrTruncate: ${this.length()} : '${this.ellipsis()}' }}`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'text', label: 'Text', signal: this.text },
    { kind: 'slider', label: 'Length', signal: this.length, min: 4, max: 80 },
    { kind: 'text', label: 'Ellipsis', signal: this.ellipsis, placeholder: '…' },
  ];

  protected readonly snippets = {
    install: `import { WrTruncate } from 'ngwr/pipes';

@Component({ imports: [WrTruncate] })
export class MyComponent { /* ... */ }`,
    basic: `{{ longText | wrTruncate: 24 }}  <!-- "Lorem ipsum dolor sit a…" -->`,
    ellipsis: `{{ longText | wrTruncate: 24 : ' [more]' }}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrTruncate',
      description: 'Clamp string length with optional ellipsis.',
      type: "(value: string, length = 80, ellipsis = '…') => string",
      default: '—',
    },
  ];
}
