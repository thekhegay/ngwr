/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { isPlatformBrowser } from '@angular/common';
import { EnvironmentInjector, Service, Injector, PLATFORM_ID, inject } from '@angular/core';

import { WR_OVERLAY } from 'ngwr/overlay';

import { WrDialogRef } from './dialog-ref';
import type { WrDialogOptions } from './interfaces';
import { WR_DIALOG_DATA, WR_DIALOG_REF } from './tokens';

const DEFAULT_PANEL_CLASS = 'wr-dialog-panel';
const DEFAULT_BACKDROP_CLASS = 'wr-dialog-backdrop';

/**
 * Opens dialog components in an isolated NGWR overlay.
 *
 * Uses `WR_OVERLAY` so it composes cleanly with `provideWrOverlay()`
 * — dialogs render into NGWR's own overlay container and never collide
 * with other CDK consumers (Material, NG-ZORRO, etc.).
 *
 * @example
 * ```ts
 * const dialog = inject(WrDialog);
 *
 * const ref = dialog.open(ConfirmComponent, {
 *   data: { message: 'Delete this item?' },
 *   width: '24rem',
 * });
 *
 * const ok = await ref.awaitClose();
 * if (ok) remove();
 * ```
 *
 * @see https://ngwr.dev/docs/components/dialog
 */
@Service()
export class WrDialog {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  open<C, R = unknown, D = unknown>(component: ComponentType<C>, options: WrDialogOptions<D> = {}): WrDialogRef<C, R> {
    const panelClasses: string[] = [DEFAULT_PANEL_CLASS];
    const extra = options.panelClass;
    if (typeof extra === 'string') {
      panelClasses.push(extra);
    } else if (extra) {
      for (const cls of extra) panelClasses.push(cls);
    }

    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.scrollStrategies.block(),
      hasBackdrop: true,
      backdropClass: DEFAULT_BACKDROP_CLASS,
      panelClass: panelClasses,
      width: options.width,
      maxWidth: options.maxWidth,
    });

    const dialogRef = new WrDialogRef<C, R>(overlayRef);

    if (this.isBrowser) {
      const active = document.activeElement;
      dialogRef.previouslyFocused = active instanceof HTMLElement ? active : null;
    }

    const injector = Injector.create({
      parent: this.parentInjector,
      providers: [
        { provide: WR_DIALOG_DATA, useValue: options.data },
        { provide: WR_DIALOG_REF, useValue: dialogRef },
      ],
    });

    const portal = new ComponentPortal(component, null, injector);
    dialogRef.componentRef = overlayRef.attach(portal);

    if (this.isBrowser) {
      const host = overlayRef.overlayElement;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      // Wire aria-labelledby to wrDialogTitle's auto-id once content is in DOM.
      queueMicrotask(() => {
        const titleEl = host.querySelector<HTMLElement>('[wrDialogTitle], [wr-dialog-title]');
        if (titleEl?.id) host.setAttribute('aria-labelledby', titleEl.id);
      });
      // Trap focus inside the dialog and move initial focus in.
      const trap = this.focusTrapFactory.create(host);
      dialogRef.focusTrap = trap;
      void trap.focusInitialElementWhenReady();
    }

    // Overlay subscriptions complete when the overlay is disposed, so no
    // explicit teardown is required.
    if (options.closeOnBackdropClick !== false) {
      overlayRef.backdropClick().subscribe(() => dialogRef.close());
    }
    if (options.closeOnEscape !== false) {
      overlayRef.keydownEvents().subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          dialogRef.close();
        }
      });
    }

    return dialogRef;
  }
}
