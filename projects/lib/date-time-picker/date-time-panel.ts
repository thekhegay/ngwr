/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrCalendar } from 'ngwr/calendar';
import { WrDateAdapter } from 'ngwr/date-adapter';
import { WrTimePicker } from 'ngwr/time-picker';

/**
 * Internal panel that stacks a `<wr-calendar>` and a `<wr-time-picker>`,
 * combining their selections into a single `Date`. Owned by
 * {@link WrDateTimePicker} — not part of the public API.
 *
 * @internal
 */
@Component({
  selector: 'wr-date-time-panel',
  templateUrl: './date-time-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-date-time-panel' },
  imports: [FormsModule, WrCalendar, WrTimePicker],
})
export class WrDateTimePanel {
  readonly value = input<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);
  readonly timeFormat = input<'auto' | '12h' | '24h'>('auto');
  readonly showSeconds = input(false);
  readonly step = input(1);

  readonly changed = output<Date>();

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);

  /** Date portion used by the calendar — falls back to today when value is null. */
  protected readonly calendarValue = computed(() => this.value() ?? this.adapter.today());

  /** Value passed to the time picker — falls back to today (00:00) when null. */
  protected readonly timeValue = computed(() => this.value() ?? this.adapter.today());

  protected onCalendarSelect(date: Date | null): void {
    if (!date) return;
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
