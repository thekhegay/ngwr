/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directionality } from '@angular/cdk/bidi';
import type { ConnectedPosition, FlexibleConnectedPositionStrategy, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ViewportRuler } from '@angular/cdk/scrolling';
import { DOCUMENT } from '@angular/common';
import {
  type ComponentRef,
  DestroyRef,
  ElementRef,
  Injector,
  type Signal,
  afterRenderEffect,
  computed,
  inject,
  signal,
  untracked,
} from '@angular/core';

import type { Subscription } from 'rxjs';

import { WR_OVERLAY, wrFollowDirection } from 'ngwr/overlay';

import type { WrChartTooltip, WrChartTooltipTarget } from './interfaces';
import { WrChartTooltipPanel } from './internal/chart-tooltip-panel';

/**
 * How long the tooltip outlives the pointer leaving a section, or reporting another
 * one on its way to the chip, in ms.
 *
 * Long enough to cross the 8px gap onto the chip, which is what keeps it hoverable,
 * and to pass through the gutter between two bars or two heatmap days without a
 * flash. The same order as `[wrPopover]`'s `hideDelay`.
 */
const GRACE = 100;

/**
 * How close the arrow's middle may come to the end of the chip's edge, in px from the
 * padding box: the chip's inner corner radius (5px) plus half the rotated square's
 * diagonal (4.24px), rounded up. An anchor further out than that — a chip pushed flush
 * against the viewport by a section on its very edge — keeps the arrow on the straight
 * part of the chip rather than off its corner.
 */
const ARROW_INSET = 10;

/**
 * How far back past its anchor a chip that runs AWAY from the anchor starts: far enough
 * for the arrow to sit on the anchor without meeting `ARROW_INSET`.
 */
const REACH_BACK = ARROW_INSET + 4;

type Side = NonNullable<WrChartTooltipTarget['side']>;
type Anchor = NonNullable<WrChartTooltipTarget['anchor']>;

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

type Edge = 'left' | 'center' | 'right';
type Rise = 'top' | 'center' | 'bottom';

/** A placement in PHYSICAL terms: which chip edge the arrow hangs off, and the geometry. */
interface Physical {
  readonly originX: Edge;
  readonly originY: Rise;
  readonly overlayX: Edge;
  readonly overlayY: Rise;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly arrow: Side;
}

const ABOVE: Physical = {
  originX: 'center',
  originY: 'top',
  overlayX: 'center',
  overlayY: 'bottom',
  offsetY: -8,
  arrow: 'bottom',
};
const BELOW: Physical = {
  originX: 'center',
  originY: 'bottom',
  overlayX: 'center',
  overlayY: 'top',
  offsetY: 8,
  arrow: 'top',
};

/**
 * Every placement a side may take, best first.
 *
 * `top` and `bottom` flip to each other, the way every tooltip does. A side placement
 * never flips to the far side: its anchor is a point on a donut's outer arc, and the far
 * side of that point is the donut. Where there is no room beside the anchor — a 200px
 * ring on a phone leaves about 85px either side — the chip goes above it, then below,
 * running AWAY from the ring with the anchor just inside its near end. Measured in
 * Chromium at 375px, a chip centred on the nine o'clock point lay 40px deep over the
 * ring, and one running away from it 13px. Centred above and below come last, and when
 * nothing fits `withPush` slides the best of them into view.
 */
const FALLBACKS: Record<Side, readonly Physical[]> = {
  top: [ABOVE, BELOW],
  bottom: [BELOW, ABOVE],
  right: [
    { originX: 'right', originY: 'center', overlayX: 'left', overlayY: 'center', offsetX: 8, arrow: 'left' },
    { ...ABOVE, overlayX: 'left', offsetX: -REACH_BACK },
    { ...BELOW, overlayX: 'left', offsetX: -REACH_BACK },
    ABOVE,
    BELOW,
  ],
  left: [
    { originX: 'left', originY: 'center', overlayX: 'right', overlayY: 'center', offsetX: -8, arrow: 'right' },
    { ...ABOVE, overlayX: 'right', offsetX: REACH_BACK },
    { ...BELOW, overlayX: 'right', offsetX: REACH_BACK },
    ABOVE,
    BELOW,
  ],
};

