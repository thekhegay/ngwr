/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { WrCarouselSlide } from './carousel-slide';

/**
 * Slide carousel. Project `<wr-carousel-slide>` children — the carousel
 * snaps between them with prev/next buttons and optional dots / autoplay.
 *
 * @example
 * ```html
 * <wr-carousel [(active)]="i" autoplay>
 *   <wr-carousel-slide><img src="a.jpg" /></wr-carousel-slide>
 *   <wr-carousel-slide><img src="b.jpg" /></wr-carousel-slide>
 *   <wr-carousel-slide><img src="c.jpg" /></wr-carousel-slide>
 * </wr-carousel>
 * ```
 *
 * @see https://ngwr.dev/components/carousel
 */
@Component({
  selector: 'wr-carousel',
  templateUrl: './carousel.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-carousel' },
})
export class WrCarousel {
  /** Active slide index. Two-way bindable. @default 0 */
  readonly active = model(0);

  /** Show prev / next arrow buttons. @default true */
  readonly showArrows = input(true, { transform: coerceBooleanProperty });

  /** Show dot indicators below the slides. @default true */
  readonly showDots = input(true, { transform: coerceBooleanProperty });

  /** Auto-advance slides. @default false */
  readonly autoplay = input(false, { transform: coerceBooleanProperty });

  /** Autoplay interval (ms). @default 4000 */
  readonly intervalMs = input(4000, {
    transform: (v: unknown): number => Math.max(500, coerceNumberProperty(v, 4000)),
  });

  /** Wrap around at the ends. @default true */
  readonly loop = input(true, { transform: coerceBooleanProperty });

  protected readonly slides = contentChildren(WrCarouselSlide);
  protected readonly count = computed(() => this.slides().length);

  /** CSS transform for the track. */
  protected readonly trackStyle = computed(() => `translateX(-${this.active() * 100}%)`);

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly paused = signal(false);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (!this.autoplay() || this.paused() || this.count() < 2) return;
      const interval = this.intervalMs();
      this.timer = setInterval(() => this.next(), interval);
    });

    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  protected onMouseEnter(): void {
    this.paused.set(true);
  }

  protected onMouseLeave(): void {
    this.paused.set(false);
  }

  // Imperative

  goTo(index: number): void {
    const max = this.count() - 1;
    if (max < 0) return;
    if (this.loop()) {
      const next = ((index % this.count()) + this.count()) % this.count();
      this.active.set(next);
    } else {
      this.active.set(Math.min(Math.max(0, index), max));
    }
  }

  next(): void {
    this.goTo(this.active() + 1);
  }

  prev(): void {
    this.goTo(this.active() - 1);
  }
}
