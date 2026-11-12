import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCopyToClipboard } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-copy-to-clipboard-page',
  templateUrl: './copy-to-clipboard.html',
  imports: [
    WrButton,
    WrCopyToClipboard,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class CopyToClipboardPage {
  protected readonly clipboardText = signal('Hello from ngwr!');
  protected readonly copied = signal<string>('');

  protected onCopied(text: string): void {
    this.copied.set(text);
  }

  protected readonly snippets = {
    usage: `<button [wrCopyToClipboard]="value" (copied)="track($event)">Copy</button>`,
    feedback: `<button [wrCopyToClipboard]="value">Copy</button>

<!-- A toast instead of the tooltip -->
<button [wrCopyToClipboard]="rows" wrCopyToClipboardToast copiedLabel="Copied to clipboard">Copy all</button>`,
    exportAs: `<code [wrCopyToClipboard]="value" #snippet="wrCopyToClipboard">{{ value }}</code>

<!-- Anywhere else in the same template -->
<wr-btn (click)="snippet.copy()">Copy</wr-btn>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrCopyToClipboard]',
      description: 'The string copied on host click. Required.',
      type: 'string',
      required: true,
    },
    {
      name: '[wrCopyToClipboardToast]',
      description: 'Confirm a copy with a toast instead of the tooltip and the announcement.',
      type: 'boolean',
      default: 'false',
      sub: true,
    },
    {
      name: '[copiedLabel]',
      description:
        'Text of the tooltip, the announcement and the toast. Falls back to `copyToClipboard.copied`, then `Copied`.',
      type: 'string | null',
      default: 'null',
      sub: true,
    },
    {
      name: '(copied)',
      description: 'The text that reached the clipboard.',
      type: 'string',
      default: '—',
      sub: true,
    },
    {
      name: '(copyFailed)',
      description: 'What the write threw, such as a denied permission.',
      type: 'unknown',
      default: '—',
      sub: true,
    },
    {
      name: 'copy()',
      description: 'What a click does: the outputs fire, and it resolves with whether the text reached the clipboard.',
      type: '() => Promise<boolean>',
    },
    {
      name: '.wr-copy-to-clipboard--copied',
      description: 'On the host for 1.5 s after a successful copy.',
      type: 'class',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-copy-value',
      url: ['/reference/components', 'copy-value'],
      description: 'A value with its own copy button.',
    },
    {
      kind: 'Service',
      title: 'WrClipboard',
      url: ['/reference/services', 'clipboard'],
      description: 'Copy from code.',
    },
  ];
}
