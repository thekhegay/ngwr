import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFileUpload } from './file-upload';
import type { WrFileUploadStatus, WrFileUploadStatusMap } from './types';

@Component({
  imports: [WrFileUpload],
  template: `
    <wr-file-upload
      [(value)]="files"
      [multiple]="true"
      [status]="status()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (retry)="retried.push($event)"
    />
  `,
})
class Host {
  readonly files = signal<File | readonly File[] | null>([]);
  readonly status = signal<WrFileUploadStatusMap | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly retried: File[] = [];
}

/**
 * The app uploads and the list shows it. Every assertion reads the row a user
 * sees: its modifier, its bar, its mark, its message, and the one live region
 * that says what changed.
 */
describe('WrFileUpload upload status', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const a = new File(['a'], 'a.png', { type: 'image/png' });
  const b = new File(['b'], 'b.pdf', { type: 'application/pdf' });

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = (): HTMLElement => root().querySelector<HTMLElement>('.wr-file-upload__list')!;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-file-upload__item'));
  const live = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-file-upload__announce');

  const set = async (entries: [File, WrFileUploadStatus][]): Promise<void> => {
    fixture.componentInstance.status.set(new Map(entries));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.files.set([a, b]);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('renders nothing new while no status is bound', () => {
    expect(rows().map(row => row.className)).toEqual(['wr-file-upload__item', 'wr-file-upload__item']);
    expect(rows().map(row => row.children.length)).toEqual([3, 3]);
    expect(root().querySelector('wr-progress, img, .wr-file-upload__retry, .wr-file-upload__done')).toBeNull();
    expect(root().querySelector('.wr-file-upload__name')!.hasAttribute('id')).toBe(false);
    expect(list().hasAttribute('aria-busy')).toBe(false);
    expect(live()).toBeNull();
  });

  it('leaves a file with no entry a plain row', async () => {
    await set([[a, { state: 'done' }]]);

    expect(rows()[1].className).toBe('wr-file-upload__item');
    expect(rows()[1].children.length).toBe(3);
  });

  it('marks a pending row and draws no part for it', async () => {
    await set([[a, { state: 'pending' }]]);

    expect(rows()[0].classList.contains('wr-file-upload__item--pending')).toBe(true);
    expect(rows()[0].children.length).toBe(3);
    expect(list().hasAttribute('aria-busy')).toBe(false);
  });

  it('draws a determinate bar at the percent it was given', async () => {
    await set([[a, { state: 'uploading', percent: 40 }]]);

    const bar = rows()[0].querySelector<HTMLElement>('wr-progress')!;
    expect(rows()[0].classList.contains('wr-file-upload__item--uploading')).toBe(true);
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.classList.contains('wr-progress--indeterminate')).toBe(false);
    expect(bar.getAttribute('aria-label')).toBe('a.png: Uploading');

    await set([[a, { state: 'uploading', percent: 75 }]]);
    expect(rows()[0].querySelector('wr-progress')!.getAttribute('aria-valuenow')).toBe('75');
  });

  it('draws an indeterminate bar when there is no percent', async () => {
    await set([[a, { state: 'uploading' }]]);

    const bar = rows()[0].querySelector<HTMLElement>('wr-progress')!;
    expect(bar.classList.contains('wr-progress--indeterminate')).toBe(true);
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('marks a done row with a named mark and takes the bar away', async () => {
    await set([[a, { state: 'uploading', percent: 99 }]]);
    await set([[a, { state: 'done' }]]);

    const mark = rows()[0].querySelector<HTMLElement>('.wr-file-upload__done')!;
    expect(rows()[0].classList.contains('wr-file-upload__item--done')).toBe(true);
    expect(mark.getAttribute('role')).toBe('img');
    expect(mark.getAttribute('aria-label')).toBe('Uploaded');
    expect(rows()[0].querySelector('wr-progress')).toBeNull();
  });

  it("shows the app's message on a failed row, and a generic one without it", async () => {
    await set([
      [a, { state: 'error', message: 'The server refused it' }],
      [b, { state: 'error' }],
    ]);

    const errors = rows().map(row => row.querySelector('.wr-file-upload__error')!.textContent.trim());
    expect(rows()[0].classList.contains('wr-file-upload__item--error')).toBe(true);
    expect(errors).toEqual(['The server refused it', 'Upload failed']);
  });

  it('emits retry with the file, from a button described by the file name', async () => {
    await set([[b, { state: 'error' }]]);

    const retry = rows()[1].querySelector<HTMLButtonElement>('.wr-file-upload__retry')!;
    const name = rows()[1].querySelector<HTMLElement>('.wr-file-upload__name')!;
    expect(retry.textContent.trim()).toBe('Try again');
    expect(retry.getAttribute('aria-describedby')).toBe(name.id);

    retry.click();
    expect(fixture.componentInstance.retried).toEqual([b]);
  });

  it('keeps retry on a read-only list and switches it off on a disabled one', async () => {
    await set([[a, { state: 'error' }]]);
    const retry = (): HTMLButtonElement => rows()[0].querySelector<HTMLButtonElement>('.wr-file-upload__retry')!;

    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();
    retry().click();
    expect(fixture.componentInstance.retried).toEqual([a]);

    fixture.componentInstance.readonly.set(false);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(retry().disabled).toBe(true);
  });

  it('keeps the remove button in every state', async () => {
    for (const state of ['pending', 'uploading', 'done', 'error'] as const) {
      await set([[a, { state }]]);
      expect(rows()[0].querySelector('.wr-file-upload__remove'), state).not.toBeNull();
    }

    rows()[0].querySelector<HTMLButtonElement>('.wr-file-upload__remove')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.files()).toEqual([b]);
  });

  it('is busy while any file uploads, and only then', async () => {
    await set([
      [a, { state: 'uploading' }],
      [b, { state: 'done' }],
    ]);
    expect(list().getAttribute('aria-busy')).toBe('true');

    await set([
      [a, { state: 'done' }],
      [b, { state: 'done' }],
    ]);
    expect(list().hasAttribute('aria-busy')).toBe(false);
  });

  it('holds one polite live region for the whole list, empty until something changes', async () => {
    await set([[a, { state: 'done' }]]);

    expect(root().querySelectorAll('[aria-live]').length).toBe(1);
    expect(live()!.getAttribute('role')).toBe('status');
    expect(live()!.getAttribute('aria-live')).toBe('polite');
    // What was already there when the status arrived is not news.
    expect(live()!.textContent).toBe('');
  });

  it('announces a change of state once, and not a percent tick', async () => {
    await set([[a, { state: 'pending' }]]);
    expect(live()!.textContent).toBe('');

    await set([[a, { state: 'uploading', percent: 0 }]]);
    expect(live()!.textContent).toBe('a.png: Uploading');

    const text = live()!.firstChild;
    await set([[a, { state: 'uploading', percent: 60 }]]);
    expect(live()!.textContent).toBe('a.png: Uploading');
    expect(live()!.firstChild).toBe(text);

    await set([[a, { state: 'done' }]]);
    expect(live()!.textContent).toBe('a.png: Uploaded');

    await set([[a, { state: 'error', message: 'Too slow' }]]);
    expect(live()!.textContent).toBe('a.png: Too slow');
  });

  it('says every file that changed in one write, in one string', async () => {
    await set([]);
    await set([
      [a, { state: 'uploading' }],
      [b, { state: 'error' }],
    ]);

    expect(live()!.textContent).toBe('a.png: Uploading, b.pdf: Upload failed');
  });
});
