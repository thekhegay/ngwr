import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFileUpload } from './file-upload';
import type { WrFileUploadRejection } from './interfaces';

@Component({
  imports: [WrFileUpload],
  template: `
    <wr-file-upload
      [(value)]="picked"
      [multiple]="multiple()"
      [accept]="accept()"
      [maxSize]="maxSize()"
      [maxFiles]="maxFiles()"
      [disabled]="disabled()"
      (rejected)="rejections.set($event)"
    />
  `,
})
class Host {
  readonly picked = signal<File | readonly File[] | null>(null);
  readonly multiple = signal(false);
  readonly accept = signal('');
  readonly maxSize = signal(0);
  readonly maxFiles = signal(0);
  readonly disabled = signal(false);
  readonly rejections = signal<readonly WrFileUploadRejection[]>([]);
}

/**
 * The value of this component is that it refuses things, so the tests are about
 * the refusals: the wrong type, the too-large file, one too many. Each rejection
 * has to reach the host with a REASON — a silently dropped file looks to the
 * user like the upload simply did not work.
 *
 * jsdom has no `DataTransfer` and `input.files` is read-only, so both entry
 * points are driven by attaching a `FileList`-shaped object to the event, which
 * is exactly what the component reads.
 */
describe('WrFileUpload', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const picker = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input[type="file"]')!;
  const zone = (): HTMLElement => root().querySelector<HTMLElement>('.wr-file-upload__zone')!;
  const picked = (): File | readonly File[] | null => fixture.componentInstance.picked();
  const rejections = (): readonly WrFileUploadRejection[] => fixture.componentInstance.rejections();

  const file = (name: string, type = 'image/png', size = 10): File => {
    const f = new File(['x'], name, { type });
    // jsdom computes `size` from the parts; override it so a size limit is
    // testable without allocating megabytes.
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  const asFileList = (files: File[]): FileList => {
    const list: Record<string | symbol, unknown> = { ...files };
    list['length'] = files.length;
    list['item'] = (i: number): File | null => files[i] ?? null;
    list[Symbol.iterator] = function* (): Generator<File> {
      yield* files;
    };
    return list as unknown as FileList;
  };

  /** Choose through the hidden picker, the way the visible zone does. */
  const choose = (...files: File[]): void => {
    const event = new Event('change', { bubbles: true });
    Object.defineProperty(event, 'target', { value: { files: asFileList(files), value: '' } });
    picker().dispatchEvent(event);
    fixture.detectChanges();
  };

  const drop = (...files: File[]): void => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: asFileList(files) } });
    zone().dispatchEvent(event);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('hides the real picker behind its own drop zone', () => {
    // The `<input type="file">` is never operated directly — the styled zone is
    // the control, and the input is the mechanism behind it.
    expect(picker()).not.toBeNull();
    expect(zone()).not.toBeNull();
  });

  it('takes a chosen file and hands it over as a single value', () => {
    choose(file('photo.png'));

    expect(picked()).toBeInstanceOf(File);
    expect((picked() as File).name).toBe('photo.png');
  });

  it('replaces the selection in single mode rather than appending', () => {
    choose(file('first.png'));
    choose(file('second.png'));

    expect((picked() as File).name).toBe('second.png');
  });

  it('collects an array in multiple mode', () => {
    fixture.componentInstance.multiple.set(true);
    fixture.detectChanges();

    choose(file('a.png'), file('b.png'));
    choose(file('c.png'));

    expect((picked() as readonly File[]).map(f => f.name)).toEqual(['a.png', 'b.png', 'c.png']);
  });

  it('accepts a dropped file the same way as a chosen one', () => {
    drop(file('dragged.png'));

    expect((picked() as File).name).toBe('dragged.png');
  });

  describe('refusals', () => {
    it('rejects a type the accept list does not cover, with a reason', () => {
      fixture.componentInstance.accept.set('image/*');
      fixture.detectChanges();

      choose(file('notes.pdf', 'application/pdf'));

      expect(picked()).toBeNull();
      expect(rejections().map(r => [r.file.name, r.reason])).toEqual([['notes.pdf', 'type']]);
    });

    it('accepts a type the list does cover', () => {
      fixture.componentInstance.accept.set('image/*');
      fixture.detectChanges();

      choose(file('photo.png', 'image/png'));

      expect(picked()).not.toBeNull();
      expect(rejections()).toEqual([]);
    });

    it('rejects a file over maxSize, with a reason', () => {
      fixture.componentInstance.maxSize.set(100);
      fixture.detectChanges();

      choose(file('huge.png', 'image/png', 5000));

      expect(picked()).toBeNull();
      expect(rejections().map(r => r.reason)).toEqual(['size']);
    });

    it('keeps the good files and reports only the bad ones', () => {
      fixture.componentInstance.multiple.set(true);
      fixture.componentInstance.maxSize.set(100);
      fixture.detectChanges();

      choose(file('ok.png', 'image/png', 10), file('huge.png', 'image/png', 5000));

      // A batch that fails as a whole is the wrong shape: the user has to be
      // able to see WHICH file was refused.
      expect((picked() as readonly File[]).map(f => f.name)).toEqual(['ok.png']);
      expect(rejections().map(r => r.file.name)).toEqual(['huge.png']);
    });

    it('rejects the overflow past maxFiles, with a count reason', () => {
      fixture.componentInstance.multiple.set(true);
      fixture.componentInstance.maxFiles.set(2);
      fixture.detectChanges();

      choose(file('a.png'), file('b.png'), file('c.png'));

      expect((picked() as readonly File[]).map(f => f.name)).toEqual(['a.png', 'b.png']);
      expect(rejections().map(r => [r.file.name, r.reason])).toEqual([['c.png', 'count']]);
    });
  });

  it('takes nothing while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(picker().disabled).toBe(true);
    drop(file('sneaky.png'));

    expect(picked()).toBeNull();
  });

  it('carries the public BEM classes', () => {
    expect(root().querySelector('wr-file-upload')!.className).toContain('wr-file-upload');
  });
});
