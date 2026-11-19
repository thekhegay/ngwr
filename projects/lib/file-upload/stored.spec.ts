import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, describe, expect, it } from 'vitest';

import { WrFileUpload } from './file-upload';
import { WrFileUploadHarness } from './testing';
import type { WrStoredFile } from './types';

@Component({
  imports: [WrFileUpload],
  template: `
    <wr-file-upload
      multiple
      [maxFiles]="maxFiles()"
      [disabled]="disabled()"
      [stored]="stored()"
      [(value)]="files"
      (storedRemove)="onRemove($event)"
    />
  `,
})
class Host {
  readonly files = signal<File | readonly File[] | null>([]);
  readonly maxFiles = signal(0);
  readonly disabled = signal(false);
  readonly removed = signal<readonly WrStoredFile[]>([]);
  readonly stored = signal<readonly WrStoredFile[]>([
    { name: 'contract.pdf', size: 2048, url: 'https://files.example.com/contract.pdf' },
    { name: 'notes.txt' },
  ]);

  onRemove(file: WrStoredFile): void {
    this.removed.update(list => [...list, file]);
    this.stored.update(list => list.filter(item => item !== file));
  }
}

describe('WrFileUpload stored files', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let upload: WrFileUploadHarness;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const mount = async (): Promise<void> => {
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    upload = await TestbedHarnessEnvironment.harnessForFixture(fixture, WrFileUploadHarness);
  };

  afterEach(() => fixture.destroy());

  it('lists name and size, and leaves the size out when it is unknown', async () => {
    await mount();

    expect(await upload.getFileNames()).toEqual(['contract.pdf', 'notes.txt']);
    expect(await upload.getFileSizes()).toEqual(['2.0 KB']);
  });

  it('opens a stored file in a new tab without handing the opener over', async () => {
    await mount();
    const link = root().querySelector<HTMLAnchorElement>('a.wr-file-upload__link')!;

    expect(await upload.getLink('contract.pdf')).toBe('https://files.example.com/contract.pdf');
    expect(await upload.getLink('notes.txt')).toBeNull();
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.getAttribute('aria-label')).toBe('contract.pdf (opens in a new tab)');
  });

  it('names each remove button after its file', async () => {
    await mount();
    const labels = [...root().querySelectorAll('.wr-file-upload__remove')].map(b => b.getAttribute('aria-label'));

    expect(labels).toEqual(['Remove contract.pdf', 'Remove notes.txt']);
  });

  it('emits the descriptor on remove and leaves the form value alone', async () => {
    await mount();
    await upload.removeFileNamed('contract.pdf');

    expect(fixture.componentInstance.removed().map(file => file.name)).toEqual(['contract.pdf']);
    expect(await upload.getFileNames()).toEqual(['notes.txt']);
    expect(fixture.componentInstance.files()).toEqual([]);
  });

  it('mixes with picked files, stored first, and keeps them out of the value', async () => {
    await mount();
    const picked = new File(['x'], 'new.png', { type: 'image/png' });
    await upload.selectFiles(picked);

    expect(await upload.getFileNames()).toEqual(['contract.pdf', 'notes.txt', 'new.png']);
    expect(fixture.componentInstance.files()).toEqual([picked]);

    await upload.removeFileNamed('new.png');

    expect(fixture.componentInstance.files()).toEqual([]);
    expect(fixture.componentInstance.removed()).toEqual([]);
    expect(await upload.getFileNames()).toEqual(['contract.pdf', 'notes.txt']);
  });

  it('counts stored files toward maxFiles', async () => {
    await mount();
    fixture.componentInstance.maxFiles.set(3);
    await fixture.whenStable();
    await upload.selectFiles(new File(['a'], 'a.png'), new File(['b'], 'b.png'));

    expect(await upload.getFileNames()).toEqual(['contract.pdf', 'notes.txt', 'a.png']);
  });

  it('keeps focus on a remove button after a stored row leaves', async () => {
    await mount();
    const buttons = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-file-upload__remove')];
    buttons()[0].focus();
    buttons()[0].click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(buttons()[0]);
    expect(buttons()[0].getAttribute('aria-label')).toBe('Remove notes.txt');
  });

  it('refuses a remove while disabled', async () => {
    await mount();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    for (const button of root().querySelectorAll<HTMLButtonElement>('.wr-file-upload__remove')) {
      expect(button.disabled).toBe(true);
    }
  });
});
