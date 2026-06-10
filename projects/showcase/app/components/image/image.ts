import { Component } from '@angular/core';

import { WrLightbox } from 'ngwr/image';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

const LANDSCAPE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80';
const LANDSCAPE_THUMB = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=320&q=70';
const PORTRAIT = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80';
const PORTRAIT_THUMB = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=240&q=70';

@Component({
  selector: 'ngwr-image-page',
  templateUrl: './image.html',
  imports: [WrLightbox, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class ImagePage {
  protected readonly landscape = LANDSCAPE;
  protected readonly landscapeThumb = LANDSCAPE_THUMB;
  protected readonly portrait = PORTRAIT;
  protected readonly portraitThumb = PORTRAIT_THUMB;

  protected readonly snippets = {
    install: `import { WrLightbox } from 'ngwr/image';

@Component({ imports: [WrLightbox] })
export class MyComponent {}`,
    basic: `<wr-lightbox src="/photo.jpg" alt="Mountain lake" />`,
    preview: `<wr-lightbox
  src="/photo-full.jpg"
  preview="/photo-thumb.jpg"
  alt="Mountain lake"
/>`,
    caption: `<wr-lightbox
  src="/photo.jpg"
  alt="Mountain lake"
  caption="Geiranger, Norway — 2023"
/>`,
    disabled: `<wr-lightbox src="/photo.jpg" alt="No-zoom thumbnail" disablePreview />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'src',
      description: 'Full-size image URL. Shown in the lightbox.',
      type: 'string',
      default: '— (required)',
    },
    {
      name: 'preview',
      description: 'Optional thumbnail URL. Falls back to `src` when omitted.',
      type: 'string | null',
      default: 'null',
    },
    { name: 'alt', description: 'Alt text — applied to both thumb and full image.', type: 'string', default: "''" },
    {
      name: 'caption',
      description: 'Optional caption rendered below the full image in the viewer.',
      type: 'string',
      default: "''",
    },
    {
      name: 'disablePreview',
      description: 'Disable the click-to-zoom behaviour. The thumb still renders.',
      type: 'boolean',
      default: 'false',
    },
  ];
}
