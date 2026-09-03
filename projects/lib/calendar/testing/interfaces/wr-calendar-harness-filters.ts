/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrCalendarMode } from 'ngwr/calendar';

/**
 * An arrow key, by the direction a user would say out loud — the parameter type
 * of `WrCalendarHarness.pressArrow`, exported so a consumer's own test helper can
 * name what it forwards.
 */
export type WrCalendarArrowKey = 'left' | 'right' | 'up' | 'down';

/** Which of the three sub-views the calendar is showing. */
export type WrCalendarView = 'day' | 'month' | 'year';

/** One month or year chip, as the picker views render them. */
export interface WrCalendarChip {
  /** The label as printed — a short month name, or the year. */
  readonly label: string;
  /** Whether it is the current selection. */
  readonly selected: boolean;
  /** Whether it is the month / year containing today. */
  readonly current: boolean;
  /** Whether `min` / `max` ruled it out. */
  readonly disabled: boolean;
}

/** Narrows which `<wr-calendar>` a harness query matches. */
export interface WrCalendarHarnessFilters extends BaseHarnessFilters {
  /** Match the header label as printed, e.g. `March 2026`. */
  readonly headerLabel?: string | RegExp;
  /** Match single- or range-selection calendars. */
  readonly mode?: WrCalendarMode;
  /** Match only enabled (`false`) or only disabled (`true`) calendars. */
  readonly disabled?: boolean;
}

/** Narrows which day cell a harness query matches. */
export interface WrCalendarDayHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the cell's day number as rendered (`'1'` … `'31'`). A string is an exact
   * match, a RegExp is tested — note the grid spills into the neighbouring months,
   * so most numbers appear twice.
   */
  readonly text?: string | RegExp;
  /** Match only selected (`true`) or only unselected (`false`) cells. */
  readonly selected?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) cells. */
  readonly disabled?: boolean;
  /**
   * Match cells strictly BETWEEN the two ends of a picked range — the ends
   * themselves are `selected`, not `inRange`.
   */
  readonly inRange?: boolean;
}
