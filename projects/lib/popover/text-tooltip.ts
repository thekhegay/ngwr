/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import { type OverlayRef, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, ElementRef, Injector, inject } from '@angular/core';

import { WR_OVERLAY, wrFollowDirection, wrMirrorOffsets } from 'ngwr/overlay';

import { WrPopoverTextPanel } from './internal/text-panel';
import { VIEWPORT_MARGIN } from './internal/viewport-margin';
import { type WrPopoverPosition, wrPopoverPositions } from './types';

/** @internal */
export interface WrTextTooltip {
  /** Show `text` over the host, replacing what this handle showed before. */
  show(text: string): void;
  hide(): void;
}

/**
 * The `[wrPopover] mode="tooltip"` panel, opened from code over the host of the
 * directive or component that calls this in its injection context.
 *
 * For feedback a pointer did not ask for, such as "Copied" after a click. It
 * has no hover or focus wiring and sets no `aria-describedby`: the caller
 * announces the text. A hint that describes the host is `[wrPopover]`.
 *
 * @internal
 */
export function wrUseTextTooltip(position: WrPopoverPosition = 'top'): WrTextTooltip {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const overlay = inject(WR_OVERLAY);
  const dir = inject(Directionality, { optional: true });
  const scrollStrategies = inject(ScrollStrategyOptions);
  const injector = inject(Injector);

  const paneClass = 'wr-tooltip-overlay';
  let overlayRef: OverlayRef | null = null;

  const hide = (): void => {
    overlayRef?.dispose();
    overlayRef = null;
  };

  inject(DestroyRef).onDestroy(hide);

  return {
    show(text: string): void {
      hide();

      const positions = (rtl: boolean): ReturnType<typeof wrMirrorOffsets> =>
        wrMirrorOffsets(wrPopoverPositions(position, paneClass), rtl);
      const connected = overlay
        .position()
        .flexibleConnectedTo(host)
        .withPositions(positions(dir?.value === 'rtl'))
        .withPush(true)
        .withViewportMargin(VIEWPORT_MARGIN);

      overlayRef = overlay.create({
        positionStrategy: connected,
        scrollStrategy: scrollStrategies.reposition(),
        panelClass: paneClass,
      });
      wrFollowDirection(overlayRef, dir, injector, direction =>
        connected.withPositions(positions(direction === 'rtl'))
      );

      const panel = overlayRef.attach(new ComponentPortal(WrPopoverTextPanel, null, injector));
      panel.setInput('text', text);
      panel.changeDetectorRef.detectChanges();
      overlayRef.overlayElement.setAttribute('role', 'tooltip');
    },
    hide,
  };
}
