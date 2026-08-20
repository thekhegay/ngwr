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

  /**
   * Intent tokens rather than literals. The old amber literal carried a
   * hard-coded white label at 1.71:1 — white on `warning` is unreachable at any
   * usable tone — and no gate ever saw it, because `wr-carousel-slide` marks
   * every off-screen slide `inert` + `aria-hidden`, so axe only ever measures
   * slide 1. `-contrast` picks black or white per fill, so the label follows.
   */
  protected readonly slides = (['primary', 'danger', 'success', 'warning'] as const).map(intent => ({
    fill: `var(--wr-color-${intent})`,
    ink: `var(--wr-color-${intent}-contrast)`,
  }));

  protected readonly snippet = `<wr-carousel [(active)]="i" autoplay>
  <wr-carousel-slide>Slide 1</wr-carousel-slide>
  <wr-carousel-slide>Slide 2</wr-carousel-slide>
</wr-carousel>`;

  protected readonly api = API.WrCarousel;
}
