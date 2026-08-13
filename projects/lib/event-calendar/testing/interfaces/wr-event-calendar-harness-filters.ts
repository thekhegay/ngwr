/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrCalendarView } from 'ngwr/event-calendar';

/** Narrows which `<wr-event-calendar>` a harness query matches. */
export interface WrEventCalendarHarnessFilters extends BaseHarnessFilters {
  /** Match the header title as printed — a string is an exact match, a RegExp is tested. */
  readonly title?: string | RegExp;
  /** Match the view the calendar is showing. */
  readonly view?: WrCalendarView;
}

/** Narrows which event chip a harness query matches. */
export interface WrEventCalendarChipHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the chip's accessible name, which is the time and the title together —
   * the visible text is `aria-hidden`, so this is what a screen reader gets.
   */
  readonly label?: string | RegExp;
  /** Match the chip's title text as printed. */
  readonly title?: string | RegExp;
  /** Match day-spanning bands (`true`) or timed chips (`false`). */
  readonly band?: boolean;
}
