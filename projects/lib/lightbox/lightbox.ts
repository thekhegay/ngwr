/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import type { TemplateRef } from '@angular/core';
import {
  Component,
  DestroyRef,
  ViewContainerRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';

/**
 * Image with click-to-zoom lightbox. The thumbnail is a plain `<img>`
 * with whatever sizing/`object-fit` you give it; clicking opens a CDK
 * overlay showing the full image, with Escape + close button + backdrop
 * to dismiss.
 *
 * @example
 * ```html
 * <wr-lightbox
 *   src="/photo.jpg"
 *   alt="Mountain"
 *   style="width: 16rem; height: 10rem; object-fit: cover"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/lightbox
 */
@Component({
  selector: 'wr-lightbox',
  templateUrl: './lightbox.html',
  styleUrl: './lightbox.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[style.aspect-ratio]': 'aspectRatio()',
  },
})
export class WrLightbox {
  /** Image source. */
  readonly src = input.required<string>();

  /** Alt text. Required for a11y; falls back to an empty string. @default '' */
  readonly alt = input<string>('');

  /** Optional preview src — shown until the full image loads. */
  readonly preview = input<string | null>(null);

  /** Disable the click-to-zoom lightbox. @default false */
  readonly disablePreview = input(false, { transform: coerceBooleanProperty });

  /** Caption shown under the full image in the lightbox. */
  readonly caption = input<string>('');

  /**
   * Reserve space before the image resolves by fixing the thumbnail's
   * `aspect-ratio` (e.g. `'16 / 9'`, `'4 / 3'`, or a number like `1.5`).
   * Prevents the layout jump when the intrinsic image size isn't known up
   * front — pair it with a `width` and the box keeps its height from first
   * paint. @default null
   */
  readonly aspectRatio = input<string | number | null>(null);

  protected readonly open = signal(false);
  protected readonly loaded = signal(false);

  protected readonly classes = computed(() => {
    const parts = ['wr-lightbox'];
    if (this.open()) parts.push('wr-lightbox--open');
    if (!this.loaded()) parts.push('wr-lightbox--loading');
    return parts.join(' ');
  });

  // Query by name — `@if` blocks register their own TemplateRefs, so an
  // unqualified TemplateRef query would grab the thumbnail branch instead.
  protected readonly panelTpl = viewChild.required<TemplateRef<unknown>>('viewerTpl');

  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    effect(() => {
      if (this.open()) this.openOverlay();
      else this.closeOverlay();
    });
  }

  protected onClick(): void {
    if (this.disablePreview()) return;
    this.open.set(true);
  }

  protected onClose(): void {
    this.open.set(false);
  }

  // Swipe-down-to-dismiss on the open viewer. The image follows the finger and
  // fades; releasing past ~20% of the viewer height closes it.
  private viewerStartY = 0;
  private viewerSwiping = false;

  protected onViewerSwipeStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) return;
    this.viewerStartY = touch.clientY;
    this.viewerSwiping = true;
  }

  protected onViewerSwipeMove(event: TouchEvent, viewer: HTMLElement): void {
    if (!this.viewerSwiping) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dy = touch.clientY - this.viewerStartY;
    if (dy <= 0) {
      viewer.style.transform = '';
      viewer.style.opacity = '';
      return;
    }
    event.preventDefault();
    viewer.style.transition = 'none';
    viewer.style.transform = `translateY(${dy}px)`;
    viewer.style.opacity = String(Math.max(0.3, 1 - dy / (viewer.offsetHeight || 1)));
  }

  protected onViewerSwipeEnd(event: TouchEvent, viewer: HTMLElement): void {
    if (!this.viewerSwiping) return;
    this.viewerSwiping = false;
    const touch = event.changedTouches[0];
    const dy = touch ? touch.clientY - this.viewerStartY : 0;
    if (dy > (viewer.offsetHeight || 0) * 0.2) {
      this.onClose();
    } else {
      viewer.style.transition = '';
      viewer.style.transform = '';
      viewer.style.opacity = '';
    }
  }

  protected onLoad(): void {
    this.loaded.set(true);
  }

  // Overlay

  private openOverlay(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'wr-lightbox-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: 'wr-lightbox-overlay',
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.open.set(false));

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.open.set(false);
        }
      });
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
  }
}
