import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrImageCropper } from 'ngwr/image-cropper';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrImageCropper,
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
    install: `import { WrImageCropper } from 'ngwr/image-cropper';

@Component({ imports: [WrImageCropper] })
export class MyComponent {
  protected readonly src = signal<File | null>(null);

  onCropped(blob: Blob) {
    // upload blob, preview it, etc.
  }
}`,

    basic: `<input type="file" accept="image/*" (change)="onFileChange($event)" />

<wr-image-cropper [src]="src()" (cropped)="onCropped($event)" />`,

    square: `<wr-image-cropper [src]="avatar" [aspectRatio]="1" />`,
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
    { name: '(cropped)', description: 'Emits a Blob after each drag end.', type: 'EventEmitter<Blob>', default: '—' },
    {
      name: 'cropRect',
      description: 'Computed crop rect in source-image pixel coordinates.',
      type: 'Signal<WrCropRect>',
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
