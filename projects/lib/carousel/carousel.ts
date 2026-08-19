/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  contentChildren,
  forwardRef,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { useI18nFormatter, useI18nText } from 'ngwr/i18n';

import { WrCarouselSlide } from './carousel-slide';
import { WR_CAROUSEL, type WrCarouselContext } from './tokens';

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
 * @see https://ngwr.dev/reference/components/carousel
 */
@Component({
  selector: 'wr-carousel',
  templateUrl: './carousel.html',
  encapsulation: ViewEncapsulation.None,
  // On the HOST, not the viewport: the arrows and dots are the viewport's siblings, so
  // viewport-scoped listeners let a slide change under a cursor aiming at an arrow.
  // `focusin` / `focusout` are the keyboard half — WCAG 2.2.2 wants a way to stop
  // moving content, and hovering is not one for someone who never uses a mouse.
  host: {
    class: 'wr-carousel',
    '(mouseenter)': 'onPauseIn()',
    '(mouseleave)': 'onPauseOut()',
    '(focusin)': 'onPauseIn()',
    '(focusout)': 'onPauseOut()',
  },
  providers: [
    {
      provide: WR_CAROUSEL,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrCarousel),
    },
  ],
})
export class WrCarousel implements WrCarouselContext {
  /** Accessible name of the previous-slide button. Falls back to `carousel.prev`. */
  readonly prevLabel = input<string | null>(null);

  /** Accessible name of the next-slide button. Falls back to `carousel.next`. */
  readonly nextLabel = input<string | null>(null);

  /** Accessible name of the dot group. Falls back to `carousel.pagination`. */
  readonly paginationLabel = input<string | null>(null);

  protected readonly resolvedPrevLabel = useI18nText(this.prevLabel, 'carousel.prev', 'Previous slide');
  protected readonly resolvedNextLabel = useI18nText(this.nextLabel, 'carousel.next', 'Next slide');
  protected readonly resolvedPaginationLabel = useI18nText(
    this.paginationLabel,
    'carousel.pagination',
    'Carousel pagination'
  );

  /** Accessible name of the carousel itself. Falls back to `carousel.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'carousel.label', 'Carousel');

  /**
   * Word a screen reader speaks IN PLACE OF the `group` role. Falls back to
   * `carousel.roledescription`, then `'carousel'`.
   */
  readonly roledescription = input<string | null>(null);

  // Routed for the same reason the name above is: `aria-roledescription` is spoken
  // verbatim, so a static English "carousel" made the viewport announce
  // "Карусель, carousel" with the localized arrows right beside it.
  protected readonly resolvedRoledescription = useI18nText(
    this.roledescription,
    'carousel.roledescription',
    'carousel'
  );

  // The three labels above route through the catalog; this one was a hard-coded
  // English template, so a localized app got two languages in one pagination strip.
  protected readonly slideLabel = useI18nFormatter('carousel.goToSlide', 'Go to slide {{index}}');

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

  /**
   * Where a slide sits in projection order — {@link WrCarouselContext}.
   *
   * Public only because the child injects the parent through `WR_CAROUSEL`;
   * reading `slides()` here is what makes the child's `computed()` re-run when a
   * slide is added or removed.
   */
  indexOf(slide: object): number {
    return this.slides().indexOf(slide as WrCarouselSlide);
  }

  /** Live horizontal drag offset (px) during a touch swipe. */
  protected readonly dragX = signal(0);
  protected readonly dragging = signal(false);

  private readonly dir = inject(Directionality, { optional: true });

  /**
   * Reading direction of the track. `Directionality` is root-provided, so this
   * always resolves — `optional` only guards a consumer who has deliberately
   * torn the provider out. It reads the document once at construction; a
   * subtree that overrides the direction does it with the CDK's `Dir`
   * directive, which writes `valueSignal`, so `trackStyle` re-renders instead
   * of leaving the track parked on the old side.
   */
  private readonly isRtl = computed(() => this.dir?.valueSignal() === 'rtl');

  /** CSS transform for the track — the per-slide offset plus any live drag. */
  protected readonly trackStyle = computed(() => {
    // `translateX` is PHYSICAL while the slides are laid out on the inline axis:
    // under `dir="rtl"` the flex track runs right-to-left, so slide 1 sits to the
    // LEFT of slide 0 and reaching it means moving the track the other way. Left
    // unsigned, every RTL carousel translated itself off into blank space.
    const base = (this.isRtl() ? 1 : -1) * this.active() * 100;
    // The drag stays physical on purpose: it is the finger's own displacement,
    // and the track follows the finger in both directions.
    const drag = this.dragX();
    return drag === 0 ? `translateX(${base}%)` : `translateX(calc(${base}% + ${drag}px))`;
  });

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly paused = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect(() => {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      // `isBrowser` first: without it the prerender ran the timer too, doing work
      // nobody will ever see on a slide index that then gets serialized.
      if (!this.isBrowser || !this.autoplay() || this.paused() || this.count() < 2) return;
      const interval = this.intervalMs();
      this.timer = setInterval(() => this.next(), interval);
    });

    // `active` is a plain `model`, so `[(active)]` and a shrinking slide list both
    // write into it unchecked — a filtered list left it pointing past the end,
    // translating the track into blank space with no dot lit.
    effect(() => {
      const max = this.count() - 1;
      if (max < 0) return;
      const clamped = Math.min(Math.max(0, this.active()), max);
      if (clamped !== this.active()) this.active.set(clamped);
    });

    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  protected onPauseIn(): void {
    this.paused.set(true);
  }

  protected onPauseOut(): void {
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

  // Swipe navigation — the track follows the finger; releasing past ~20% of the
  // viewport advances a slide, otherwise snaps back. Which way that is follows
  // the reading direction: dragging toward the inline start (left in LTR, right
  // in RTL) pulls the next slide into view.

  private swipeStartX = 0;

  protected onSwipeStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) return;
    this.swipeStartX = touch.clientX;
    this.dragging.set(true);
    this.paused.set(true); // hold autoplay while dragging
  }

  protected onSwipeMove(event: TouchEvent): void {
    if (!this.dragging()) return;
    const touch = event.touches[0];
    if (!touch) return;
    this.dragX.set(touch.clientX - this.swipeStartX);
  }

  protected onSwipeEnd(event: TouchEvent, viewport: HTMLElement): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const dx = this.dragX();
    this.dragX.set(0);
    this.paused.set(false);
    const threshold = (viewport.offsetWidth || 0) * 0.2;
    // `dx` is a physical delta. The next slide sits to the physical RIGHT in LTR
    // and to the LEFT in RTL, so the drag that pulls it into view — and with it
    // the sign that advances — turns around with the direction. The buttons keep
    // their semantics either way; only the gesture is physical.
    const advance = this.isRtl() ? dx >= threshold : dx <= -threshold;
    const retreat = this.isRtl() ? dx <= -threshold : dx >= threshold;
    if (advance) this.next();
    else if (retreat) this.prev();
  }
}
