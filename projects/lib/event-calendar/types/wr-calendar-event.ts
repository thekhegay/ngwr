/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrColor } from 'ngwr/theme';

/** Which span of time the calendar is showing. */
export type WrCalendarView = 'month' | 'week' | 'day';

/**
 * One entry on the calendar.
 *
 * `end` is EXCLUSIVE — an event from 09:00 to 10:00 does not overlap one that
 * starts at 10:00, and an all-day event on a single day ends at 00:00 the next
 * day. Exclusive ends are what make adjacency and overlap the same comparison
 * in every view, instead of a per-view off-by-one.
 */
export interface WrCalendarEvent {
  /** Stable identity. Used for tracking and echoed back on every output. */
  readonly id: string | number;

  /** Text shown on the chip and read out as the button's accessible name. */
  readonly title: string;

  /** Start instant, inclusive. */
  readonly start: Date;

  /** End instant, exclusive. */
  readonly end: Date;

  /**
   * Show in the all-day band rather than against the time grid. Month view
   * renders every event as a band regardless.
   */
  readonly allDay?: boolean;

  /** Intent color for the chip. Falls back to `primary`. */
  readonly color?: WrColor | null;

  /**
   * Per-event override of the calendar's `editable` input — `false` pins an
   * event that would otherwise be draggable.
   */
  readonly editable?: boolean;

  /** Anything the host wants to carry along; the calendar never reads it. */
  readonly data?: unknown;
}

/**
 * A move or a resize, emitted before anything is applied. `events` is an input,
 * so the calendar cannot mutate it: apply the change in your own state and the
 * new position renders on the next pass. Ignoring the output cancels the drag.
 */
export interface WrCalendarEventChange {
  /** The event as it was, untouched. */
  readonly event: WrCalendarEvent;

  /** Where it would start. */
  readonly start: Date;

  /** Where it would end, exclusive. */
  readonly end: Date;

  /** Whether the pointer changed the duration (`resize`) or only slid it. */
  readonly kind: 'move' | 'resize';
}

/** An empty stretch of the calendar the user activated. */
export interface WrCalendarSlot {
  /** Start of the slot — midnight in month view, the slot's own time otherwise. */
  readonly start: Date;

  /** End of the slot, exclusive. */
  readonly end: Date;

  /** `true` in month view and in the all-day band. */
  readonly allDay: boolean;
}

/** Implicit context of the `wrCalendarEvent` template. */
export interface WrCalendarEventContext {
  readonly $implicit: WrCalendarEvent;
}
