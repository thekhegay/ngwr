import { Component, signal } from '@angular/core';

import { WrCarousel, WrCarouselSlide } from 'ngwr/carousel';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-carousel-page',
  templateUrl: './carousel.html',
  imports: [
    WrCarousel,
    WrCarouselSlide,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CarouselPageComponent {
  protected readonly idx = signal(0);

  // Intent tokens, so each label takes its fill's `-contrast` colour.
  protected readonly slides = (['primary', 'danger', 'success', 'warning'] as const).map(intent => ({
    fill: `var(--wr-color-${intent})`,
    ink: `var(--wr-color-${intent}-contrast)`,
  }));

  protected readonly snippet = `<wr-carousel [(active)]="i" autoplay style="aspect-ratio: 16 / 9">
  <wr-carousel-slide>Slide 1</wr-carousel-slide>
  <wr-carousel-slide>Slide 2</wr-carousel-slide>
</wr-carousel>`;

  protected readonly api = API.WrCarousel;

  protected readonly slideApi = API.WrCarouselSlide;
}
