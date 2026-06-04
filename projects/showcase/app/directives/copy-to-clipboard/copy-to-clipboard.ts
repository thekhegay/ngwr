import { Component, signal } from '@angular/core';

import { WrCopyToClipboard } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
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
  ],
})
export default class CopyToClipboardPage {
  protected readonly clipboardText = signal('Hello from ngwr!');
  protected readonly copied = signal<string>('');

  protected onCopied(text: string): void {
    this.copied.set(text);
  }

  protected readonly snippets = {
    install: `import { WrCopyToClipboard } from 'ngwr/directives';`,
    usage: `<button [wrCopyToClipboard]="value" (copied)="toast('Copied!')">Copy</button>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrCopyToClipboard]',
      description: 'Copies the bound string on host click. `(copied)` / `(copyFailed)` outputs.',
      type: 'string',
      default: '—',
    },
  ];
}
