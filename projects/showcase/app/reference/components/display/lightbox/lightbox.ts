import { Component } from '@angular/core';

import { WrLightbox } from 'ngwr/lightbox';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

const LANDSCAPE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80';
const LANDSCAPE_THUMB = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=320&q=70';
const PORTRAIT = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80';
const PORTRAIT_THUMB = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=240&q=70';

const PHOTO = 'https://images.unsplash.com/photo-';

/** Six frames out of the two photographs above: each whole, then two square crops of it. */
const GALLERY = [
  { id: '1506744038136-46273834b3fb', crop: '', alt: 'Mountain lake', caption: 'The whole frame' },
  { id: '1506744038136-46273834b3fb', crop: 'left', alt: 'Mountain lake, left side', caption: 'Left side' },
  { id: '1506744038136-46273834b3fb', crop: 'right', alt: 'Mountain lake, right side', caption: 'Right side' },
  { id: '1500530855697-b586d89ba3ee', crop: '', alt: 'Forest', caption: 'The whole frame' },
  { id: '1500530855697-b586d89ba3ee', crop: 'top', alt: 'Forest, upper part', caption: 'Upper part' },
  { id: '1500530855697-b586d89ba3ee', crop: 'bottom', alt: 'Forest, lower part', caption: 'Lower part' },
].map(({ id, crop, alt, caption }) => {
  const frame = crop ? `&fit=crop&crop=${crop}&h=` : '';
  return {
    src: `${PHOTO}${id}?w=1200&q=80${frame && `${frame}1200`}`,
    preview: `${PHOTO}${id}?w=240&q=70${frame && `${frame}240`}`,
    alt,
    caption,
  };
});

@Component({
  selector: 'ngwr-lightbox-page',
  templateUrl: './lightbox.html',
  imports: [WrLightbox, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
})
export default class LightboxPage {
  protected readonly landscape = LANDSCAPE;
  protected readonly landscapeThumb = LANDSCAPE_THUMB;
  protected readonly portrait = PORTRAIT;
  protected readonly portraitThumb = PORTRAIT_THUMB;

  protected readonly gallery = GALLERY;

  protected readonly snippets = {
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
    gallery: `@for (photo of photos; track photo.src) {
  <wr-lightbox
    group="trip"
    [src]="photo.src"
    [preview]="photo.thumb"
    [alt]="photo.alt"
    [caption]="photo.caption"
  />
}`,
    disabled: `<wr-lightbox src="/photo.jpg" alt="No-zoom thumbnail" disablePreview />`,
  };

  protected readonly api = API.WrLightbox;
}
