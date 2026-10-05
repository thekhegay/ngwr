/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

import type { WrDatePickerHarness } from '../wr-date-picker-harness';
import type { WrDateRangePickerHarness } from '../wr-date-range-picker-harness';

/**
 * Either picker harness, for a consumer's own helper that does not care which —
 * `async function pickToday(picker: WrAnyDatePickerHarness)`. Both classes extend
 * one abstract base, but that base is not exported and is not going to be: it
 * would publish its `protected` plumbing, and a `<wr-time-panel>` harness for a
 * component this package keeps internal, as a subclassing contract. A union says
 * the only part anyone asked for.
 */
export type WrAnyDatePickerHarness = WrDatePickerHarness | WrDateRangePickerHarness;

/**
 * Which end of a range a `WrDateRangePickerHarness` call applies to. Every call
 * that could mean either field takes one, and it is exported so a consumer's own
 * helper can forward it rather than re-declaring the union.
 */
export type WrDateRangePickerEnd = 'start' | 'end';

/** Narrows which `<wr-date-picker>` a harness query matches. */
export interface WrDatePickerHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the text the field is showing — the formatted value, or `''` when the
   * picker is empty and the placeholder is up. A string is an exact match, a
   * RegExp is tested.
   */
  readonly text?: string | RegExp;
  /** Match the field's placeholder — a string is an exact match, a RegExp is tested. */
  readonly placeholder?: string | RegExp;
  /** Match one mode only. */
  readonly mode?: 'date' | 'time' | 'datetime';
  /** Match only enabled (`false`) or only disabled (`true`) pickers. */
  readonly disabled?: boolean;
  /** Match only pickers whose popup is up (`true`) or down (`false`). */
  readonly open?: boolean;
}

/** Narrows which `<wr-date-range-picker>` a harness query matches. */
export interface WrDateRangePickerHarnessFilters extends BaseHarnessFilters {
  /** Match the text in the START field. A string is an exact match, a RegExp is tested. */
  readonly startText?: string | RegExp;
  /** Match the text in the END field. A string is an exact match, a RegExp is tested. */
  readonly endText?: string | RegExp;
  /** Match one mode only. The range picker has no `time` mode. */
  readonly mode?: 'date' | 'datetime';
  /** Match only enabled (`false`) or only disabled (`true`) pickers. */
  readonly disabled?: boolean;
  /** Match only pickers whose popup is up (`true`) or down (`false`). */
  readonly open?: boolean;
}

/** Narrows which day cell inside a picker's calendar a harness query matches. */
export interface WrDatePickerDayHarnessFilters extends BaseHarnessFilters {
  /**
   * Match the cell's day number as rendered (`'1'` … `'31'`). A string is an
   * exact match, a RegExp is tested — note the grid spills into the neighbouring
   * months, so a number appears twice on most months.
   */
  readonly text?: string | RegExp;
  /** Match only selected (`true`) or only unselected (`false`) cells. */
  readonly selected?: boolean;
  /** Match only enabled (`false`) or only disabled (`true`) cells. */
  readonly disabled?: boolean;
  /**
   * Match cells strictly BETWEEN the two ends of a picked range — the ends
   * themselves are `selected`, not `inRange`. Always `false` for
   * `<wr-date-picker>`, whose calendar has a single value.
   */
  readonly inRange?: boolean;
}
