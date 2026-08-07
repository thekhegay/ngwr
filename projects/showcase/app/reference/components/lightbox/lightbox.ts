import { Component } from '@angular/core';

import { WrLightbox } from 'ngwr/lightbox';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

const LANDSCAPE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80';
const LANDSCAPE_THUMB = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=320&q=70';
const PORTRAIT = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80';
const PORTRAIT_THUMB = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=240&q=70';

@Component({
  selector: 'ngwr-lightbox-page',
  templateUrl: './lightbox.html',
  imports: [WrLightbox, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class LightboxPage {
  protected readonly landscape = LANDSCAPE;
  protected readonly landscapeThumb = LANDSCAPE_THUMB;
  protected readonly portrait = PORTRAIT;
  protected readonly portraitThumb = PORTRAIT_THUMB;

  protected readonly snippets = {
    install: `import { WrLightbox } from 'ngwr/lightbox';

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

  protected readonly api = API.WrLightbox;
}
