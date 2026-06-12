/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';

import { WrDateAdapter } from 'ngwr/date-adapter';

import type { WrCalendarMode, WrCalendarRange } from './interfaces';

const ROWS = 6;
const COLS = 7;

/**
 * Month-view calendar. Supports single-date selection (`mode="single"`) or
 * date-range selection (`mode="range"`). Reusable on its own; consumed by
 * `<wr-date-picker>` inside an overlay.
 *
 * Uses {@link WrDateAdapter} for all date math and formatting — register
 * one via {@link provideWrDateAdapter} at bootstrap.
 *
 * @example
 * ```html
 * <wr-calendar [(date)]="picked" [min]="minDate" />
 *
 * <wr-calendar mode="range" [(range)]="[start, end]" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/calendar
 */
@Component({
  selector: 'wr-calendar',
  templateUrl: './calendar.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    role: 'grid',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class WrCalendar {
  /** Selection mode. @default 'single' */
  readonly mode = input<WrCalendarMode>('single');

  /** Two-way bindable single value (used when `mode === 'single'`). */
  readonly date = model<Date | null>(null);

  /** Two-way bindable `[start, end]` (used when `mode === 'range'`). */
  readonly range = model<WrCalendarRange>([null, null]);

  /** Min selectable date (inclusive). */
  readonly min = input<Date | null>(null);

  /** Max selectable date (inclusive). */
  readonly max = input<Date | null>(null);

  /** Predicate — return `false` to disable specific dates (e.g. weekends only). */
  readonly dateFilter = input<((date: Date) => boolean) | null>(null);

  /** Disable interaction entirely. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Currently displayed month (any date inside it). */
  protected readonly viewDate = signal(this.adapter.today());

  /** Date currently focused by keyboard (single roving tabindex). */
  protected readonly focusedDate = signal(this.adapter.today());

  /** Hovered date during range-mode end-pick — drives the preview highlight. */
  protected readonly hoverDate = signal<Date | null>(null);

  /** Which sub-view is currently shown. Cycles `day → month → year` on header click. */
  protected readonly viewMode = signal<'day' | 'month' | 'year'>('day');

  protected readonly today = computed(() => this.adapter.today());

  protected readonly weekdayNames = computed(() => this.adapter.getDayOfWeekNames('short'));

  protected readonly monthsView = computed(() => this.adapter.getMonthNames('short'));

  /** 12-year window centered on the floor-aligned decade containing `viewDate`. */
  protected readonly yearsView = computed<readonly number[]>(() => {
    const y = this.adapter.getYear(this.viewDate());
    const start = Math.floor(y / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => start + i);
  });

  protected readonly headerLabel = computed(() => {
    const v = this.viewDate();
    switch (this.viewMode()) {
      case 'day': {
        const monthNames = this.adapter.getMonthNames('long');
        return `${monthNames[this.adapter.getMonth(v)]} ${this.adapter.getYear(v)}`;
      }
      case 'month':
        return `${this.adapter.getYear(v)}`;
      case 'year': {
        const years = this.yearsView();
        return `${years[0]} – ${years[years.length - 1]}`;
      }
    }
  });

  /** 6×7 day grid covering the current month plus spillover. */
  protected readonly weeks = computed<readonly (readonly Date[])[]>(() => {
    const view = this.viewDate();
    const year = this.adapter.getYear(view);
    const month = this.adapter.getMonth(view);
    const firstOfMonth = this.adapter.createDate(year, month, 1);
    const firstWeekday = this.adapter.getDayOfWeek(firstOfMonth);
    const firstDayOfWeek = this.adapter.getFirstDayOfWeek();
    const lead = (firstWeekday - firstDayOfWeek + 7) % 7;
    const gridStart = this.adapter.addDays(firstOfMonth, -lead);

    const out: Date[][] = [];
    for (let w = 0; w < ROWS; w++) {
      const row: Date[] = [];
      for (let d = 0; d < COLS; d++) {
        row.push(this.adapter.addDays(gridStart, w * COLS + d));
      }
      out.push(row);
    }
    return out;
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-calendar', `wr-calendar--${this.mode()}`];
    if (this.disabled()) parts.push('wr-calendar--disabled');
    return parts.join(' ');
  });

  constructor() {
    // Initial focus: selected date if any, else today. Also snap viewDate to that month.
    afterNextRender(() => {
      const initial = this.date() ?? this.range()[0] ?? this.adapter.today();
      this.focusedDate.set(initial);
      this.viewDate.set(initial);
    });

    // Keep viewDate in sync when date / range changes externally to a
    // different month. The viewDate read must stay untracked — otherwise
    // the effect re-runs on every internal navigation (month stepping,
    // year picking) and snaps the view back to the selected month.
    effect(() => {
      const candidate = this.mode() === 'single' ? this.date() : this.range()[0];
      if (!candidate) return;
      untracked(() => {
        if (!this.adapter.isSameMonth(candidate, this.viewDate())) {
          this.viewDate.set(candidate);
        }
      });
    });
  }

  // Navigation

  /** Header `‹` button — steps by month / year / decade based on the active view. */
  protected prev(): void {
    this.viewDate.set(this.stepViewDate(-1));
  }

  /** Header `›` button — steps by month / year / decade based on the active view. */
  protected next(): void {
    this.viewDate.set(this.stepViewDate(1));
  }

  /** Header label click — zooms out (`day → month → year`). No-op at year view. */
  protected onLabelClick(): void {
    if (this.disabled()) return;
    if (this.viewMode() === 'day') {
      this.viewMode.set('month');
    } else if (this.viewMode() === 'month') {
      this.viewMode.set('year');
    }
  }

  protected onMonthSelect(monthIdx: number): void {
    if (this.isMonthDisabled(monthIdx)) return;
    const v = this.viewDate();
    this.viewDate.set(this.adapter.createDate(this.adapter.getYear(v), monthIdx, 1));
    this.viewMode.set('day');
  }

  protected onYearSelect(year: number): void {
    if (this.isYearDisabled(year)) return;
    const v = this.viewDate();
    this.viewDate.set(this.adapter.createDate(year, this.adapter.getMonth(v), 1));
    this.viewMode.set('month');
  }

  private stepViewDate(direction: -1 | 1): Date {
    const v = this.viewDate();
    switch (this.viewMode()) {
      case 'day':
        return this.adapter.addMonths(v, direction);
      case 'month':
        return this.adapter.addYears(v, direction);
      case 'year':
        return this.adapter.addYears(v, direction * 12);
    }
  }

  // Cell state predicates (used by template)

  protected isToday(date: Date): boolean {
    return this.adapter.isSameDay(date, this.today());
  }

  protected isOutOfMonth(date: Date): boolean {
    return !this.adapter.isSameMonth(date, this.viewDate());
  }

  protected isSelected(date: Date): boolean {
    if (this.mode() === 'single') {
      const v = this.date();
      return v ? this.adapter.isSameDay(date, v) : false;
    }
    const [start, end] = this.range();
    if (start && this.adapter.isSameDay(date, start)) return true;
    if (end && this.adapter.isSameDay(date, end)) return true;
    return false;
  }

  protected isInRange(date: Date): boolean {
    if (this.mode() !== 'range') return false;
    const [start, end] = this.range();
    if (!start || !end) return false;
    return this.adapter.compareDate(date, start) > 0 && this.adapter.compareDate(date, end) < 0;
  }

  protected isInRangePreview(date: Date): boolean {
    if (this.mode() !== 'range') return false;
    const [start, end] = this.range();
    const hover = this.hoverDate();
    if (!start || end || !hover) return false;
    const before = this.adapter.compareDate(start, hover) <= 0;
    const lo = before ? start : hover;
    const hi = before ? hover : start;
    return this.adapter.compareDate(date, lo) > 0 && this.adapter.compareDate(date, hi) < 0;
  }

  protected isFocused(date: Date): boolean {
    return this.adapter.isSameDay(date, this.focusedDate());
  }

  protected isDisabled(date: Date): boolean {
    if (this.disabled()) return true;
    const min = this.min();
    if (min && this.adapter.compareDate(date, min) < 0) return true;
    const max = this.max();
    if (max && this.adapter.compareDate(date, max) > 0) return true;
    const filter = this.dateFilter();
    if (filter && !filter(date)) return true;
    return false;
  }

  // Month / year view predicates

  protected isMonthCurrent(monthIdx: number): boolean {
    return this.adapter.getMonth(this.viewDate()) === monthIdx;
  }

  protected isMonthSelected(monthIdx: number): boolean {
    const v = this.mode() === 'single' ? this.date() : this.range()[0];
    if (!v) return false;
    return this.adapter.getYear(v) === this.adapter.getYear(this.viewDate()) && this.adapter.getMonth(v) === monthIdx;
  }

  protected isMonthDisabled(monthIdx: number): boolean {
    if (this.disabled()) return true;
    const year = this.adapter.getYear(this.viewDate());
    const monthStart = this.adapter.createDate(year, monthIdx, 1);
    const monthEnd = this.adapter.createDate(year, monthIdx, this.adapter.getDaysInMonth(monthStart));
    const min = this.min();
    if (min && this.adapter.compareDate(monthEnd, min) < 0) return true;
    const max = this.max();
    if (max && this.adapter.compareDate(monthStart, max) > 0) return true;
    return false;
  }

  protected isYearCurrent(year: number): boolean {
    return this.adapter.getYear(this.viewDate()) === year;
  }

  protected isYearSelected(year: number): boolean {
    const v = this.mode() === 'single' ? this.date() : this.range()[0];
    return v ? this.adapter.getYear(v) === year : false;
  }

  protected isYearDisabled(year: number): boolean {
    if (this.disabled()) return true;
    const min = this.min();
    if (min && year < this.adapter.getYear(min)) return true;
    const max = this.max();
    if (max && year > this.adapter.getYear(max)) return true;
    return false;
  }

  // Interaction

  protected onCellClick(date: Date): void {
    if (this.isDisabled(date)) return;
    if (this.mode() === 'single') {
      this.date.set(this.adapter.clone(date));
    } else {
      this.applyRangeClick(date);
    }
    this.focusedDate.set(date);
    if (!this.adapter.isSameMonth(date, this.viewDate())) {
      this.viewDate.set(date);
    }
  }

  protected onCellEnter(date: Date): void {
    if (this.mode() === 'range') this.hoverDate.set(date);
  }

  protected onCellLeave(): void {
    if (this.mode() === 'range') this.hoverDate.set(null);
  }

  private applyRangeClick(date: Date): void {
    const [start, end] = this.range();
    if (!start || (start && end)) {
      this.range.set([this.adapter.clone(date), null]);
      return;
    }
    if (this.adapter.compareDate(date, start) < 0) {
      this.range.set([this.adapter.clone(date), start]);
    } else {
      this.range.set([start, this.adapter.clone(date)]);
    }
    this.hoverDate.set(null);
  }

  // Keyboard

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const current = this.focusedDate();
    let next: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        next = this.adapter.addDays(current, -1);
        break;
      case 'ArrowRight':
        next = this.adapter.addDays(current, 1);
        break;
      case 'ArrowUp':
        next = this.adapter.addDays(current, -7);
        break;
      case 'ArrowDown':
        next = this.adapter.addDays(current, 7);
        break;
      case 'Home': {
        const dow = this.adapter.getDayOfWeek(current);
        const first = this.adapter.getFirstDayOfWeek();
        next = this.adapter.addDays(current, -((dow - first + 7) % 7));
        break;
      }
      case 'End': {
        const dow = this.adapter.getDayOfWeek(current);
        const first = this.adapter.getFirstDayOfWeek();
        next = this.adapter.addDays(current, 6 - ((dow - first + 7) % 7));
        break;
      }
      case 'PageUp':
        next = event.shiftKey ? this.adapter.addYears(current, -1) : this.adapter.addMonths(current, -1);
        break;
      case 'PageDown':
        next = event.shiftKey ? this.adapter.addYears(current, 1) : this.adapter.addMonths(current, 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onCellClick(current);
        return;
    }

    if (!next) return;
    event.preventDefault();
    this.focusedDate.set(next);
    if (!this.adapter.isSameMonth(next, this.viewDate())) {
      this.viewDate.set(next);
    }
    queueMicrotask(() => this.focusActiveCell());
  }

  private focusActiveCell(): void {
    const el = this.host.nativeElement.querySelector('.wr-calendar__day--focused');
    (el as HTMLElement | null)?.focus();
  }

  /** Used by the template's `track` expression. */
  protected trackByTime(_: number, date: Date): number {
    return date.getTime();
  }
}
