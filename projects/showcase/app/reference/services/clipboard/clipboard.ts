import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrClipboard, type WrClipboardPermission } from 'ngwr/clipboard';
import { WrInput } from 'ngwr/input';

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
  selector: 'ngwr-svc-clipboard-page',
  templateUrl: './clipboard.html',
  imports: [
    FormsModule,
    WrButton,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class ClipboardServicePage {
  private readonly clip = inject(WrClipboard);

  protected readonly draft = signal('Copy this!');
  protected readonly lastRead = signal<string | null>(null);
  protected readonly status = signal<'idle' | 'copied' | 'failed'>('idle');
  protected readonly writePerm = signal<WrClipboardPermission | null>(null);
  protected readonly readPerm = signal<WrClipboardPermission | null>(null);

  protected readonly available = this.clip.available();

  protected async copy(): Promise<void> {
    const ok = await this.clip.write(this.draft());
    this.status.set(ok ? 'copied' : 'failed');
    setTimeout(() => this.status.set('idle'), 1500);
  }

  protected async paste(): Promise<void> {
    const text = await this.clip.read();
    this.lastRead.set(text);
    if (text !== null) this.draft.set(text);
  }

  protected async probe(): Promise<void> {
    this.writePerm.set(await this.clip.permission('write'));
    this.readPerm.set(await this.clip.permission('read'));
  }

  protected readonly snippets = {
    usage: `private readonly clip = inject(WrClipboard);

const ok = await this.clip.write('Copied!'); // false when no write path worked
const text = await this.clip.read(); // null when unsupported or denied
const state = await this.clip.permission('read'); // 'granted' | 'denied' | 'prompt' | 'unsupported'`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'write(text)',
      description: 'Write text. Falls back to `execCommand` outside a secure context. Resolves `true` on success.',
      type: '(text: string) => Promise<boolean>',
      default: '—',
    },
    {
      name: 'read()',
      description: 'Read text. Resolves `null` when unsupported or denied.',
      type: '() => Promise<string | null>',
      default: '—',
    },
    {
      name: 'available()',
      description: 'Whether any write path exists.',
      type: '() => boolean',
      default: '—',
    },
    {
      name: 'permission(name)',
      description: 'Read or write permission. `unsupported` only when the Clipboard API is missing.',
      type: "(name: 'read' | 'write') => Promise<WrClipboardPermission>",
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Directive',
      title: '[wrCopyToClipboard]',
      url: ['/reference/directives', 'copy-to-clipboard'],
      description: 'Copy on click, without code.',
    },
  ];
}
