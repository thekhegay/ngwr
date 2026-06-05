/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  Component,
  DestroyRef,
  TemplateRef,
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
 * <wr-image
 *   src="/photo.jpg"
 *   alt="Mountain"
 *   style="width: 16rem; height: 10rem; object-fit: cover"
 * />
 * ```
 *
 * @see https://ngwr.dev/components/image
 */
@Component({
  selector: 'wr-image',
  templateUrl: './image.html',
  styleUrl: './image.scss',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
})
export class WrImage {
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

  protected readonly open = signal(false);
  protected readonly loaded = signal(false);

  protected readonly classes = computed(() => {
    const parts = ['wr-image'];
    if (this.open()) parts.push('wr-image--open');
    if (!this.loaded()) parts.push('wr-image--loading');
    return parts.join(' ');
  });

  protected readonly panelTpl = viewChild.required(TemplateRef);

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

  protected onLoad(): void {
    this.loaded.set(true);
  }

  // ──────── Overlay ────────

  private openOverlay(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'wr-image-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: 'wr-image-overlay',
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
