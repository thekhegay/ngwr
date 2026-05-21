/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, ViewContainerRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';
import type { WrColor } from 'ngwr/theme';

import { WrPopconfirmComponent } from './popconfirm.component';
import { WR_POPCONFIRM_POSITIONS, type WrPopconfirmPosition } from './types';

/**
 * Small "Are you sure?" panel anchored to its trigger. Fires `confirmed`
 * or `cancelled` and closes automatically. Built on CDK Overlay.
 *
 * @example
 * ```html
 * <wr-btn
 *   color="danger"
 *   [wrPopconfirm]="'Delete this item?'"
 *   confirmColor="danger"
 *   confirmText="Delete"
 *   (confirmed)="remove()"
 * >Delete</wr-btn>
 * ```
 *
 * @see https://ngwr.dev/docs/components/popconfirm
 */
@Directive({
  selector: '[wrPopconfirm]',
  host: { '(click)': 'toggle($event)' },
})
export class WrPopconfirmDirective {
  /** Confirmation message. */
  readonly message = input.required<string>({ alias: 'wrPopconfirm' });

  /** Anchor side. @default 'top' */
  readonly position = input<WrPopconfirmPosition>('top');

  /** Label for the confirm button. @default 'Confirm' */
  readonly confirmText = input<string>('Confirm');

  /** Label for the cancel button. @default 'Cancel' */
  readonly cancelText = input<string>('Cancel');

  /** Color of the confirm button. @default 'primary' */
  readonly confirmColor = input<WrColor>('primary');

  /** Fires when the user clicks confirm. */
  readonly confirmed = output<void>();

  /** Fires when the user clicks cancel or dismisses the overlay. */
  readonly cancelled = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** @internal */
  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.overlayRef) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(WR_POPCONFIRM_POSITIONS[this.position()])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: ['wr-popconfirm-overlay', `wr-popconfirm-overlay--${this.position()}`],
    });

    const portal = new ComponentPortal(WrPopconfirmComponent, this.vcr);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('message', this.message());
    ref.setInput('confirmText', this.confirmText());
    ref.setInput('cancelText', this.cancelText());
    ref.setInput('confirmColor', this.confirmColor());

    ref.instance.confirmed.subscribe(() => {
      this.confirmed.emit();
      this.close();
    });
    ref.instance.cancelled.subscribe(() => this.dismiss());

    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.dismiss();
      });

    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.dismiss();
        }
      });
  }

  close(): void {
    this.dispose();
  }

  private dismiss(): void {
    if (!this.overlayRef) return;
    this.cancelled.emit();
    this.dispose();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
