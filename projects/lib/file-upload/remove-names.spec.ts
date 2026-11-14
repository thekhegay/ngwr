import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrEn } from 'ngwr/i18n/en';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, describe, expect, it } from 'vitest';

import { WrFileUpload } from './file-upload';

@Component({
  imports: [WrFileUpload],
  template: `<wr-file-upload multiple [removeFileLabel]="removeFileLabel()" [(value)]="files" />`,
})
class Host {
  readonly files = signal<File | readonly File[] | null>([
    new File(['a'], 'report.pdf', { type: 'application/pdf' }),
    new File(['b'], 'photo.png', { type: 'image/png' }),
  ]);
  readonly removeFileLabel = signal<string | null>(null);
}

/**
 * A list of files is a list of remove buttons, and every one of them was named
 * "Remove file": a screen reader's list of buttons read the same two words once
 * per row, and speech input had no way to say which.
 */
describe('WrFileUpload remove buttons', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const names = (): (string | null)[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.wr-file-upload__remove')].map(button =>
      button.getAttribute('aria-label')
    );
  const mount = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  };

  afterEach(() => fixture.destroy());

  it('names each one after its file', async () => {
    await mount();

    expect(names()).toEqual(['Remove report.pdf', 'Remove photo.png']);
  });

  it('follows the list when a file leaves it', async () => {
    await mount();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.wr-file-upload__remove')!.click();
    await fixture.whenStable();

    expect(names()).toEqual(['Remove photo.png']);
  });

  it('puts the file name into the placeholder of removeFileLabel', async () => {
    await mount();
    fixture.componentInstance.removeFileLabel.set('Delete {{name}} from the list');
    await fixture.whenStable();

    expect(names()).toEqual(['Delete report.pdf from the list', 'Delete photo.png from the list']);
  });

  it('writes a name that looks like a replacement pattern as it is', async () => {
    await mount();
    fixture.componentInstance.files.set([new File(['a'], "$&-$'.txt")]);
    fixture.componentInstance.removeFileLabel.set('Delete {{ name }}');
    await fixture.whenStable();

    expect(names()).toEqual(["Delete $&-$'.txt"]);
  });

  it('takes the sentence from the catalog', async () => {
    await mount([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(names()).toEqual(['Удалить report.pdf', 'Удалить photo.png']);
  });
});

/**
 * `fileUpload.invalid` and `fileUpload.tooBig` were validation copy no template
 * and no code read: the library ships no validation messages, so a host
 * translating them translated nothing.
 */
describe('the fileUpload catalog', () => {
  const I18N = join(process.cwd(), 'projects/lib/i18n');
  const catalogs = readdirSync(I18N, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'loaders')
    .map(entry => entry.name);

  it('holds no key the component does not read', () => {
    const source = ['file-upload.ts', 'file-upload.html']
      .map(file => readFileSync(join(process.cwd(), 'projects/lib/file-upload', file), 'utf8'))
      .join('\n');
    const read = new Set([...source.matchAll(/'fileUpload\.(\w+)'/g)].map(match => match[1]));

    expect(Object.keys(wrEn['fileUpload'] as object).sort()).toEqual([...read].sort());
  });

  it('dropped the two dead keys from every shipped catalog', () => {
    expect(catalogs.length).toBeGreaterThan(20);
    for (const locale of catalogs) {
      const text = readFileSync(join(I18N, locale, 'public-api.ts'), 'utf8');
      const block = /\n {2}fileUpload: \{([\s\S]*?)\n {2}\},/.exec(text)?.[1];

      expect(block, locale).toBeDefined();
      expect(block, locale).not.toMatch(/\b(invalid|tooBig):/);
      expect(block, locale).toMatch(/removeFile: '[^']*\{\{name\}\}[^']*'/);
    }
  });
});
