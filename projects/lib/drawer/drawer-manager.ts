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
import { EnvironmentInjector, Injector, PLATFORM_ID, Service, inject } from '@angular/core';

import { WR_OVERLAY } from 'ngwr/overlay';

import { WrDrawerRef } from './drawer-ref';
import type { WrDrawerOptions, WrDrawerPosition } from './interfaces';
import { WR_DRAWER_DATA, WR_DRAWER_REF } from './tokens';

const DEFAULT_POSITION: WrDrawerPosition = 'right';
const DEFAULT_WIDTH = '20rem';
const DEFAULT_HEIGHT = '16rem';
const BACKDROP_CLASS = 'wr-drawer-backdrop';

/**
 * Opens drawer components in an isolated NGWR overlay — the programmatic
 * counterpart to `<wr-drawer [(open)]="…">`.
 *
 * Use the component when the drawer is part of a template and its open state
 * is a signal you already own; use this service when the caller doesn't own
 * the markup (opening a chat panel from a toolbar action, from an effect, from
 * a route guard) or when you need the close result.
 *
 * Uses `WR_OVERLAY` so it composes cleanly with `provideWrOverlay()`
 * — drawers render into NGWR's own overlay container and never collide
 * with other CDK consumers (Material, NG-ZORRO, etc.).
 *
 * `showHandle` / swipe-to-dismiss is component-only: it needs the drawer's own
 * wrapper markup, which the service path replaces with your component.
 *
 * @example
 * ```ts
 * const drawers = inject(WrDrawerManager);
 *
 * const ref = drawers.open(ChatComponent, {
 *   data: { threadId },
 *   position: 'right',
 *   width: '28rem',
 * });
 *
 * await ref.awaitClose();
 * ```
 *
 * @see https://ngwr.dev/reference/components/drawer
 */
@Service()
export class WrDrawerManager {
  private readonly overlay = inject(WR_OVERLAY);
  private readonly scrollStrategies = inject(ScrollStrategyOptions);
  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  open<C, R = unknown, D = unknown>(component: ComponentType<C>, options: WrDrawerOptions<D> = {}): WrDrawerRef<C, R> {
    const position = options.position ?? DEFAULT_POSITION;
    const isHorizontal = position === 'left' || position === 'right';

    // The content component is attached straight into the overlay pane, so the
    // panel styles land on the pane rather than on an inner wrapper.
    const panelClasses = [
      'wr-drawer-overlay',
      `wr-drawer-overlay--${position}`,
      'wr-drawer__panel',
      `wr-drawer__panel--${position}`,
    ];
    if (options.rounded) panelClasses.push('wr-drawer__panel--rounded');
    if (options.safeArea) panelClasses.push('wr-drawer__panel--safe-area');
    const extra = options.panelClass;
    if (typeof extra === 'string') {
      panelClasses.push(extra);
    } else if (extra) {
      for (const cls of extra) panelClasses.push(cls);
    }

    const positionStrategy = this.overlay
      .position()
      .global()
      [position === 'left' ? 'left' : position === 'right' ? 'right' : 'centerHorizontally']();

    if (position === 'top') positionStrategy.top();
    else if (position === 'bottom') positionStrategy.bottom();
    else positionStrategy.centerVertically();

    const cap = options.maxHeight ?? null;

    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.scrollStrategies.block(),
      hasBackdrop: options.hasBackdrop !== false,
      backdropClass: BACKDROP_CLASS,
      panelClass: panelClasses,
      width: isHorizontal ? (options.width ?? DEFAULT_WIDTH) : '100vw',
      height: isHorizontal ? undefined : (options.height ?? DEFAULT_HEIGHT),
      maxHeight: isHorizontal ? undefined : (cap ?? undefined),
    });

    const drawerRef = new WrDrawerRef<C, R>(overlayRef);

    if (this.isBrowser) {
      const active = document.activeElement;
      drawerRef.previouslyFocused = active instanceof HTMLElement ? active : null;
    }

    const injector = Injector.create({
      parent: this.parentInjector,
      providers: [
        { provide: WR_DRAWER_DATA, useValue: options.data },
        { provide: WR_DRAWER_REF, useValue: drawerRef },
        // Provided as its own token as well, so drawer content can reach for
        // the familiar `inject(WrDrawerRef)` and close itself.
        { provide: WrDrawerRef, useValue: drawerRef },
      ],
    });

    const portal = new ComponentPortal(component, null, injector);
    drawerRef.componentRef = overlayRef.attach(portal);

    if (this.isBrowser) {
      const host = overlayRef.overlayElement;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      // Wire aria-labelledby to wrDrawerTitle's auto-id once content is in DOM.
      queueMicrotask(() => {
        const titleEl = host.querySelector<HTMLElement>('[wrDrawerTitle], [wr-drawer-title]');
        if (titleEl?.id) host.setAttribute('aria-labelledby', titleEl.id);
      });
      // Trap focus inside the drawer and move initial focus in.
      const trap = this.focusTrapFactory.create(host);
      drawerRef.focusTrap = trap;
      void trap.focusInitialElementWhenReady();
    }

    // Overlay subscriptions complete when the overlay is disposed, so no
    // explicit teardown is required.
    if (options.closeOnBackdropClick !== false) {
      overlayRef.backdropClick().subscribe(() => drawerRef.close());
    }
    if (options.closeOnEscape !== false) {
      overlayRef.keydownEvents().subscribe(event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          drawerRef.close();
        }
      });
    }

    return drawerRef;
  }
}
