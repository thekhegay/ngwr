import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrFileUpload, type WrFileUploadRejection } from 'ngwr/file-upload';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-file-upload-page',
  templateUrl: './file-upload.html',
  imports: [
    FormsModule,
    WrFileUpload,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FileUploadPageComponent {
  protected readonly single = signal<File | null>(null);
  protected readonly multi = signal<readonly File[] | null>(null);
  protected readonly avatar = signal<File | null>(null);

  protected readonly lastRejection = signal<string>('');

  protected onRejected(rejections: readonly WrFileUploadRejection[]): void {
    const summary = rejections.map(r => `${r.file.name} (${r.reason})`).join(', ');
    this.lastRejection.set(summary);
  }

  protected readonly snippets = {
    install: `import { WrFileUpload } from 'ngwr/file-upload';

@Component({ imports: [WrFileUpload, FormsModule] })
export class MyComponent {
  protected readonly files = signal<readonly File[] | null>(null);
}`,

    single: `<wr-file-upload [(ngModel)]="file" />`,

    multi: `<wr-file-upload [(ngModel)]="files" [multiple]="true" [maxFiles]="5" />`,

    constrained: `<wr-file-upload
  [(ngModel)]="avatar"
  accept=".png,.jpg,image/webp"
  [maxSize]="2 * 1024 * 1024"
  helperText="PNG, JPG or WebP, up to 2 MB"
  (rejected)="onRejected($event)"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'multiple', description: 'Allow multiple files.', type: 'boolean', default: 'false' },
    {
      name: 'accept',
      description: 'Accepted types (MIME or extensions, comma-separated).',
      type: 'string',
      default: "''",
    },
    { name: 'maxSize', description: 'Max bytes per file. `0` disables the check.', type: 'number', default: '0' },
    {
      name: 'maxFiles',
      description: 'Max files in multi mode. `0` disables the check.',
      type: 'number',
      default: '0',
    },
    { name: 'showList', description: 'Render the picked-files list.', type: 'boolean', default: 'true' },
    {
      name: 'pickLabel',
      description: 'Primary call-to-action label.',
      type: 'string',
      default: "'Click to browse'",
    },
    {
      name: 'dropLabel',
      description: 'Secondary instruction below the CTA.',
      type: 'string',
      default: "'or drop files here'",
    },
    { name: 'helperText', description: 'Optional helper text below the labels.', type: 'string', default: "''" },
    { name: 'disabled', description: 'Block interaction.', type: 'boolean', default: 'false' },
    {
      name: '(rejected)',
      description: 'Emitted with files rejected by type / size / count.',
      type: 'readonly WrFileUploadRejection[]',
      default: '—',
    },
  ];

  protected readonly typeSnippet = `interface WrFileUploadRejection {
  file: File;
  reason: WrFileUploadRejectionReason;
}

type WrFileUploadRejectionReason = 'type' | 'size' | 'count';`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrFileUploadRejection', description: 'One rejected file, emitted via (rejected).', type: 'interface' },
    { name: 'file', description: 'The rejected File object.', type: 'File', required: true, sub: true },
    {
      name: 'reason',
      description: 'Why it was rejected.',
      type: 'WrFileUploadRejectionReason',
      required: true,
      sub: true,
    },
    { name: 'WrFileUploadRejectionReason', description: 'Rejection cause.', type: "'type' | 'size' | 'count'" },
  ];
}
