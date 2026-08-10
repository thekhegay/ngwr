import { Component, signal } from '@angular/core';

import { WrFileUpload, type WrFileUploadRejection } from 'ngwr/file-upload';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-file-upload-page',
  templateUrl: './file-upload.html',
  imports: [
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

@Component({ imports: [WrFileUpload] })
export class MyComponent {
  protected readonly files = signal<readonly File[] | null>(null);
}`,

    single: `<wr-file-upload [(value)]="file" />`,

    multi: `<wr-file-upload [(value)]="files" [multiple]="true" [maxFiles]="5" />`,

    constrained: `<wr-file-upload
  [(value)]="avatar"
  accept=".png,.jpg,image/webp"
  [maxSize]="2 * 1024 * 1024"
  helperText="PNG, JPG or WebP, up to 2 MB"
  (rejected)="onRejected($event)"
/>`,
  };

  protected readonly api = API.WrFileUpload;

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
