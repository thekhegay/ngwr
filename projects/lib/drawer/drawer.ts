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

import type { WrDrawerPosition } from './types';

/**
 * Side panel that slides in from an edge of the viewport. Two-way binds
 * `open` and renders into a CDK overlay so it sits above page content.
 *
 * Compose the body with `<wrDrawerTitle>`, `<wrDrawerContent>`, and
 * `<wrDrawerFooter>` directives.
 *
 * @example
 * ```html
 * <wr-drawer [(open)]="settingsOpen" position="right" width="24rem">
 *   <h2 wrDrawerTitle>Settings</h2>
 *   <div wrDrawerContent>...</div>
 *   <div wrDrawerFooter>
 *     <wr-btn wrDrawerClose>Close</wr-btn>
 *   </div>
 * </wr-drawer>
 * ```
 *
 * @see https://ngwr.dev/docs/components/drawer
 */
@Component({
  selector: 'wr-drawer',
  templateUrl: './drawer.html',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display:none' },
})
export class WrDrawer {
  /** Two-way bindable open state. */
  readonly open = model<boolean>(false);

  /** Side the drawer slides in from. @default 'right' */
  readonly position = input<WrDrawerPosition>('right');

  /** Width when position is left/right. Any CSS length. @default '20rem' */
  readonly width = input<string>('20rem');

  /** Height when position is top/bottom. Any CSS length. @default '16rem' */
  readonly height = input<string>('16rem');

  /**
   * Upper cap on height (top/bottom positions). Useful for bottom sheets
   * that should grow with content up to a viewport-relative max.
   * Any CSS length. @default null (no cap)
   */
  readonly maxHeight = input<string | null>(null);

  /**
   * Round the leading corners — the edge facing the viewport interior.
   * Common bottom-sheet styling. @default false
   */
  readonly rounded = input(false, { transform: coerceBooleanProperty });

  /**
   * Render a grab handle at the leading edge. Visual affordance for
   * "swipe to dismiss" patterns. Cosmetic — no swipe logic attached.
   * @default false
   */
  readonly showHandle = input(false, { transform: coerceBooleanProperty });

  /**
   * Pad the trailing edge with `env(safe-area-inset-*)` so content
   * doesn't sit under the iOS home indicator. @default false
   */
  readonly safeArea = input(false, { transform: coerceBooleanProperty });

  /** Show the dimming backdrop. @default true */
  readonly hasBackdrop = input(true, { transform: coerceBooleanProperty });

  /** Close when the backdrop is clicked. @default true */
  readonly closeOnBackdropClick = input(true, { transform: coerceBooleanProperty });

  /** Close on Escape. @default true */
  readonly closeOnEscape = input(true, { transform: coerceBooleanProperty });

  protected readonly panelTpl = viewChild.required(TemplateRef);

  protected panelClass(): string {
    const parts = ['wr-drawer__panel', `wr-drawer__panel--${this.position()}`];
    if (this.rounded()) parts.push('wr-drawer__panel--rounded');
    if (this.safeArea()) parts.push('wr-drawer__panel--safe-area');
    return parts.join(' ');
  }

  private readonly overlay = inject(WR_OVERLAY);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private overlayRef: OverlayRef | null = null;
  private focusTrap: ConfigurableFocusTrap | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  private openOverlay(): void {
    if (this.overlayRef) return;

    const pos = this.position();
    const isHorizontal = pos === 'left' || pos === 'right';

    const positionStrategy = this.overlay
      .position()
      .global()
      [pos === 'left' ? 'left' : pos === 'right' ? 'right' : 'centerHorizontally']();

    if (pos === 'top') positionStrategy.top();
    else if (pos === 'bottom') positionStrategy.bottom();
    else positionStrategy.centerVertically();

    const cap = this.maxHeight();

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: this.hasBackdrop(),
      backdropClass: 'wr-drawer-backdrop',
      panelClass: ['wr-drawer-overlay', `wr-drawer-overlay--${pos}`],
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: isHorizontal ? this.width() : '100vw',
      height: isHorizontal ? '100vh' : this.height(),
      maxHeight: isHorizontal ? undefined : (cap ?? undefined),
    });

    const portal = new TemplatePortal(this.panelTpl(), this.vcr);
    this.overlayRef.attach(portal);

    if (this.isBrowser) {
      const active = document.activeElement;
      this.previouslyFocused = active instanceof HTMLElement ? active : null;
      const host = this.overlayRef.overlayElement;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      queueMicrotask(() => {
        const titleEl = host.querySelector<HTMLElement>('[wrDrawerTitle], [wr-drawer-title]');
        if (titleEl?.id) host.setAttribute('aria-labelledby', titleEl.id);
      });
      this.focusTrap = this.focusTrapFactory.create(host);
      void this.focusTrap.focusInitialElementWhenReady();
    }

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
    const restore = this.previouslyFocused;
    this.previouslyFocused = null;
    this.overlayRef.dispose();
    this.overlayRef = null;
    if (restore && typeof restore.focus === 'function') {
      restore.focus();
    }
  }
}