/**
 * The position list for a side, in the logical vocabulary the CDK and the arrow
 * stylesheet speak.
 *
 * A chart's geometry does not mirror — an SVG arc at three o'clock is on the right in
 * both directions — so the list is written physically and translated here. The CDK
 * resolves `start` / `end` against the overlay's direction, and applies `offsetX` as a
 * physical translate, so under RTL the edges swap and the offsets stay as they are. The
 * pane class names the edge the arrow hangs off in the stylesheet's terms: its side
 * placements hang the arrow off an INLINE edge, so the chip's physical left edge is
 * `--right` in LTR and `--left` in RTL. Along that edge the arrow is placed by
 * measurement, so a chip that runs away from its anchor needs no class of its own.
 */
function chartTooltipPositions(side: Side, rtl: boolean): ConnectedPosition[] {
  const x = (edge: Edge): 'start' | 'center' | 'end' =>
    edge === 'center' ? 'center' : (edge === 'left') !== rtl ? 'start' : 'end';
  const arrowClass: Record<Side, string> = {
    top: 'bottom',
    bottom: 'top',
    left: rtl ? 'left' : 'right',
    right: rtl ? 'right' : 'left',
  };
  return FALLBACKS[side].map(place => ({
    originX: x(place.originX),
    originY: place.originY,
    overlayX: x(place.overlayX),
    overlayY: place.overlayY,
    offsetX: place.offsetX,
    offsetY: place.offsetY,
    panelClass: `wr-tooltip-overlay--${arrowClass[place.arrow]}`,
  }));
}

/** Where an anchor is right now, in viewport pixels. */
function boxOf(anchor: Anchor): Box {
  if (anchor instanceof Element) return anchor.getBoundingClientRect();
  const width = anchor.width ?? 0;
  const height = anchor.height ?? 0;
  return { left: anchor.x, top: anchor.y, right: anchor.x + width, bottom: anchor.y + height };
}

/**
 * A hover tooltip for a chart's sections, with ONE overlay per chart.
 *
 * **Why not `[wrPopover] mode="tooltip"` on every section.** It fits the look
 * and not the shape. A year of `wr-calendar-heatmap` is 371 days, and a directive
 * per day is 371 focus monitors and 371 overlays-in-waiting for a tooltip only
 * one of them can show; and most sections are not an element a directive could
 * point at — a donut's slice is a `<path>` whose box is most of the ring, a
 * sparkline's point is a coordinate. So the chart says which section is under
 * the pointer and where to point, and this owns the single overlay, the timers
 * and the teardown. What IS shared with the directive is everything a reader
 * sees: the `.wr-tooltip` chip, its arrow, the placements with their flip, and
 * Escape.
 *
 * **The chip points AT the section it describes**, with its arrow on the anchor:
 * above a heatmap's day, above a bar's top edge, off the outside of a donut's arc.
 * The arrow is placed from a measurement rather than centred, because the chip is
 * not always centred on its anchor — `withPush` slides it along the viewport edge
 * for the first and last week of a year — and an arrow at the chip's middle would
 * then point at a neighbour. The measurement is written to
 * `--wr-chart-tooltip-arrow` on the chip, and the stylesheet puts the arrow there.
 *
 * **A chip at its section sits over the sections beside it**, and it is hoverable
 * (below), so the way onto it can cross another section: straight up from a heatmap
 * day runs through the day above. Switching the moment that day reported itself
 * would move the chip away from a pointer on its way to it — WCAG 1.4.13 with extra
 * steps. So the strip between the anchor and the chip is a bridge: another section
 * reported from inside it waits out the same grace a leave does, a pointer still
 * closing in on the chip starts that grace again however slowly it moves, and
 * landing on the chip cancels the switch. Anywhere else a new section switches at
 * once, so scanning a row of days does not lag. The cost is in the other direction: a
 * pointer that keeps on going up a heatmap's column is moving onto the chip, so it
 * passes over it and the days under it read out only once it comes out the far side.
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
 *   section that no longer exists (`null`) closes it. It runs again whenever the
 *   chart may have moved under an open chip — a scroll anywhere, a viewport
 *   resize, the chart or its anchor element changing size.
 * @param sectionAt For a chart whose sections are chosen by POSITION rather than by
 *   element — a sparkline picks the point nearest the pointer's x, anywhere over the
 *   drawing — the section at a viewport point, or `null` off the drawing. The chip
 *   points at the point from inside the drawing, so without this a pointer scrubbing
 *   above the line lands on the chip and the chart stops hearing it: measured in
 *   Chromium, a scrub along the top of a sparkline showed 9 of its 12 values. Asked on
 *   every pointer event while a chip is up, over the chip included; straight up from a
 *   point onto its chip stays on that point, so the chip is still hoverable.
 *
 * @internal
 */
