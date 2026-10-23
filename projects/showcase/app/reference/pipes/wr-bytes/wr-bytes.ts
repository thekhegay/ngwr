import { Component, computed, signal } from '@angular/core';

import { WrBytes } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-bytes-page',
  templateUrl: './wr-bytes.html',
  imports: [
    WrBytes,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrBytesPipePage {
  protected readonly bytes = signal(1234567);
  protected readonly decimals = signal(1);

  protected readonly playgroundSnippet = computed(() => `{{ ${this.bytes()} | wrBytes: ${this.decimals()} }}`);

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Bytes', signal: this.bytes, min: 0, max: 2147483648, step: 1048576 },
    { kind: 'slider', label: 'Decimals', signal: this.decimals, min: 0, max: 3 },
  ];

  protected readonly snippets = {
    basic: `{{ 1234 | wrBytes }}  <!-- "1.2 kB" -->`,
    decimals: `{{ 1234567 | wrBytes: 0 }}  <!-- "1 MB" -->
{{ 1234567 | wrBytes: 2 }}  <!-- "1.18 MB" -->`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrBytes',
      description: 'Formats bytes in 1024-based units. `null`, `undefined` and empty render as an empty string.',
      type: '(value: number | string | null | undefined, decimals = 1) => string',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-file-upload',
      url: ['/reference/components', 'file-upload'],
      description: 'File sizes in a picker.',
    },
    {
      kind: 'Pipe',
      title: 'wrNumber',
      url: ['/reference/pipes', 'wr-number'],
      description: 'Any other number.',
    },
  ];
}
