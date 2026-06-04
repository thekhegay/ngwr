/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { type ConfigurableFocusTrap, ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WR_OVERLAY } from 'ngwr/overlay';

/**
 * Mobile-friendly drawer that slides up from the bottom. Renders into a
 * CDK overlay, traps focus, and binds `open` two-way.
 *
 * Visually distinguished from `<wr-drawer position="bottom">` by:
 *  - Rounded top corners
 *  - A drag-handle indicator at the top edge
 *  - Default backdrop click + Escape to close
 *
 * @example
 * ```html
 * <wr-bottom-sheet [(open)]="settingsOpen" height="40vh">
 *   <h2>Settings</h2>
 *   <p>…</p>
 * </wr-bottom-sheet>
 * ```
 *
 * @see https://ngwr.dev/components/bottom-sheet
 */
@Component({
  selector: 'wr-bottom-sheet',
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:none' },
})
export class WrBottomSheet {
  /** Two-way bindable open state. */
  readonly open = model<boolean>(false);

  /** Sheet height. Any CSS length (`'40vh'`, `'20rem'`). @default 'auto' */
  readonly height = input<string>('auto');

  /** Max height — prevents the sheet from covering the whole viewport. @default '90vh' */
  readonly maxHeight = input<string>('90vh');

  /** Show the dimming backdrop. @default true */
  readonly hasBackdrop = input(true, { transform: coerceBooleanProperty });

  /** Close when the backdrop is clicked. @default true */
  readonly closeOnBackdropClick = input(true, { transform: coerceBooleanProperty });

  /** Close on Escape. @default true */
  readonly closeOnEscape = input(true, { transform: coerceBooleanProperty });

  /** Show the visual drag-handle indicator at the top. @default true */
  readonly showHandle = input(true, { transform: coerceBooleanProperty });

  /** Accessible label for the dialog region. @default 'Bottom sheet' */
  readonly ariaLabel = input<string>('Bottom sheet');

  protected readonly panelTpl = viewChild.required(TemplateRef);

  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly focusTraps = inject(ConfigurableFocusTrapFactory);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private overlayRef: OverlayRef | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) this.openOverlay();
      else this.closeOverlay();
    });
  }

  protected onClose(): void {
    this.open.set(false);
  }

  private openOverlay(): void {
    if (this.overlayRef || !this.isBrowser) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: this.hasBackdrop(),
      backdropClass: 'wr-bottom-sheet-backdrop',
      positionStrategy: this.overlay.position().global().bottom('0').centerHorizontally(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: 'wr-bottom-sheet-overlay',
      width: '100%',
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    // Focus trap inside the sheet.
    this.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
    this.focusTrap = this.focusTraps.create(this.overlayRef.overlayElement);
    void this.focusTrap.focusInitialElementWhenReady();

    if (this.closeOnBackdropClick()) {
      this.overlayRef
        .backdropClick()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.open.set(false));
    }

    if (this.closeOnEscape()) {
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
  }

  private closeOverlay(): void {
    if (!this.overlayRef) return;
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }
}