export function useChartTooltip(
  enabled: Signal<boolean>,
  resolve: (index: number) => WrChartTooltipTarget | null,
  sectionAt?: (x: number, y: number) => number | null
): WrChartTooltip {
  const overlay = inject(WR_OVERLAY);
  const doc = inject(DOCUMENT);
  const dir = inject(Directionality, { optional: true });
  const viewport = inject(ViewportRuler);
  const host = inject(ElementRef).nativeElement as Element;
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

  let overlayRef: OverlayRef | null = null;
  let strategy: FlexibleConnectedPositionStrategy | null = null;
  let panel: ComponentRef<WrChartTooltipPanel> | null = null;
  let side: Side = 'top';
  let anchor: Anchor | null = null;
  let resized: Subscription | null = null;
  let observer: ResizeObserver | null = null;
  let observed: Element | null = null;

  /** Where the pointer last was, while a chip is up. `null` until it moves. */
  let pointer: { readonly x: number; readonly y: number } | null = null;

  /**
   * What the grace period settles on when it runs out: another section, `null` for
   * none, or `undefined` for nothing pending — the chip stays as it is.
   */
  let pending: number | null | undefined;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  /** The pointer's distance from the chip when the grace last (re)started. */
  let approach = Number.POSITIVE_INFINITY;

  const chipBox = (): DOMRect | null => {
    const box = overlayRef?.overlayElement.getBoundingClientRect();
    // Nothing laid out (a unit test, a pane not attached yet) is no chip to reach.
    return box && box.width > 0 && box.height > 0 ? box : null;
  };

  /**
   * Whether the pointer is in the strip between the anchor and the chip — as wide
   * as the chip along the edge it hangs off, so a diagonal approach counts too.
   */
  const inBridge = (): boolean => {
    const chip = chipBox();
    if (!pointer || !chip || !anchor) return false;
    const at = boxOf(anchor);
    const { x, y } = pointer;
    const across = x >= chip.left && x <= chip.right;
    const along = y >= chip.top && y <= chip.bottom;
    if (chip.bottom <= at.top) return across && y >= chip.bottom && y <= at.top;
    if (chip.top >= at.bottom) return across && y >= at.bottom && y <= chip.top;
    if (chip.right <= at.left) return along && x >= chip.right && x <= at.left;
    if (chip.left >= at.right) return along && x >= at.right && x <= chip.left;
    return false;
  };

  const distanceToChip = (): number => {
    const chip = chipBox();
    if (!pointer || !chip) return Number.POSITIVE_INFINITY;
    const dx = Math.max(chip.left - pointer.x, 0, pointer.x - chip.right);
    const dy = Math.max(chip.top - pointer.y, 0, pointer.y - chip.bottom);
    return Math.hypot(dx, dy);
  };

  const cancelGrace = (): void => {
    pending = undefined;
    if (graceTimer === null) return;
    clearTimeout(graceTimer);
    graceTimer = null;
  };

  const settle = (): void => {
    const next = pending;
    cancelGrace();
    if (next !== undefined) hovered.set(next);
  };

  const restartGrace = (): void => {
    if (graceTimer !== null) clearTimeout(graceTimer);
    graceTimer = setTimeout(settle, GRACE);
  };

  // An armed grace is left to run rather than restarted: a grid reports the gap
  // between two squares on every `mousemove`, and restarting would keep a tooltip
  // up for as long as the pointer kept moving through it. Only closing in on the
  // chip restarts it — see `track`.
  const defer = (next: number | null): void => {
    pending = next;
    if (graceTimer !== null) return;
    approach = distanceToChip();
    restartGrace();
  };

  const enter = (index: number): void => {
    if (!enabled()) return;
    if (index === dismissed) {
      cancelGrace();
      return;
    }
    dismissed = null;
    const showing = hovered();
    if (index === showing) {
      cancelGrace();
      return;
    }
    if (showing !== null && inBridge()) {
      defer(index);
      return;
    }
    cancelGrace();
    hovered.set(index);
  };

  /**
   * Put the arrow on the anchor, wherever the chip landed along it. Measured off the
   * PANE, which is exactly the chip's box: the chip itself scales in from 96% and
   * would read short for the length of its entry animation.
   */
  const aim = (): void => {
    if (!overlayRef || !panel || !anchor) return;
    const pane = overlayRef.overlayElement;
    const chip = panel.location.nativeElement as HTMLElement;
    const at = boxOf(anchor);
    const box = pane.getBoundingClientRect();
    const across =
      pane.classList.contains('wr-tooltip-overlay--top') || pane.classList.contains('wr-tooltip-overlay--bottom');
    // The arrow is positioned inside the chip's padding box, so its border comes off.
    const border = across ? chip.clientLeft : chip.clientTop;
    const inner = (across ? box.width : box.height) - 2 * border;
    if (inner <= 2 * ARROW_INSET) return;
    const target = across ? (at.left + at.right) / 2 - box.left : (at.top + at.bottom) / 2 - box.top;
    const offset = Math.min(inner - ARROW_INSET, Math.max(ARROW_INSET, target - border));
    chip.style.setProperty('--wr-chart-tooltip-arrow', `${Math.round(offset * 100) / 100}px`);
  };

  const place = (): void => {
    if (!overlayRef || !strategy || !anchor) return;
    strategy.setOrigin(anchor);
    overlayRef.updatePosition();
    aim();
  };

  /** Watch whatever can move the anchor without a scroll or a viewport resize. */
  const observe = (): void => {
    const next = anchor instanceof Element ? anchor : null;
    if (!observer || next === observed) return;
    if (observed) observer.unobserve(observed);
    observed = next;
    if (next) observer.observe(next);
  };

  /**
   * Point the open chip at wherever its section is NOW. A box anchor is a set of
   * viewport numbers, so it goes stale the moment anything scrolls, and the CDK's
   * own reposition listens to the window and to registered `cdkScrollable`s only —
   * not to `wr-calendar-heatmap`, which is a scroll container of its own, nor to a
   * `wr-table` a sparkline sits in. One capture listener on the document hears
   * every one of them; a viewport resize and a `ResizeObserver` on the chart cover
   * the rest.
   */
  const reanchor = (): void => {
    const index = untracked(active);
    if (!overlayRef || index === null) return;
    const target = untracked(() => resolve(index));
    if (!target?.anchor) return;
    anchor = target.anchor;
    observe();
    place();
  };

  /**
   * The pointer, wherever it goes while a chip is up. Captured on the document, so it
   * is current before any section's own `mouseenter` / `mousemove` handler runs.
   */
  const track = (event: MouseEvent): void => {
    const { clientX: x, clientY: y } = event;
    pointer = { x, y };
    // A chart scrubbed by position hears the pointer wherever it is over the drawing,
    // chip or not — see `sectionAt`.
    const scrubbed = sectionAt?.(x, y);
    if (scrubbed !== undefined && scrubbed !== null) {
      enter(scrubbed);
      return;
    }
    if (graceTimer === null) return;
    // On the chip: its own `mouseenter` cancels whatever is pending. Asked of the
    // geometry rather than of the event, because the first event of that move is the
    // section's `mouseout`, whose target is the section being left.
    const chip = chipBox();
    if (chip && x >= chip.left && x <= chip.right && y >= chip.top && y <= chip.bottom) return;
    if (inBridge()) {
      const distance = distanceToChip();
      if (distance < approach) {
        approach = distance;
        restartGrace();
      }
    } else if (pending !== undefined && pending !== null) {
      // Out of the bridge while a section waits: nothing is on its way to the chip.
      settle();
    }
  };

  const close = (): void => {
    if (!overlayRef) return;
    doc.removeEventListener('scroll', reanchor, true);
    for (const type of ['mousemove', 'mouseover', 'mouseout'] as const) {
      doc.removeEventListener(type, track, true);
    }
    resized?.unsubscribe();
    observer?.disconnect();
    // Disposing detaches the pane with its listeners and completes
    // `keydownEvents()`, so nothing registered in `open()` outlives it.
    overlayRef.dispose();
    overlayRef = null;
    strategy = null;
    panel = null;
    anchor = null;
    resized = null;
    observer = null;
    observed = null;
    pointer = null;
  };

  const open = (target: WrChartTooltipTarget & { readonly anchor: Anchor }): void => {
    const wanted = target.side ?? 'top';
    anchor = target.anchor;
    if (!overlayRef) {
      side = wanted;
      const direction = dir?.value ?? 'ltr';
      // `withGrowAfterOpen`: past its first pass the CDK never gives the pane a box
      // larger than the last one, and this pane is passed from section to section. A
      // chip once pushed against the viewport edge — a donut's nine o'clock on a phone —
      // left every later chip that box, so the next one overflowed its pane and the arrow,
      // measured off the pane, pointed 9–13px wide of its slice. `wr-dropdown` hit the same.
      strategy = overlay
        .position()
        .flexibleConnectedTo(anchor)
        .withPositions(chartTooltipPositions(side, direction === 'rtl'))
        .withPush(true)
        .withGrowAfterOpen(true);
      overlayRef = overlay.create({
        positionStrategy: strategy,
        // No scroll strategy: `reanchor` repositions, for every scroll container.
        panelClass: 'wr-tooltip-overlay',
        // The direction the list above was translated for — the CDK would otherwise
        // take the document's, and a chart under a `[dir]` would open on the wrong side.
        direction,
      });
      doc.addEventListener('scroll', reanchor, { capture: true, passive: true });
      for (const type of ['mousemove', 'mouseover', 'mouseout'] as const) {
        doc.addEventListener(type, track, { capture: true, passive: true });
      }
      // After the CDK's own subscription, which re-applies against the stale anchor.
      resized = viewport.change().subscribe(reanchor);
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(reanchor);
        observer.observe(host);
      }
      // The chip lands on the same PHYSICAL side in both directions, so the list is
      // translated again rather than the side changed, and the arrow's measurement holds.
      wrFollowDirection(overlayRef, dir, injector, direction =>
        strategy?.withPositions(chartTooltipPositions(side, direction === 'rtl'))
      );

      const pane = overlayRef.overlayElement;
      pane.setAttribute('aria-hidden', 'true');
      // Hoverable: the pointer may move onto the chip without losing it, and a switch
      // or a hide it was racing is off. Leaving it starts the same grace a section
      // does; landing back on a section decides through `enter()`.
      pane.addEventListener('mouseenter', cancelGrace);
      pane.addEventListener('mouseleave', () => defer(null));

      // Escape reaches the topmost overlay wherever focus is — the CDK's keyboard
      // dispatcher routes it — which is what makes a tooltip nothing can focus
      // dismissible at all.
      overlayRef.keydownEvents().subscribe(event => {
        if (event.key !== 'Escape') return;
        dismissed = hovered();
        cancelGrace();
        hovered.set(null);
      });

      panel = overlayRef.attach(new ComponentPortal(WrChartTooltipPanel, null, injector));
    } else if (wanted !== side) {
      side = wanted;
      strategy?.withPositions(chartTooltipPositions(side, overlayRef.getDirection() === 'rtl'));
    }
    observe();

    panel?.setInput('datum', target.datum);
    // Rendered NOW rather than on the next pass: the position is centred on the
    // anchor, so it has to be measured against the text it is about to show, not
    // the previous section's.
    panel?.changeDetectorRef.detectChanges();
    place();
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
    cancelGrace();
    close();
  });

  return {
    active,
    enter,
    leave(event?: MouseEvent): void {
      dismissed = null;
      // Straight onto the chip: its own `mouseenter` would cancel the grace a
      // moment later anyway, and not arming it is what removes the race.
      const to = event?.relatedTarget;
      if (to instanceof Node && overlayRef?.overlayElement.contains(to)) return;
      defer(null);
    },
  };
}
