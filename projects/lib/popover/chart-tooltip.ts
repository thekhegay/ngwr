/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import type { FlexibleConnectedPositionStrategy, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  type ComponentRef,
  DestroyRef,
  Injector,
  type Signal,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { WR_OVERLAY, wrFollowDirection } from 'ngwr/overlay';

import { type WrChartTooltip, type WrChartTooltipTarget, wrPopoverPositions } from './interfaces';
import { WrChartTooltipPanel } from './internal/chart-tooltip-panel';

/**
 * How long the tooltip outlives the pointer leaving a section, in ms.
 *
 * Long enough to cross the 8px gap onto the chip, which is what keeps it
 * hoverable, and to pass through the gutter between two bars or two heatmap
 * days without a flash. The same order as `[wrPopover]`'s `hideDelay`.
 */
const HIDE_DELAY = 100;

/**
 * A hover tooltip for a chart's sections, with ONE overlay per chart.
 *
 * **Why not `[wrPopover] mode="tooltip"` on every section.** It fits the look
 * and not the shape. A year of `wr-calendar-heatmap` is 371 days, and a directive
 * per day is 371 focus monitors and 371 overlays-in-waiting for a tooltip only
 * one of them can show; and a directive points at its own element, where a chart
 * has to point somewhere else (below). So the chart says which section is under
 * the pointer and where to point, and this owns the single overlay, the timers
 * and the teardown. What IS shared with the directive is everything a reader
 * sees: the `.wr-tooltip` chip, its arrow, the placements with their flip, and
 * Escape.
 *
 * **Every chart points it just OUTSIDE its data** — above the plot at the bar's
 * column, above the grid at the day's week, beyond the ring's box at the arc.
 * Pointed at the section itself, the chip sat over the neighbouring sections and,
 * on a donut, under the pointer: measured in Chromium, the pointer resting on the
 * inner half of a lower slice landed on the chip that slice had just opened. The
 * chip is hoverable (below), so a chip over the data is a chip that takes the next
 * section's `mouseenter`. Outside the data it never covers a section, and the way
 * onto it is straight out of the one that opened it.
 *
 * **Why an overlay and not a positioned child, the way `wr-line-chart` draws its
 * own.** A child is clipped by every `overflow` between it and the page, and a
 * chart sits inside those constantly: `wr-calendar-heatmap` IS a scroll
 * container, and a sparkline in a `wr-table` cell sits under two more.
 *
 * **Pointer only, deliberately.** No section of any chart is a tab stop, and
 * this does not make one — a year of days in the tab order would be the defect.
 * The pane is `aria-hidden`: every value it shows is already the section's
 * accessible name or the chart's own, and an orphan tooltip nothing describes
 * reads as a stray line at the end of the document. It is never the only way to
 * a value.
 *
 * SSR-safe: nothing here touches the DOM until a pointer event has moved a
 * section, and the render effect that opens the overlay never runs on a server.
 *
 * Call from an injection context — a chart's field initialiser.
 *
 * @param enabled The chart's `tooltip` input. Turning it off closes an open tooltip.
 * @param resolve What to show for section `index`, and where. It runs after
 *   render, so it may read the DOM the section just drew; the signals it reads
 *   are tracked, so a data change under an open tooltip re-reads it, and a
 *   section that no longer exists (`null`) closes it.
 *
 * @internal
 */
export function useChartTooltip(
  enabled: Signal<boolean>,
  resolve: (index: number) => WrChartTooltipTarget | null
): WrChartTooltip {
  const overlay = inject(WR_OVERLAY);
  const doc = inject(DOCUMENT);
  const dir = inject(Directionality, { optional: true });
  const injector = inject(Injector);

  const hovered = signal<number | null>(null);
  const active = computed(() => (enabled() ? hovered() : null));

  /**
   * The section Escape dismissed. It stays shut for as long as the pointer stays
   * on that section — WCAG 1.4.13 asks for dismissal WITHOUT moving the pointer,
   * and a sparkline re-reports its section on every `mousemove`, so a plain
   * close would reopen on the next pixel.
   */
  let dismissed: number | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let overlayRef: OverlayRef | null = null;
  let strategy: FlexibleConnectedPositionStrategy | null = null;
  let side: 'top' | 'bottom' = 'top';
  let panel: ComponentRef<WrChartTooltipPanel> | null = null;

  const cancelHide = (): void => {
    if (hideTimer === null) return;
    clearTimeout(hideTimer);
    hideTimer = null;
  };

  // An armed hide is left to run rather than restarted: a grid reports the gap
  // between two squares on every `mousemove`, and restarting would keep a tooltip
  // up for as long as the pointer kept moving through it.
  const scheduleHide = (): void => {
    if (hideTimer !== null) return;
    hideTimer = setTimeout(() => {
      hideTimer = null;
      hovered.set(null);
    }, HIDE_DELAY);
  };

  /**
   * Point the open chip at wherever its section is NOW. A box anchor is a set of
   * viewport numbers, so it goes stale the moment anything scrolls, and the CDK's
   * own reposition listens to the window and to registered `cdkScrollable`s only —
   * not to `wr-calendar-heatmap`, which is a scroll container of its own, nor to a
   * `wr-table` a sparkline sits in. One capture listener on the document hears
   * every one of them.
   */
  const reanchor = (): void => {
    const index = untracked(active);
    if (!overlayRef || !strategy || index === null) return;
    const target = untracked(() => resolve(index));
    if (!target?.anchor) return;
    strategy.setOrigin(target.anchor);
    overlayRef.updatePosition();
  };

  const close = (): void => {
    if (!overlayRef) return;
    doc.removeEventListener('scroll', reanchor, true);
    // Disposing detaches the pane with its listeners and completes
    // `keydownEvents()`, so nothing registered in `open()` outlives it.
    overlayRef.dispose();
    overlayRef = null;
    strategy = null;
    panel = null;
  };

  const open = (
    target: WrChartTooltipTarget & { readonly anchor: NonNullable<WrChartTooltipTarget['anchor']> }
  ): void => {
    // Only the block axis: a chart's own geometry is physical and does not mirror
    // with `direction`, and `top` / `bottom` are the two placements that mean the
    // same thing in both.
    const wanted = target.side ?? 'top';
    if (!overlayRef) {
      side = wanted;
      strategy = overlay
        .position()
        .flexibleConnectedTo(target.anchor)
        .withPositions(wrPopoverPositions(side, 'wr-tooltip-overlay'))
        .withPush(true);
      overlayRef = overlay.create({
        positionStrategy: strategy,
        // No scroll strategy: `reanchor` repositions, for every scroll container.
        panelClass: 'wr-tooltip-overlay',
      });
      doc.addEventListener('scroll', reanchor, { capture: true, passive: true });
      wrFollowDirection(overlayRef, dir, injector);

      const pane = overlayRef.overlayElement;
      pane.setAttribute('aria-hidden', 'true');
      // Hoverable: the pointer may move onto the chip without losing it. Leaving
      // it arms the same hide a section does; landing back on a section cancels
      // that through `enter()`.
      pane.addEventListener('mouseenter', cancelHide);
      pane.addEventListener('mouseleave', scheduleHide);

      // Escape reaches the topmost overlay wherever focus is — the CDK's keyboard
      // dispatcher routes it — which is what makes a tooltip nothing can focus
      // dismissible at all.
      overlayRef.keydownEvents().subscribe(event => {
        if (event.key !== 'Escape') return;
        dismissed = hovered();
        cancelHide();
        hovered.set(null);
      });

      panel = overlayRef.attach(new ComponentPortal(WrChartTooltipPanel, null, injector));
    } else {
      strategy?.setOrigin(target.anchor);
      if (wanted !== side) {
        side = wanted;
        strategy?.withPositions(wrPopoverPositions(side, 'wr-tooltip-overlay'));
      }
    }

    panel?.setInput('datum', target.datum);
    // Rendered NOW rather than on the next pass: the position is centred on the
    // anchor, so it has to be measured against the text it is about to show, not
    // the previous section's.
    panel?.changeDetectorRef.detectChanges();
    overlayRef.updatePosition();
  };

  afterRenderEffect(() => {
    const index = active();
    const target = index === null ? null : resolve(index);
    // Untracked: the overlay's own construction reads signals (the direction
    // follower creates an effect), and none of them should re-run this.
    untracked(() => {
      if (target?.anchor) open({ ...target, anchor: target.anchor });
      else close();
    });
  });

  inject(DestroyRef).onDestroy(() => {
    cancelHide();
    close();
  });

  return {
    active,
    enter(index: number): void {
      if (!enabled()) return;
      cancelHide();
      if (index === dismissed) return;
      dismissed = null;
      hovered.set(index);
    },
    leave(event?: MouseEvent): void {
      dismissed = null;
      // Straight onto the chip: its own `mouseenter` would cancel the hide a
      // moment later anyway, and not arming it is what removes the race.
      const to = event?.relatedTarget;
      if (to instanceof Node && overlayRef?.overlayElement.contains(to)) return;
      scheduleHide();
    },
  };
}
