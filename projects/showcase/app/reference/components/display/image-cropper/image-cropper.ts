import { Component, computed, signal } from '@angular/core';

import { WrAlert } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { type WrImageLoadError, WrImageCropper } from 'ngwr/image-cropper';
import { WrKbd } from 'ngwr/keyboard';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-image-cropper-page',
  templateUrl: './image-cropper.html',
  imports: [
    WrAlert,
    WrButton,
    WrImageCropper,
    WrKbd,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ImageCropperPageComponent {
  protected readonly src = signal<string | File>('/images/image_1.webp');
  protected readonly square = signal<string | File>('/images/image_1.webp');
  protected readonly previewUrl = signal<string>('');
  protected readonly unreadable = signal<string | File>('/images/image_1.webp');
  protected readonly lastError = signal<WrImageLoadError | null>(null);
  protected readonly unreadableMessage = computed(() => {
    const error = this.lastError();
    const what = error?.name ? `${error.name}${error.type ? ` (${error.type})` : ''}` : 'The file';
    return `${what} is not an image this browser can read. Try a JPEG, PNG or WebP.`;
  });

  /**
   * Built on click rather than as a field: the page prerenders, and a source handed
   * to the <img> before hydration can fail before anything is listening for it.
   */
  protected pickUnreadable(): void {
    this.unreadable.set(new File(['not an image'], 'IMG_0001.heic', { type: 'image/heic' }));
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.src.set(file);
  }

  protected onCropped(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.previewUrl.set(url);
  }

  protected readonly snippets = {
    basic: `<input type="file" accept="image/*" (change)="onFileChange($event)" />

<wr-image-cropper [src]="src()" (cropped)="onCropped($event)" />`,

    square: `<wr-image-cropper [src]="avatar" [aspectRatio]="1" />`,

    loadError: `<wr-image-cropper #cropper [src]="file()" (loadError)="lastError.set($event)" />

@if (cropper.status() === 'failed') {
  <wr-alert type="danger" title="This image could not be opened" [message]="message()" />
}`,

    loadErrorTs: `import type { WrImageLoadError } from 'ngwr/image-cropper';

protected readonly file = signal<File | null>(null);
protected readonly lastError = signal<WrImageLoadError | null>(null);

// The error has the file's name and type, not a reason.
protected readonly message = computed(() => {
  const error = this.lastError();
  return \`\${error?.name ?? 'The file'} is not an image this browser can read.\`;
});`,

    maxOutputSize: `<wr-image-cropper [src]="file()" [aspectRatio]="1" [maxOutputSize]="512" (cropped)="upload($event)" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'src', description: 'Image source.', type: 'string | File | Blob | null', default: 'null' },
    {
      name: 'aspectRatio',
      description: 'Lock width / height. `null` = free.',
      type: 'number | null',
      default: 'null',
    },
    { name: 'minWidth', description: 'Min crop width in display px.', type: 'number', default: '32' },
    { name: 'minHeight', description: 'Min crop height in display px.', type: 'number', default: '32' },
    {
      name: 'outputType',
      description: 'MIME type for `(cropped)`.',
      type: "'image/png' | 'image/jpeg' | 'image/webp'",
      default: "'image/png'",
    },
    {
      name: 'outputQuality',
      description: 'JPEG / WebP quality in [0, 1].',
      type: 'number',
      default: '0.92',
    },
    {
      name: 'maxOutputSize',
      description: 'Longest side of the exported image in pixels. `null` exports at the source resolution.',
      type: 'number | null',
      default: 'null',
    },
    {
      name: '(cropped)',
      description: 'Emits a Blob after each drag end.',
      type: 'Blob',
      default: '—',
    },
    {
      name: '(loadError)',
      description: 'Fires when the browser cannot decode `src`, with `{ url, name, type, size }`.',
      type: 'WrImageLoadError',
      default: '—',
    },
    { name: 'Readable state', description: 'Signals and methods on the component instance.', type: 'members' },
    {
      name: 'cropRect',
      description: 'Computed crop rect in source-image pixel coordinates.',
      type: 'Signal<WrCropRect>',
      default: '—',
      sub: true,
    },
    {
      name: 'status',
      description: "`'empty'`, `'loading'`, `'loaded'` or `'failed'`. Resets when `src` changes.",
      type: 'Signal<WrImageCropperStatus>',
      default: '—',
      sub: true,
    },
    {
      name: 'refresh()',
      description: 'Re-measure and re-emit `(cropped)` after the cropper was resized.',
      type: '() => Promise<void>',
      default: '—',
    },
    {
      name: 'toBlob() / toDataUrl()',
      description: 'Read the current crop programmatically.',
      type: 'method',
      default: '—',
    },
  ];
}
