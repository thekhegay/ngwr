/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input, output, viewChild } from '@angular/core';

import { WrCalendar } from 'ngwr/calendar';
import { WrDateAdapter } from 'ngwr/date';

import { WrTimePanel } from './time-panel';

/**
 * Internal panel that stacks a `<wr-calendar>` and a `<wr-time-picker>`,
 * combining their selections into a single `Date`. Owned by
 * `<wr-date-picker mode="datetime">` — not part of the public API.
 *
 * @internal
 */
@Component({
  selector: 'wr-date-time-panel',
  templateUrl: './date-time-panel.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-date-time-panel' },
  imports: [WrCalendar, WrTimePanel],
})
export class WrDateTimePanel {
  readonly value = input<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');
  readonly showSeconds = input(false);
  readonly step = input(1);

  /**
   * The picker's `readonly`. The calendar stays browsable — that is the picker's
   * contract — but a day click is refused here, and the time half takes the flag
   * itself, so nothing in the panel moves to a value the model will not take.
   */
  readonly readonly = input(false);

  /**
   * Forwarded to the calendar only: a datetime panel opened from the keyboard
   * lands on the day grid, never on the hours field. Picking the date first is
   * the order the panel is laid out in, and the time fields are one Tab away.
   */
  readonly autoFocus = input(false);

  readonly changed = output<Date>();

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly calendar = viewChild.required(WrCalendar);

  /** Date portion used by the calendar — falls back to today when value is null. */
  protected readonly calendarValue = computed(() => this.value() ?? this.adapter.today());

  /** Value passed to the time picker — falls back to today (00:00) when null. */
  protected readonly timeValue = computed(() => this.value() ?? this.adapter.today());

  protected onCalendarSelect(date: Date | null): void {
    if (!date) return;
    if (this.readonly()) {
      // The click has already moved the calendar's own model, and the `[date]` binding
      // will not push an unchanged value back — so the grid would keep announcing the
      // refused day as selected. Put it back by hand.
      this.calendar().date.set(this.calendarValue());
      return;
    }
    const base = this.value() ?? this.adapter.today();
    const combined = this.adapter.setTime(
      this.adapter.createDate(this.adapter.getYear(date), this.adapter.getMonth(date), this.adapter.getDate(date)),
      this.adapter.getHours(base),
      this.adapter.getMinutes(base),
      this.adapter.getSeconds(base)
    );
    this.changed.emit(combined);
  }

  protected onTimeChange(time: Date | null): void {
    if (!time) return;
    const base = this.value() ?? this.adapter.today();
    const combined = this.adapter.setTime(
      this.adapter.createDate(this.adapter.getYear(base), this.adapter.getMonth(base), this.adapter.getDate(base)),
      this.adapter.getHours(time),
      this.adapter.getMinutes(time),
      this.adapter.getSeconds(time)
    );
    this.changed.emit(combined);
  }
}
