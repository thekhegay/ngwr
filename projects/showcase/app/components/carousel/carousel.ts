import { Component, signal } from '@angular/core';

import { WrCarousel, WrCarouselSlide } from 'ngwr/carousel';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-carousel-page',
  templateUrl: './carousel.html',
  imports: [WrCarousel, WrCarouselSlide, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class CarouselPageComponent {
  protected readonly idx = signal(0);
  protected readonly slides = ['#3969e2', '#f51c6a', '#00a400', '#ffba00'];

  protected readonly snippet = `<wr-carousel [(active)]="i" autoplay>
  <wr-carousel-slide>Slide 1</wr-carousel-slide>
  <wr-carousel-slide>Slide 2</wr-carousel-slide>
</wr-carousel>`;
}
