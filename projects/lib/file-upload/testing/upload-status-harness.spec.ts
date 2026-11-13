import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrFileUpload, type WrFileUploadStatusMap } from 'ngwr/file-upload';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFileUploadHarness } from './wr-file-upload-harness';

@Component({
  imports: [WrFileUpload],
  template: `
    <wr-file-upload
      [(value)]="files"
      [multiple]="true"
      [previews]="true"
      [status]="status()"
      (retry)="retried.push($event)"
    />
  `,
})
class Host {
  readonly files = signal<File | readonly File[] | null>([]);
  readonly status = signal<WrFileUploadStatusMap | null>(null);
  readonly retried: File[] = [];
}

describe('WrFileUploadHarness upload status', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let upload: WrFileUploadHarness;
  const statics = URL as unknown as Record<'createObjectURL' | 'revokeObjectURL', unknown>;
  const original = { create: statics.createObjectURL, revoke: statics.revokeObjectURL };

  const photo = new File(['x'], 'photo.png', { type: 'image/png' });
  const doc = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
  const notes = new File(['x'], 'notes.txt', { type: 'text/plain' });

  beforeEach(async () => {
    URL.createObjectURL = (blob: Blob | MediaSource): string => `blob:test/${(blob as File).name}`;
    URL.revokeObjectURL = (): void => undefined;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.files.set([photo, doc, notes]);
    upload = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrFileUploadHarness);
  });

  afterEach(() => {
    fixture.destroy();
    statics.createObjectURL = original.create;
    statics.revokeObjectURL = original.revoke;
  });

  it('reads no status off a list the app set none on', async () => {
    expect(await upload.getFileStatus('photo.png')).toBeNull();
  });

  it('reads each state the app set, and null for a file it did not mention', async () => {
    fixture.componentInstance.status.set(
      new Map([
        [photo, { state: 'uploading', percent: 10 }],
        [doc, { state: 'error', message: 'No room' }],
      ])
    );

    expect(await upload.getFileStatus('photo.png')).toBe('uploading');
    expect(await upload.getFileStatus('doc.pdf')).toBe('error');
    expect(await upload.getFileStatus('notes.txt')).toBeNull();

    fixture.componentInstance.status.set(
      new Map([
        [photo, { state: 'done' }],
        [doc, { state: 'pending' }],
      ])
    );

    expect(await upload.getFileStatus('photo.png')).toBe('done');
    expect(await upload.getFileStatus('doc.pdf')).toBe('pending');
  });

  it('retries the failed file, by name', async () => {
    fixture.componentInstance.status.set(
      new Map([
        [photo, { state: 'error' }],
        [doc, { state: 'error' }],
      ])
    );

    await upload.retry('doc.pdf');

    expect(fixture.componentInstance.retried).toEqual([doc]);
  });

  it('refuses to retry a file that did not fail, and says what state it is in', async () => {
    fixture.componentInstance.status.set(new Map([[photo, { state: 'done' }]]));

    await expect(upload.retry('photo.png')).rejects.toThrow(/no retry button.*"done"/);
  });

  it('says whether a row shows a thumbnail', async () => {
    expect(await upload.hasPreview('photo.png')).toBe(true);
    expect(await upload.hasPreview('doc.pdf')).toBe(false);
  });

  it.each(['getFileStatus', 'retry', 'hasPreview'] as const)('%s names the files it does hold', async method => {
    await expect(upload[method]('missing.png')).rejects.toThrow(/holds "photo.png", "doc.pdf", "notes.txt"/);
  });
});
