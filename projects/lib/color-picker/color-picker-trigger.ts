/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  ViewContainerRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';

import { WrColorPicker } from './color-picker';
import type { WrColorFormat } from './types';

/**
 * Opens a `<wr-color-picker>` in an overlay anchored to the host element.
 *
 * Apply to any clickable element (typically a button). Two-way binds the
 * current colour through `[(value)]`; forwards `alpha` / `format` /
 * `swatches` / `disabled` to the inner picker.
 *
 * Same overlay isolation as the rest of the lib — uses {@link WR_OVERLAY},
 * not CDK's root container.
 *
 * @example
 * ```html
 * <button wrColorPickerTrigger
 *         [(value)]="brandColor"
 *         [swatches]="palette">
 *   <span class="swatch" [style.background]="brandColor"></span>
 *   {{ brandColor }}
 * </button>
 * ```
 *
 * @see https://ngwr.dev/docs/components/color-picker
 */
@Directive({
  selector: '[wrColorPickerTrigger]',
  host: { '(click)': 'toggle()' },
})
export class WrColorPickerTrigger {
  /** Two-way bindable colour value (hex string). */
  readonly value = model<string>('');

  /** Forwarded to the inner picker. @default true */
  readonly alpha = input(true, { transform: coerceBooleanProperty });

  /** Forwarded to the inner picker. @default 'hex' */
  readonly format = input<WrColorFormat>('hex');

  /** Forwarded to the inner picker. @default [] */
  readonly swatches = input<readonly string[]>([]);

  /** Disable the trigger entirely. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Fires after the picker opens. */
  readonly opened = output<void>();

  /** Fires after the picker closes. */
  readonly closed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isOpen = signal(false);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** Toggle the picker. Open if closed, close if open. */
  toggle(): void {
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Open the picker. No-op if already open. */
  open(): void {
    if (this.isOpen() || this.disabled()) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
      ])
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.reposition(),
      panelClass: 'wr-color-picker-overlay',
    });

    const portal = new ComponentPortal(WrColorPicker, this.vcr);
    const ref = this.overlayRef.attach(portal);

    ref.setInput('alpha', this.alpha());
    ref.setInput('format', this.format());
    ref.setInput('swatches', this.swatches());
    ref.setInput('disabled', this.disabled());
    ref.instance.writeValue(this.value());

    // Bridge inner picker's CVA onChange to our two-way [(value)] model.
    ref.instance.registerOnChange((next: string) => this.value.set(next));

    // Outside-click → close (CDK's outsidePointerEvents only fires for clicks
    // outside the overlay pane; we also need to ignore re-clicks on the host).
    this.overlayRef
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (this.host.nativeElement.contains(event.target as Node)) return;
        this.close();
      });

    // Escape → close.
    this.overlayRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
        }
      });

    this.isOpen.set(true);
    this.opened.emit();
  }

  /** Close the picker. No-op if already closed. */
  close(): void {
    if (!this.isOpen()) return;
    this.dispose();
    this.isOpen.set(false);
    this.closed.emit();
  }

  private dispose(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
