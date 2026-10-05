import { Component, signal } from '@angular/core';

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
    usage: `<button [wrCopyToClipboard]="value" (copied)="toast('Copied!')">Copy</button>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrCopyToClipboard]',
      description: 'The string copied on host click. Required.',
      type: 'string',
      required: true,
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
      description:
        'What the write threw — a permissions refusal, an insecure origin, or a clipboard the browser would not give. The page leans on this one in prose and never tabulated it.',
      type: 'unknown',
      default: '—',
      sub: true,
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrClipboard',
      url: ['/reference/services', 'clipboard'],
      description: "Programmatic read + write API — what to reach for when you don't want a host-click directive.",
    },
  ];
}
