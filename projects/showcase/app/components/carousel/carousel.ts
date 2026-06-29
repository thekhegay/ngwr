import { Component, signal } from '@angular/core';

import { WrCarousel, WrCarouselSlide } from 'ngwr/carousel';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

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
  protected readonly slides = ['#3969e2', '#f51c6a', '#00a400', '#ffba00'];

  protected readonly snippet = `<wr-carousel [(active)]="i" autoplay>
  <wr-carousel-slide>Slide 1</wr-carousel-slide>
  <wr-carousel-slide>Slide 2</wr-carousel-slide>
</wr-carousel>`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'active', description: 'Active slide index. Two-way bindable.', type: 'number', default: '0' },
    { name: 'showArrows', description: 'Show prev / next arrows.', type: 'boolean', default: 'true' },
    { name: 'showDots', description: 'Show dot indicators.', type: 'boolean', default: 'true' },
    { name: 'autoplay', description: 'Auto-advance slides.', type: 'boolean', default: 'false' },
    { name: 'intervalMs', description: 'Autoplay interval in ms.', type: 'number', default: '4000' },
    { name: 'loop', description: 'Wrap around at the ends.', type: 'boolean', default: 'true' },
  ];
}
