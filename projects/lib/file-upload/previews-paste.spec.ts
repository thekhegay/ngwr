import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFileUpload } from './file-upload';
import type { WrFileUploadRejection } from './types';

@Component({
  imports: [WrFileUpload],
  template: `
    @if (shown()) {
      <wr-file-upload
        [(value)]="files"
        [multiple]="true"
        [previews]="previews()"
        [acceptPaste]="acceptPaste()"
        [accept]="accept()"
        [maxSize]="maxSize()"
        [maxFiles]="maxFiles()"
        [disabled]="disabled()"
        [readonly]="readonly()"
        (rejected)="rejections.set($event)"
      />
    }
  `,
})
class Host {
  readonly shown = signal(true);
  readonly files = signal<File | readonly File[] | null>([]);
  readonly previews = signal(false);
  readonly acceptPaste = signal(false);
  readonly accept = signal('');
  readonly maxSize = signal(0);
  readonly maxFiles = signal(0);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly rejections = signal<readonly WrFileUploadRejection[]>([]);
}

const file = (name: string, type = 'image/png', size = 10): File => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('WrFileUpload previews', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let created: File[];
  let revoked: string[];
  const statics = URL as unknown as Record<'createObjectURL' | 'revokeObjectURL', unknown>;
  const original = { create: statics.createObjectURL, revoke: statics.revokeObjectURL };

  const host = (): Host => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => Array.from(root().querySelectorAll<HTMLElement>('.wr-file-upload__item'));
  const thumb = (row: number): HTMLImageElement | null =>
    rows()[row].querySelector<HTMLImageElement>('img.wr-file-upload__preview');

  const photo = file('photo.png');
  const scan = file('scan.jpg', 'image/jpeg');
  const doc = file('doc.pdf', 'application/pdf');

  beforeEach(async () => {
    created = [];
    revoked = [];
    // jsdom has neither. The stub mints a URL that names its file, so a
    // thumbnail on the wrong row is visible in the assertion.
    URL.createObjectURL = (blob: Blob | MediaSource): string => {
      created.push(blob as File);
      return `blob:test/${(blob as File).name}`;
    };
    URL.revokeObjectURL = (url: string): void => void revoked.push(url);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    host().files.set([photo, doc, scan]);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    statics.createObjectURL = original.create;
    statics.revokeObjectURL = original.revoke;
  });

  it('creates no object URL and no thumbnail while previews is off', () => {
    expect(created).toEqual([]);
    expect(root().querySelector('img')).toBeNull();
  });

  it('shows a thumbnail for each image file and none for the rest', async () => {
    host().previews.set(true);
    await fixture.whenStable();

    expect(created).toEqual([photo, scan]);
    expect(thumb(0)!.getAttribute('src')).toBe('blob:test/photo.png');
    expect(thumb(0)!.getAttribute('alt')).toBe('');
    expect(thumb(1)).toBeNull();
    expect(thumb(2)!.getAttribute('src')).toBe('blob:test/scan.jpg');
  });

  it('creates one URL per file, however often the list re-renders', async () => {
    host().previews.set(true);
    await fixture.whenStable();
    host().files.set([photo, doc, scan, file('more.txt', 'text/plain')]);
    await fixture.whenStable();

    expect(created).toEqual([photo, scan]);
    expect(revoked).toEqual([]);
  });

  it('revokes the URL of a file that leaves the list, and only that one', async () => {
    host().previews.set(true);
    await fixture.whenStable();

    rows()[0].querySelector<HTMLButtonElement>('.wr-file-upload__remove')!.click();
    await fixture.whenStable();

    expect(revoked).toEqual(['blob:test/photo.png']);
    expect(thumb(1)!.getAttribute('src')).toBe('blob:test/scan.jpg');
  });

  it('revokes every URL when previews is switched off', async () => {
    host().previews.set(true);
    await fixture.whenStable();
    host().previews.set(false);
    await fixture.whenStable();

    expect(revoked).toEqual(['blob:test/photo.png', 'blob:test/scan.jpg']);
    expect(root().querySelector('img')).toBeNull();
  });

  it('revokes every URL when the component is destroyed', async () => {
    host().previews.set(true);
    await fixture.whenStable();
    host().shown.set(false);
    await fixture.whenStable();

    expect(revoked).toEqual(['blob:test/photo.png', 'blob:test/scan.jpg']);
  });
});

describe('WrFileUpload paste', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): Host => fixture.componentInstance;
  const zone = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-file-upload__zone')!;
  const names = (): string[] => (host().files() as readonly File[]).map(f => f.name);

  /** jsdom has no `ClipboardEvent` with files: the component reads `clipboardData.files` and nothing else. */
  const paste = async (...files: File[]): Promise<Event> => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { files } });
    zone().dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('ignores a paste unless acceptPaste is on', async () => {
    const event = await paste(file('a.png'));

    expect(names()).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('adds pasted files and keeps the paste from going anywhere else', async () => {
    host().acceptPaste.set(true);
    await fixture.whenStable();

    const event = await paste(file('a.png'), file('b.png'));

    expect(names()).toEqual(['a.png', 'b.png']);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a paste that carries no file alone', async () => {
    host().acceptPaste.set(true);
    await fixture.whenStable();

    const event = await paste();

    expect(event.defaultPrevented).toBe(false);
    expect(names()).toEqual([]);
  });

  it('holds pasted files to accept, maxSize and maxFiles, as a drop is', async () => {
    host().acceptPaste.set(true);
    host().accept.set('image/*');
    host().maxSize.set(100);
    host().maxFiles.set(1);
    await fixture.whenStable();

    await paste(file('doc.pdf', 'application/pdf'), file('big.png', 'image/png', 500), file('a.png'), file('b.png'));

    expect(names()).toEqual(['a.png']);
    expect(
      host()
        .rejections()
        .map(r => `${r.file.name}:${r.reason}`)
    ).toEqual(['doc.pdf:type', 'big.png:size', 'b.png:count']);
  });

  it.each(['disabled', 'readonly'] as const)('refuses a paste while %s', async state => {
    host().acceptPaste.set(true);
    host()[state].set(true);
    await fixture.whenStable();

    await paste(file('a.png'));

    expect(names()).toEqual([]);
  });
});
