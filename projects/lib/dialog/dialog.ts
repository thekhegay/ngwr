/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ConfigurableFocusTrapFactory } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { Location, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  EnvironmentInjector,
  Service,
  Injector,
  PLATFORM_ID,
  type WritableSignal,
  afterEveryRender,
  inject,
  signal,
} from '@angular/core';

import { WrI18n } from 'ngwr/i18n';
import { WrMeta } from 'ngwr/meta';
import { WR_OVERLAY, wrAppendOverlayClose, wrFollowDirection } from 'ngwr/overlay';
import { wrToClassList } from 'ngwr/utils';

import { WrDialogConfirm } from './confirm/dialog-confirm';
import { WrDialogRef } from './dialog-ref';
import { WR_DIALOG_DATA, WR_DIALOG_DEFAULTS, WR_DIALOG_REF } from './tokens';
import type { WrDialogConfirmOptions, WrDialogOptions } from './types';

const DEFAULT_PANEL_CLASS = 'wr-dialog-panel';
const DEFAULT_BACKDROP_CLASS = 'wr-dialog-backdrop';

/**
 * Opens dialog components in an isolated NGWR overlay.
 *
 * Uses `WR_OVERLAY`, so dialogs render into NGWR's own overlay container
 * and never collide with other CDK consumers (Material, NG-ZORRO, etc.).
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
  private readonly i18n = inject(WrI18n, { optional: true });
  private readonly dir = inject(Directionality, { optional: true });
  // Resolvable wherever the CDK's own `Overlay` is — it injects the same thing
  // to implement `disposeOnNavigation`.
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly defaults = inject(WR_DIALOG_DEFAULTS);

  open<C, R = unknown, D = unknown>(component: ComponentType<C>, options: WrDialogOptions<D> = {}): WrDialogRef<C, R> {
    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.scrollStrategies.block(),
      hasBackdrop: true,
      backdropClass: DEFAULT_BACKDROP_CLASS,
      panelClass: wrToClassList(DEFAULT_PANEL_CLASS, options.panelClass),
      width: options.width,
      maxWidth: options.maxWidth,
    });

    // The CDK captures the direction as a string at create and never looks
    // again, so an app that flips while a dialog is up leaves the panel behind.
    // Nothing here derives from it — the box is centred and its x offset is
    // empty, so `apply()`'s RTL branch moves nothing — but the `dir` attribute
    // is what the dialog's own logical CSS and every ngwr control inside it
    // resolve `start` and `end` against, so it has to follow. No teardown kept:
    // the follower ends on the ref's own `detachments()`, which every dismissal
    // path goes through, and each `open()` creates a fresh ref of its own.
    wrFollowDirection(overlayRef, this.dir, this.parentInjector);

    const dialogRef = new WrDialogRef<C, R>(overlayRef, this.parentInjector);

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

    // Wired BEFORE the panel is decorated, and the order is the fix: everything
    // below attaches attributes, a ✕ and a focus trap to an overlay that is
    // already on screen, so anything that throws in there used to leave an
    // `aria-modal` panel with no dismissal path at all — no ✕, no backdrop
    // handler, no Escape — over the whole application, and no ref for the caller
    // to close it with. A dialog that fails to finish opening must still be one
    // the user can get rid of. Overlay subscriptions complete when the overlay is
    // disposed, so no explicit teardown is required.
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

    if (this.isBrowser) {
      const host = overlayRef.overlayElement;
      const role = options.role ?? 'dialog';
      host.setAttribute('role', role);
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
      //
      // An `alertdialog` is described by its content the same way: the message
      // is the dialog, and it can be conditional too.
      const tabTitle = (options.tabTitle ?? this.defaults.tabTitle) ? this.nameTab(overlayRef) : null;
      const labelSync = afterEveryRender(
        () => {
          const titleEl = host.querySelector<HTMLElement>('[wrDialogTitle], [wr-dialog-title]');
          if (titleEl?.id) host.setAttribute('aria-labelledby', titleEl.id);
          else host.removeAttribute('aria-labelledby');
          tabTitle?.set((titleEl?.textContent ?? '').replace(/\s+/g, ' ').trim());
          if (role !== 'alertdialog') return;
          const contentEl = host.querySelector<HTMLElement>('[wrDialogContent], [wr-dialog-content]');
          if (contentEl?.id) host.setAttribute('aria-describedby', contentEl.id);
          else host.removeAttribute('aria-describedby');
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

    return dialogRef;
  }

  /**
   * Ask a yes-or-no question and get the answer: `true` only when the user
   * pressed the confirm button. Escape, the backdrop, the cancel button, a
   * navigation and the application being torn down all resolve `false`. The
   * promise settles exactly once and never rejects, so the caller needs no
   * `catch` and no cleanup.
   *
   * The dialog is `role="alertdialog"`, named by `title` and described by
   * `message`, with no corner dismiss: the two buttons are the answers. Labels
   * fall back to the `common.ok` and `common.cancel` catalog keys. With
   * `confirmColor: 'danger'` initial focus is on the cancel button; otherwise it
   * is on the confirm button. Focus returns to the opener on close, as it does
   * for `open()`.
   *
   * On the server nothing can answer, so it resolves `false` at once and opens
   * nothing.
   *
   * @example
   * ```ts
   * const ok = await dialog.confirm({
   *   title: 'Delete this item?',
   *   message: 'This cannot be undone.',
   *   confirmLabel: 'Delete',
   *   confirmColor: 'danger',
   * });
   * if (ok) remove();
   * ```
   */
  async confirm(options: WrDialogConfirmOptions): Promise<boolean> {
    if (!this.isBrowser) return false;
    const { title, message, confirmLabel, cancelLabel, confirmColor, ...rest } = options;
    const ref = this.open<WrDialogConfirm, boolean, WrDialogConfirmOptions>(WrDialogConfirm, {
      ...rest,
      role: 'alertdialog',
      closable: false,
      data: { title, message, confirmLabel, cancelLabel, confirmColor },
    });
    // The root injector going away takes the overlay container with it and
    // completes nothing, which would leave this promise pending for good.
    const unhook = this.destroyRef.onDestroy(() => ref.close());
    ref.closed.subscribe({ complete: unhook });
    return (await ref.awaitClose()) === true;
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
   * Put the dialog's title in front of the page title for as long as the
   * overlay is attached, and hand back where to write that title.
   *
   * A `titlePrefix` layer rather than a composed `title`: the page title stays
   * whatever the layers under it resolve to, so a page that retitles itself
   * under an open dialog is followed, and closing restores nothing, it only
   * removes the layer. Stacked dialogs each hold a layer and the top one wins.
   *
   * `WrMeta` is resolved here and not injected with the service: constructing
   * it applies its defaults to `<head>`, which an app that never asked for
   * `tabTitle` must not pay for.
   */
  private nameTab(overlayRef: OverlayRef): WritableSignal<string> {
    const heading = signal('');
    const layer = this.parentInjector.get(WrMeta).bind(() => (heading() ? { titlePrefix: heading() } : {}));
    overlayRef.detachments().subscribe(() => layer.pop());
    return heading;
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
