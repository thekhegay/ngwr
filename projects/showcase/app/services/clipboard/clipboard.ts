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
    this.lastRead.set(await this.clip.read());
  }

  protected async probe(): Promise<void> {
    this.writePerm.set(await this.clip.permission('write'));
    this.readPerm.set(await this.clip.permission('read'));
  }

  protected readonly snippets = {
    install: `import { WrClipboard } from 'ngwr/clipboard';

@Component({ /* … */ })
export class MyComponent {
  private readonly clip = inject(WrClipboard);

  protected async copy(value: string) {
    const ok = await this.clip.write(value);
    if (!ok) console.warn('Copy failed — denied permission or no clipboard');
  }
}`,
    read: `// Read text. Returns null when unsupported or denied.
const text = await this.clip.read();
if (text) console.log('pasted:', text);`,
    perm: `// Probe the Permissions API.
const state = await this.clip.permission('write');
// 'granted' | 'denied' | 'prompt' | 'unsupported'`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'write(text)',
      description:
        'Write text to the clipboard. Falls back to a hidden-textarea + `execCommand` write when the async API is unavailable. Resolves to `true` on success.',
      type: '(text: string) => Promise<boolean>',
      default: '—',
    },
    {
      name: 'read()',
      description:
        'Read text from the clipboard. Returns `null` when unsupported (older browsers) or when the user denied the permission prompt.',
      type: '() => Promise<string | null>',
      default: '—',
    },
    {
      name: 'available()',
      description: 'Is any clipboard write path available (async API or `execCommand`)?',
      type: '() => boolean',
      default: '—',
    },
    {
      name: 'permission(name)',
      description: 'Probe the Permissions API for `clipboard-read` or `clipboard-write`.',
      type: "(name: 'read' | 'write') => Promise<WrClipboardPermission>",
      default: '—',
    },
  ];
}
