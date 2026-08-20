/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';

import { WrCalendar, type WrCalendarRange } from 'ngwr/calendar';
import { WrDateAdapter } from 'ngwr/date';
import { readI18nText } from 'ngwr/i18n';

import type { WrDateRange } from '../interfaces';

import { WrTimePanel } from './time-panel';

/**
 * Internal panel behind `<wr-date-range-picker>`: a range-mode
 * `<wr-calendar>`, plus one `<wr-time-picker>` per end when `withTime` is on.
 * Not part of the public API.
 *
 * The calendar owns range picking (including the start/end swap and the hover
 * preview); this panel only re-attaches the times so a datetime range keeps the
 * hours the user set while the dates move around.
 *
 * The steppers bind `WrTimePanel`'s own `value` model, NOT `[ngModel]`. The
 * classic-forms bridge defers its first write, and under zoneless change
 * detection that write lost the race with the panel's own echo guard: a range
 * bound to 16:00–17:00 opened showing 00:00 on both ends, and the first click
 * on a stepper committed midnight-plus-one over the real value.
 *
 * @internal
 */
@Component({
  selector: 'wr-date-range-panel',
  templateUrl: './date-range-panel.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-date-range-panel' },
  imports: [WrCalendar, WrTimePanel],
})
export class WrDateRangePanel {
  readonly value = input<WrDateRange>([null, null]);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);
  readonly withTime = input(false);
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');
  readonly showSeconds = input(false);
  readonly step = input(1);

  /**
   * Forwarded to the calendar only: a range panel opened from the keyboard
   * lands on the day grid, never on a time field. Dates come first here — the
   * steppers are for the range you have already drawn.
   */
  readonly autoFocus = input(false);

  /** A range change from the CALENDAR — the picker is free to sort it. */
  readonly changed = output<WrDateRange>();

  /**
   * A range change from one of the TIME steppers, which must NOT be sorted while
   * it is happening. The steppers are bound to positions, so sorting mid-edit
   * moves the user's change to the other end: raising a same-day start past the
   * end left the start stuck and pushed the END up instead, once per click, on
   * the button the user was not pressing. Ordering is settled when the popup
   * closes — the same rule the text inputs already follow for typing.
   */
  readonly timeChanged = output<WrDateRange>();

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  protected readonly startTimeLabel = readI18nText('datePicker.startTime', 'Start time');
  protected readonly endTimeLabel = readI18nText('datePicker.endTime', 'End time');

  /**
   * A time set before its end has a date. The stepper is always live, so the
   * hours are parked here until a date arrives to carry them — otherwise the
   * edit would be silently dropped and the pick would land on midnight.
   */
  private readonly pendingStartTime = signal<Date | null>(null);
  private readonly pendingEndTime = signal<Date | null>(null);

  /** The calendar's own range model shape — same tuple, narrower name. */
  protected readonly calendarRange = computed<WrCalendarRange>(() => this.value());

  /**
   * Midnight today. The steppers need a concrete date to render, but the
   * fallback must NOT be the current wall clock: picking a date carries no time
   * across until a stepper is touched, so a `14:37` default would display a time
   * the commit never actually stores.
   */
  private readonly dayStart = computed(() => {
    const t = this.adapter.today();
    return this.adapter.createDate(this.adapter.getYear(t), this.adapter.getMonth(t), this.adapter.getDate(t));
  });

  /** Time steppers need a concrete date; fall back to a parked time, then midnight. */
  protected readonly startTime = computed(() => this.value()[0] ?? this.pendingStartTime() ?? this.dayStart());
  protected readonly endTime = computed(() => this.value()[1] ?? this.pendingEndTime() ?? this.dayStart());

  protected onRangeChange(range: WrCalendarRange): void {
    const [start, end] = range;
    const [prevStart, prevEnd] = this.value();

    // `WrCalendar.pickRange` restarts the range whenever it has no start, so a
    // range that was end-only (typed into the end input alone) would lose that
    // end on the next click. Read the click as filling in the missing start
    // instead; the picker orders the pair afterwards.
    const keptEnd = !prevStart && prevEnd && start && !end ? prevEnd : end;

    // The calendar only moves dates, so carry each end's existing time across —
    // or the time parked by a stepper that ran before this date existed.
    this.changed.emit([
      this.withTimeOf(start, prevStart ?? this.pendingStartTime()),
      this.withTimeOf(keptEnd, prevEnd ?? this.pendingEndTime()),
    ]);
  }

  protected onStartTimeChange(time: Date | null): void {
    if (!time) return;
    const [start, end] = this.value();
    if (!start) {
      this.pendingStartTime.set(time);
      return;
    }
    this.timeChanged.emit([this.withTimeOf(start, time), end]);
  }

  protected onEndTimeChange(time: Date | null): void {
    if (!time) return;
    const [start, end] = this.value();
    if (!end) {
      this.pendingEndTime.set(time);
      return;
    }
    this.timeChanged.emit([start, this.withTimeOf(end, time)]);
  }

  /** `date`'s calendar day carrying `time`'s clock. Null date stays null. */
  private withTimeOf(date: Date | null, time: Date | null): Date | null {
    if (!date) return null;
    if (!this.withTime() || !time) return date;
    return this.adapter.setTime(
      this.adapter.createDate(this.adapter.getYear(date), this.adapter.getMonth(date), this.adapter.getDate(date)),
      this.adapter.getHours(time),
      this.adapter.getMinutes(time),
      this.adapter.getSeconds(time)
    );
  }
}
