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

  // The height is in the snippet because the component cannot supply one: the
  // viewport, the track and every slide are `height: 100%`, so a carousel with
  // no height of its own collapses to a single line of text with the arrows and
  // the dots overlapping it. The demo beside this always set one and the printed
  // code never did, which is the shape of a snippet nobody pasted.
  protected readonly snippet = `<!-- The height is yours: everything inside the carousel is \`height: 100%\`. -->
<wr-carousel [(active)]="i" autoplay style="aspect-ratio: 16 / 9">
  <wr-carousel-slide>Slide 1</wr-carousel-slide>
  <wr-carousel-slide>Slide 2</wr-carousel-slide>
</wr-carousel>`;

  protected readonly api = API.WrCarousel;

  /**
   * `<wr-carousel-slide>` has one input and it was documented nowhere. Its own
   * table rather than a row on the carousel's: the generated map keys by class,
   * and a hand-written row for it would be the one thing on this page nothing
   * compares against the library.
   */
  protected readonly slideApi = API.WrCarouselSlide;
}
