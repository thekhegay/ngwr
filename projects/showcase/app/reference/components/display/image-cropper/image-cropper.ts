import { Component, computed, signal } from '@angular/core';

import { WrAlert } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { type WrImageLoadError, type WrImageRotation, WrImageCropper } from 'ngwr/image-cropper';
import { WrKbd } from 'ngwr/keyboard';
import { type WrSliderValue, WrSlider } from 'ngwr/slider';

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
    WrSlider,
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
  protected readonly avatar = signal<string | File>('/images/image_1.webp');
  protected readonly avatarUrl = signal<string>('');
  protected readonly zoom = signal(1);
  protected readonly rotation = signal<WrImageRotation>(0);
  protected readonly zoomLabel = (value: number): string => `${Math.round(value * 100)}%`;
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

  protected onCropped(blob: Blob, preview = this.previewUrl): void {
    const url = URL.createObjectURL(blob);
    const prev = preview();
    if (prev) URL.revokeObjectURL(prev);
    preview.set(url);
  }

  /** A single-thumb slider only ever emits a number; the type also covers a range. */
  protected onZoom(value: WrSliderValue): void {
    if (typeof value === 'number') this.zoom.set(value);
  }

  protected readonly snippets = {
    basic: `<input type="file" accept="image/*" (change)="onFileChange($event)" />

<wr-image-cropper [src]="src()" (cropped)="onCropped($event)" />`,

    square: `<wr-image-cropper [src]="avatar" [aspectRatio]="1" />`,

    transform: `<wr-slider ariaLabel="Zoom" min="1" max="4" step="0.1" [value]="zoom()" (valueChange)="onZoom($event)" />
<button wr-btn type="button" (click)="cropper.rotate('ccw')">Turn left</button>
<button wr-btn type="button" (click)="cropper.rotate()">Turn right</button>

<wr-image-cropper
  #cropper
  [src]="photo()"
  [aspectRatio]="1"
  [(zoom)]="zoom"
  [(rotation)]="rotation"
  (cropped)="onCropped($event)"
/>`,

    transformTs: `import type { WrImageRotation } from 'ngwr/image-cropper';
import type { WrSliderValue } from 'ngwr/slider';

protected readonly zoom = signal(1);
protected readonly rotation = signal<WrImageRotation>(0);

protected onZoom(value: WrSliderValue): void {
  if (typeof value === 'number') this.zoom.set(value);
}`,

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
    toFile: `@Component({
  template: \`
    <wr-image-cropper #cropper [src]="file()" />
    <button type="button" (click)="save()">Save</button>
  \`,
})
class Avatar {
  private readonly cropper = viewChild.required<WrImageCropper>('cropper');
  private readonly http = inject(HttpClient);

  /** The picked image, from a file input or \`wr-file-upload\`. */
  readonly file = signal<File | null>(null);

  async save() {
    // 'avatar.jpg' if the browser encoded JPEG, 'avatar.png' after a PNG fallback
    const file = await this.cropper().toFile('avatar', 'image/jpeg');
    const body = new FormData();
    body.append('avatar', file);
    this.http.post('/api/avatar', body).subscribe();
  }
}`,
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
      name: '[(zoom)]',
      description: 'Enlarges the image under the crop box, from `1` (the whole image) to `4`.',
      type: 'number',
      default: '1',
    },
    {
      name: '[(rotation)]',
      description: 'Clockwise quarter turns, in degrees. The stage, the crop box and the export turn with the image.',
      type: '0 | 90 | 180 | 270',
      default: '0',
    },
    {
      name: '(cropped)',
      description: 'Emits a Blob after each drag end, and after `zoom` or `rotation` settles.',
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
      description: 'Computed crop rect in source-image pixel coordinates, before `rotation` turns it.',
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
      name: 'rotate(direction?)',
      description: "Turns the image a quarter turn: clockwise, or counter-clockwise with `'ccw'`.",
      type: "(direction?: 'cw' | 'ccw') => void",
      default: '—',
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
    {
      name: 'toFile(name, type?, quality?)',
      description:
        'The crop as a `File`. A trailing extension of `name` is replaced by that of the encoded type, or one is appended.',
      type: '(name: string, type?: WrImageOutputType, quality?: number) => Promise<File>',
      default: '—',
    },
  ];
}
