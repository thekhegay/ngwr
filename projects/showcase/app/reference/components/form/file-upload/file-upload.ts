import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import {
  WrFileUpload,
  type WrFileUploadRejection,
  type WrFileUploadSize,
  type WrFileUploadStatus,
  type WrFileUploadStatusMap,
} from 'ngwr/file-upload';

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
    WrButton,
    WrFileUpload,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class FileUploadPageComponent {
  protected readonly sizes: readonly WrFileUploadSize[] = ['sm', 'md', 'lg'];
  protected readonly single = signal<File | null>(null);
  protected readonly multi = signal<readonly File[] | null>(null);
  protected readonly avatar = signal<File | null>(null);

  protected readonly lastRejection = signal<string>('');

  protected onRejected(rejections: readonly WrFileUploadRejection[]): void {
    const summary = rejections.map(r => `${r.file.name} (${r.reason})`).join(', ');
    this.lastRejection.set(summary);
  }

  // Upload progress: a fake upload on timers. Every second file fails once.
  protected readonly uploads = signal<readonly File[]>([]);
  protected readonly statuses = signal<WrFileUploadStatusMap>(new Map());
  private readonly timers = new Map<File, ReturnType<typeof setInterval>>();
  private readonly failedOnce = new Set<File>();
  private started = 0;

  protected readonly previewed = signal<readonly File[] | null>(null);
  protected readonly pasted = signal<readonly File[] | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach(timer => clearInterval(timer)));
  }

  protected onUploads(value: File | readonly File[] | null): void {
    const files = (value ?? []) as readonly File[];
    this.uploads.set(files);
    for (const [file, timer] of this.timers) {
      if (files.includes(file)) continue;
      clearInterval(timer);
      this.timers.delete(file);
    }
    for (const file of files) {
      if (!this.statuses().has(file)) this.upload(file, this.started++ % 2 === 1);
    }
  }

  protected addSamples(): void {
    const samples = ['report.pdf', 'photo.png', 'notes.txt'].map(name => new File([name], name));
    this.onUploads([...this.uploads(), ...samples]);
  }

  protected upload(file: File, fails = false): void {
    let percent = 0;
    this.setStatus(file, { state: 'uploading', percent });
    const timer = setInterval(() => {
      percent += 10;
      if (fails && percent >= 60 && !this.failedOnce.has(file)) {
        this.failedOnce.add(file);
        this.finish(file, { state: 'error', message: 'The connection dropped' });
      } else if (percent >= 100) {
        this.finish(file, { state: 'done' });
      } else {
        this.setStatus(file, { state: 'uploading', percent });
      }
    }, 300);
    this.timers.set(file, timer);
  }

  private finish(file: File, status: WrFileUploadStatus): void {
    clearInterval(this.timers.get(file));
    this.timers.delete(file);
    this.setStatus(file, status);
  }

  private setStatus(file: File, status: WrFileUploadStatus): void {
    this.statuses.update(map => new Map(map).set(file, status));
  }

  protected readonly snippets = {
    single: `<wr-file-upload [(value)]="file" />`,

    multi: `<wr-file-upload [(value)]="files" [multiple]="true" [maxFiles]="5" />`,

    constrained: `<wr-file-upload
  [(value)]="avatar"
  accept=".png,.jpg,image/webp"
  [maxSize]="2 * 1024 * 1024"
  helperText="PNG, JPG or WebP, up to 2 MB"
  (rejected)="onRejected($event)"
/>`,

    sizes: `<wr-file-upload size="sm" [(value)]="files" multiple />
<wr-file-upload size="md" [(value)]="files" multiple />
<wr-file-upload size="lg" [(value)]="files" multiple />`,

    progress: `<wr-file-upload
  multiple
  [value]="files()"
  [status]="statuses()"
  (valueChange)="onFiles($event)"
  (retry)="upload($event)"
/>`,

    progressTs: `readonly files = signal<readonly File[]>([]);
readonly statuses = signal<WrFileUploadStatusMap>(new Map());

onFiles(value: File | readonly File[] | null): void {
  const files = (value ?? []) as readonly File[];
  this.files.set(files);
  for (const file of files) {
    if (!this.statuses().has(file)) this.upload(file);
  }
}

upload(file: File): void {
  this.setStatus(file, { state: 'uploading', percent: 0 });
  this.api.upload(file).subscribe({
    next: percent => this.setStatus(file, { state: 'uploading', percent }),
    complete: () => this.setStatus(file, { state: 'done' }),
    error: () => this.setStatus(file, { state: 'error', message: 'The connection dropped' }),
  });
}

private setStatus(file: File, status: WrFileUploadStatus): void {
  // A new Map each time: the input sees a new reference.
  this.statuses.update(map => new Map(map).set(file, status));
}`,

    previews: `<wr-file-upload [(value)]="files" multiple previews accept="image/*" />`,

    paste: `<wr-file-upload [(value)]="files" multiple acceptPaste />`,
  };

  protected readonly api = API.WrFileUpload;

  protected readonly typeSnippet = `interface WrFileUploadRejection {
  file: File;
  reason: WrFileUploadRejectionReason;
}

type WrFileUploadRejectionReason = 'type' | 'size' | 'count';

type WrFileUploadStatusMap = ReadonlyMap<File, WrFileUploadStatus>;

interface WrFileUploadStatus {
  state: WrFileUploadState;
  percent?: number | null;
  message?: string | null;
}

type WrFileUploadState = 'pending' | 'uploading' | 'done' | 'error';`;

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
    {
      name: 'WrFileUploadStatusMap',
      description: 'What [status] takes, keyed by the File objects in the value.',
      type: 'ReadonlyMap<File, WrFileUploadStatus>',
    },
    { name: 'WrFileUploadStatus', description: 'Where the upload of one file stands.', type: 'interface' },
    { name: 'state', description: 'The state the row draws.', type: 'WrFileUploadState', required: true, sub: true },
    {
      name: 'percent',
      description: 'uploading only: 0 to 100. Without it the bar is indeterminate.',
      type: 'number | null',
      sub: true,
    },
    {
      name: 'message',
      description: 'error only: what went wrong, in your words. Without it the row says "Upload failed".',
      type: 'string | null',
      sub: true,
    },
    {
      name: 'WrFileUploadState',
      description: 'Upload state of one file.',
      type: "'pending' | 'uploading' | 'done' | 'error'",
    },
  ];
}
