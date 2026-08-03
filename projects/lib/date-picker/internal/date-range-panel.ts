/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, ViewEncapsulation, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCalendar, type WrCalendarRange } from 'ngwr/calendar';
import { WrDateAdapter } from 'ngwr/date-adapter';
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
 * @internal
 */
@Component({
  selector: 'wr-date-range-panel',
  templateUrl: './date-range-panel.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-date-range-panel' },
  imports: [FormsModule, WrCalendar, WrTimePanel],
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

  readonly changed = output<WrDateRange>();

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  protected readonly startTimeLabel = readI18nText('datePicker.startTime', 'Start time');
  protected readonly endTimeLabel = readI18nText('datePicker.endTime', 'End time');

  /** The calendar's own range model shape — same tuple, narrower name. */
  protected readonly calendarRange = computed<WrCalendarRange>(() => this.value());

  /** Time steppers need a concrete date; fall back to today (00:00) per end. */
  protected readonly startTime = computed(() => this.value()[0] ?? this.adapter.today());
  protected readonly endTime = computed(() => this.value()[1] ?? this.adapter.today());

  protected onRangeChange(range: WrCalendarRange): void {
    const [start, end] = range;
    const [prevStart, prevEnd] = this.value();
    // The calendar only moves dates, so carry each end's existing time across.
    this.changed.emit([this.withTimeOf(start, prevStart), this.withTimeOf(end, prevEnd)]);
  }

  protected onStartTimeChange(time: Date | null): void {
    const [start, end] = this.value();
    if (!time || !start) return;
    this.changed.emit([this.withTimeOf(start, time), end]);
  }

  protected onEndTimeChange(time: Date | null): void {
    const [start, end] = this.value();
    if (!time || !end) return;
    this.changed.emit([start, this.withTimeOf(end, time)]);
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
