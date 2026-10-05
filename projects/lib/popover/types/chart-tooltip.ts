/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Signal } from '@angular/core';

/**
 * What a chart's hover tooltip says about one section.
 *
 * @internal
 */
export interface WrChartTooltipDatum {
  /** The series or category name. Omitted where `value` is already a whole sentence. */
  readonly label?: string;
  /** The value, formatted the way the chart already prints it. */
  readonly value: string;
  /** The section's own paint, drawn as a swatch. Omitted where colour says nothing. */
  readonly color?: string;
}

/**
 * Where the tooltip for one section points, and what it says.
 *
 * @internal
 */
export interface WrChartTooltipTarget {
  readonly datum: WrChartTooltipDatum;
  /**
   * What the chip points at: an element, or a box in viewport pixels for a section
   * that is not one — a zero-size point on a donut's arc. The chip sits on `side` of
   * it with its arrow on the middle of that edge, and flips for room. Point at the
   * section itself, not at something near it: the arrow is what tells a reader which
   * of forty squares the chip is about. `null` while the element is not rendered —
   * the tooltip stays closed rather than pointing at nothing.
   */
  readonly anchor:
    Element | { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number } | null;
  /**
   * Which PHYSICAL side of the anchor the chip goes, before a flip for room — the
   * side the section faces. A chart's geometry does not mirror with `direction`, so
   * neither does this: `right` is the right in RTL too. `top` and `bottom` flip to
   * each other; `left` and `right` try above and below rather than the far side,
   * which is the chart itself. @default 'top'
   */
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * The handle {@link useChartTooltip} returns to a chart.
 *
 * @internal
 */
export interface WrChartTooltip {
  /** The section the tooltip is showing, or `null`. Always `null` while the chart opted out. */
  readonly active: Signal<number | null>;
  /**
   * The pointer is over section `index`. Switches straight to it when another is up —
   * unless the pointer is between that one's anchor and its chip, on its way onto the
   * chip, where the switch waits out the same grace as `leave`.
   */
  enter(index: number): void;
  /**
   * The pointer left the sections. Hides after a short grace period, so a pointer
   * can cross the gap onto the tooltip — WCAG 1.4.13 (Hoverable) — and so moving
   * between two sections through a gap does not blink it.
   */
  leave(event?: MouseEvent): void;
}
