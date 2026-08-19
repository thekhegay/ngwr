/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { Location, isPlatformBrowser } from '@angular/common';
import { EnvironmentInjector, Service, Injector, PLATFORM_ID, afterEveryRender, inject } from '@angular/core';

import { WrI18n } from 'ngwr/i18n';
import { WR_OVERLAY, WR_RESPONSIVE_OVERLAYS, wrAppendOverlayClose, wrPresentAsSheet } from 'ngwr/overlay';

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
 * @see https://ngwr.dev/reference/components/dialog
 */
@Service()
export class WrDialog {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly responsiveConfig = inject(WR_RESPONSIVE_OVERLAYS);
  private readonly i18n = inject(WrI18n, { optional: true });
  // Resolvable wherever the CDK's own `Overlay` is — it injects the same thing
  // to implement `disposeOnNavigation`.
  private readonly location = inject(Location);

  open<C, R = unknown, D = unknown>(component: ComponentType<C>, options: WrDialogOptions<D> = {}): WrDialogRef<C, R> {
    const panelClasses: string[] = [DEFAULT_PANEL_CLASS];
    const extra = options.panelClass;
    if (typeof extra === 'string') {
      panelClasses.push(extra);
    } else if (extra) {
      for (const cls of extra) panelClasses.push(cls);
    }

    // On small viewports (when opted in) present as a slide-up sheet pinned
    // to the bottom edge, full-width, instead of a centred modal.
    const asSheet = wrPresentAsSheet(options.responsive, this.responsiveConfig);
    if (asSheet) panelClasses.push('wr-overlay-sheet');

    const position = this.overlay.position().global().centerHorizontally();
    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: asSheet ? position.bottom('0') : position.centerVertically(),
      scrollStrategy: this.scrollStrategies.block(),
      hasBackdrop: true,
      backdropClass: DEFAULT_BACKDROP_CLASS,
      panelClass: panelClasses,
      width: asSheet ? '100%' : options.width,
      maxWidth: asSheet ? '100%' : options.maxWidth,
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
        // Provided as its own token as well, so dialog content can reach for
        // the familiar `inject(WrDialogRef)` and close itself.
        { provide: WrDialogRef, useValue: dialogRef },
      ],
    });

    const portal = new ComponentPortal(component, null, injector);
    dialogRef.componentRef = overlayRef.attach(portal);

    if (this.isBrowser) {
      const host = overlayRef.overlayElement;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      // Built-in dismiss. Appended after the content portal so it paints above
      // it, and marked on the panel so the title reserves the corner gutter.
      if (options.closable !== false) {
        host.classList.add('wr-dialog-panel--closable');
        const label = options.closeLabel ?? this.closeLabel();
        wrAppendOverlayClose(host, 'wr-dialog__close', label, () => dialogRef.close());
      }
      // Wire aria-labelledby to wrDialogTitle's auto-id once content is in DOM.
      // Has to wait for a render, not a microtask: attaching the portal only
      // schedules change detection, so under zoneless CD a microtask runs while
      // the content is still an empty view and the title id doesn't exist yet.
      //
      // And after EVERY render, not just the next one: the title belongs to the
      // caller's component, so an `@if` or a late-arriving heading can replace
      // or remove the element the attribute names. A reference to a node that is
      // no longer there is not a name — the dialog announces as unnamed — so a
      // missing title clears the attribute rather than leaving it dangling.
      const labelSync = afterEveryRender(
        () => {
          const titleEl = host.querySelector<HTMLElement>('[wrDialogTitle], [wr-dialog-title]');
          if (titleEl?.id) host.setAttribute('aria-labelledby', titleEl.id);
          else host.removeAttribute('aria-labelledby');
        },
        { injector: this.parentInjector }
      );
      // The hook is bound to the root injector, so it outlives the dialog unless
      // it is torn down with it. `detachments()` fires on dispose, which is the
      // one path every dismissal goes through.
      overlayRef.detachments().subscribe(() => labelSync.destroy());
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
    if (options.closeOnNavigation !== false) {
      this.watchNavigation(overlayRef, dialogRef);
    }

    return dialogRef;
  }

  /**
   * Tie the dialog's lifetime to the URL it was opened on.
   *
   * Nothing else does. The overlay belongs to a root service and is dismissed
   * only by the backdrop, Escape or an explicit `close()`, so pressing Back
   * swapped the routed view underneath and left the modal pane, its backdrop and
   * its focus trap sitting over a page the user never opened them on.
   *
   * `onUrlChange`, not `Location.subscribe()` — which is what CDK's own
   * `disposeOnNavigation` uses: `subscribe` fires on popstate alone, so an
   * in-app `router.navigate()` left the dialog standing. And `dialogRef.close()`
   * rather than disposing the overlay behind the ref's back, which would never
   * emit `closed`, never destroy the focus trap, and leave `awaitClose()`
   * pending forever.
   */
  private watchNavigation<C, R>(overlayRef: OverlayRef, dialogRef: WrDialogRef<C, R>): void {
    const stopWatching = this.location.onUrlChange(() => dialogRef.close());
    // Unhooked a microtask late, because `Location` notifies its listeners with
    // a `forEach` and unregistering splices the array it is iterating: removing
    // ours synchronously from inside the notification would shift the next entry
    // into the slot forEach has already passed, and a SECOND stacked dialog
    // would be skipped and left behind.
    overlayRef.detachments().subscribe(() => queueMicrotask(stopWatching));
  }

  /**
   * The dismiss button's accessible name.
   *
   * Two failure modes, and resolving PER OPEN is what covers both. `t()` hands
   * back the KEY on a miss, and `WrI18n` is root-provided with an empty catalog
   * by default, so an app that never configured i18n named its dismiss button
   * "dialog.close" — a name axe cannot fault, because a name is present, and a
   * screen reader reads out verbatim. Resolving once at injection time fixed
   * that but froze the answer: this is a root service, constructed before an
   * async catalog has loaded, so a localized app got the English fallback on
   * every dialog it ever opened.
   */
  private closeLabel(): string {
    const resolved = this.i18n?.t('dialog.close');
    return !resolved || resolved === 'dialog.close' ? 'Close dialog' : resolved;
  }
}
