/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import {
  Component,
  DOCUMENT,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import { WrButton, WrButtonGroup } from 'ngwr/button';
import { WrDateAdapter } from 'ngwr/date-adapter';
import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { numAttr } from 'ngwr/utils';

import { WrCalendarEventTemplate } from './event-calendar-event-template';
import type {
  WrCalendarEvent,
  WrCalendarEventChange,
  WrCalendarEventContext,
  WrCalendarSlot,
  WrCalendarView,
} from './interfaces';

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_WEEK = 7;
const MONTH_ROWS = 6;

/**
 * A chip that spans whole days — every month-view event, and the all-day band
 * of the time views. It lives in the cell where its segment STARTS and reaches
 * right with a `calc()` width, so it stays inside one `role="gridcell"` however
 * far it spans.
 */
interface BandChip {
  readonly key: string;
  readonly event: WrCalendarEvent;
  /** Index of the day it starts on, within the row it was laid out against. */
  readonly column: number;
  readonly span: number;
  readonly lane: number;
  readonly continuesBefore: boolean;
  readonly continuesAfter: boolean;
}

/**
 * A chip positioned against the time grid. Same rule — it belongs to the cell
 * holding its start — but sized in percentages OF THAT CELL, which works only
 * because every slot row is the same height.
 */
interface TimeChip {
  readonly key: string;
  readonly event: WrCalendarEvent;
  /** Offset into the start cell, 0–100. */
  readonly top: number;
  /** Height as a multiple of the cell, ×100. */
  readonly height: number;
  /** Horizontal share of the column, both 0–100. */
  readonly left: number;
  readonly width: number;
  readonly continuesBefore: boolean;
  readonly continuesAfter: boolean;
}

interface DayCell {
  readonly date: Date;
  readonly key: string;
  readonly day: string;
  readonly label: string;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly bands: readonly BandChip[];
  readonly hidden: number;
}

interface MonthWeek {
  readonly key: string;
  readonly days: readonly DayCell[];
}

interface TimeCell {
  readonly key: string;
  readonly date: Date;
  readonly label: string;
  readonly chips: readonly TimeChip[];
}

interface TimeRow {
  readonly key: string;
  readonly label: string;
  /** Minutes from midnight — also what the drag target reads off the cell. */
  readonly minutes: number;
  readonly major: boolean;
  readonly cells: readonly TimeCell[];
}

interface ColumnHeader {
  readonly key: string;
  readonly date: Date;
  readonly weekday: string;
  readonly day: string;
  readonly label: string;
  readonly isToday: boolean;
}

/** Live drag state. `null` whenever the pointer is not down on a chip. */
interface DragState {
  readonly event: WrCalendarEvent;
  readonly kind: 'move' | 'resize';
  readonly originDate: Date;
  readonly originMinutes: number;
  readonly pointerId: number;
}

/**
 * Month / week / day event calendar with drag to move and resize.
 *
 * `events` is an INPUT, never mutated: a drag emits `eventChange` describing
 * where the event would land and stops there. Apply it to your own state and
 * the calendar re-renders — so an unhandled output is a cancelled drag, an
 * optimistic update is one `set`, and a rejected server write needs no rollback
 * path inside the component.
 *
 * Every chip lives inside the `role="gridcell"` where it starts and reaches out
 * with `calc()` widths or percentage heights. That is what keeps the ARIA grid
 * valid — an events layer floating over the grid would leave rows owning
 * something other than cells — and it means no pixel measurement anywhere.
 *
 * **Keyboard.** The grid is one tab stop with a roving cursor: arrows move by
 * day (left / right) and by week or slot (up / down), `Home` / `End` jump to
 * the ends of the row, `Enter` on an empty cell emits `slotClick`, and `Enter`
 * on a cell holding events focuses the first chip (`Escape` returns). On a
 * focused chip, `Alt` + arrows move the event — the keyboard equivalent of the
 * drag, emitting the same `eventChange`.
 *
 * Date math and formatting go through {@link WrDateAdapter}; register one with
 * `provideWrDateAdapter(...)` at bootstrap.
 *
 * @example
 * ```html
 * <wr-event-calendar
 *   editable
 *   [events]="events()"
 *   [(view)]="view"
 *   [(date)]="anchor"
 *   (eventChange)="apply($event)"
 *   (slotClick)="compose($event)"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/event-calendar
 */
@Component({
  selector: 'wr-event-calendar',
  templateUrl: './event-calendar.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    // A drag has to end wherever the pointer is released, including outside the
    // chip it started on — so the host owns the release, not the chip.
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'drag.set(null)',
  },
  imports: [NgTemplateOutlet, WrButton, WrButtonGroup],
})
export class WrEventCalendar {
  /** Everything to render. Never mutated — see `eventChange`. */
  readonly events = input<readonly WrCalendarEvent[]>([]);

  /** Which span is shown. Two-way bindable. @default 'month' */
  readonly view = model<WrCalendarView>('month');

  /** Any date inside the shown span. Two-way bindable. */
  readonly date = model<Date>(new Date());

  /** Which buttons the view switcher offers. Empty hides it. */
  readonly views = input<readonly WrCalendarView[]>(['month', 'week', 'day']);

  /** Allow dragging chips to move and resize them. @default false */
  readonly editable = input(false, { transform: coerceBooleanProperty });

  /** Minutes per row in the time views — also the drag snap. @default 30 */
  readonly slotMinutes = input(30, { transform: numAttr(30) });

  /** First hour the time views show. @default 0 */
  readonly dayStartHour = input(0, { transform: numAttr(0) });

  /** First hour they do NOT show, exclusive. @default 24 */
  readonly dayEndHour = input(24, { transform: numAttr(24) });

  /** Lanes a month cell shows before collapsing the rest into “+N more”. @default 3 */
  readonly maxLanes = input(3, { transform: numAttr(3) });

  /** Hide the built-in header — supply your own navigation instead. @default false */
  readonly hideHeader = input(false, { transform: coerceBooleanProperty });

  /** A chip was activated. */
  readonly eventClick = output<WrCalendarEvent>();

  /** Empty space was activated — the slot the user pointed at. */
  readonly slotClick = output<WrCalendarSlot>();

  /** A drag or an `Alt` + arrow finished. Apply it yourself; nothing moves until you do. */
  readonly eventChange = output<WrCalendarEventChange>();

  private readonly adapter = inject<WrDateAdapter<Date>>(WrDateAdapter);
  private readonly document = inject(DOCUMENT);
  private readonly chipTpl = contentChild(WrCalendarEventTemplate);

  protected readonly todayLabel = readI18nText('eventCalendar.today', 'Today');
  protected readonly previousLabel = readI18nText('eventCalendar.previous', 'Previous');
  protected readonly nextLabel = readI18nText('eventCalendar.next', 'Next');
  protected readonly allDayLabel = readI18nText('eventCalendar.allDay', 'All day');
  protected readonly timeLabel = readI18nText('eventCalendar.time', 'Time');
  protected readonly moreLabel = useI18nFormatter('eventCalendar.more', '+{{count}} more');
  protected readonly viewLabels: Record<WrCalendarView, string> = {
    month: readI18nText('eventCalendar.month', 'Month'),
    week: readI18nText('eventCalendar.week', 'Week'),
    day: readI18nText('eventCalendar.day', 'Day'),
  };

  /** Accessible name of the grid; overridable for a page with several. */
  readonly ariaLabel = input<string | null>(null);
  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'eventCalendar.label', 'Calendar');

  /**
   * `[day, minutes]` of the roving cursor — `minutes === -1` means a month cell
   * or the all-day band. Raw, so it survives a view switch; read
   * {@link cursorCell}, which clamps it to what the current view actually has.
   */
  private readonly cursor = signal<readonly [number, number]>([0, -1]);

  /**
   * The cursor as the current view can honour it. Exactly one cell may carry
   * `tabindex="0"`, so a stale coordinate — the 09:30 row after switching to
   * month, day 34 after switching to week — must fall back to a real cell
   * rather than leave the grid with no tab stop at all.
   */
  protected readonly cursorCell = computed<readonly [number, number]>(() => {
    const [day, minutes] = this.cursor();
    const columns = Math.max(1, this.days().length);
    const clamped = Math.min(columns - 1, Math.max(0, day));

    if (this.view() === 'month') return [clamped, -1];
    if (minutes === -1 && this.hasAllDay()) return [clamped, -1];

    const rows = this.rows();
    const known = rows.some(row => row.minutes === minutes);
    return [clamped, known ? minutes : (rows[0]?.minutes ?? 0)];
  });

  /** Non-null only while a pointer is down on a chip. @internal */
  protected readonly drag = signal<DragState | null>(null);

  protected readonly dragging = computed(() => this.drag()?.event.id ?? null);

  protected readonly chipTemplate = computed<TemplateRef<WrCalendarEventContext> | null>(
    () => this.chipTpl()?.template ?? null
  );

  protected readonly classes = computed(() => {
    const parts = ['wr-event-calendar', `wr-event-calendar--${this.view()}`];
    if (this.editable()) parts.push('wr-event-calendar--editable');
    if (this.drag()) parts.push('wr-event-calendar--dragging');
    return parts.join(' ');
  });

  // ---------------------------------------------------------------- ranges

  /** Inclusive-exclusive window the current view covers. */
  private readonly range = computed<readonly [Date, Date]>(() => {
    const anchor = this.startOfDay(this.date());
    switch (this.view()) {
      case 'day':
        return [anchor, this.adapter.addDays(anchor, 1)];
      case 'week': {
        const start = this.startOfWeek(anchor);
        return [start, this.adapter.addDays(start, DAYS_PER_WEEK)];
      }
      default: {
        const first = this.adapter.createDate(this.adapter.getYear(anchor), this.adapter.getMonth(anchor), 1);
        const start = this.startOfWeek(first);
        return [start, this.adapter.addDays(start, MONTH_ROWS * DAYS_PER_WEEK)];
      }
    }
  });

  /** Every day the view shows, left to right. */
  private readonly days = computed<readonly Date[]>(() => {
    const [start, end] = this.range();
    const count = Math.round((end.getTime() - start.getTime()) / (MINUTES_PER_DAY * 60_000));
    return Array.from({ length: count }, (_, i) => this.adapter.addDays(start, i));
  });

  /** Only what overlaps the window — everything downstream works off this. */
  private readonly visible = computed<readonly WrCalendarEvent[]>(() => {
    const [start, end] = this.range();
    return [...this.events()]
      .filter(e => e.end.getTime() > start.getTime() && e.start.getTime() < end.getTime())
      .sort((a, b) => {
        const byStart = a.start.getTime() - b.start.getTime();
        // Ties go to the longer event, so a week-long band claims its lane
        // before the one-day events sitting alongside it.
        return byStart !== 0 ? byStart : b.end.getTime() - a.end.getTime();
      });
  });

  protected readonly title = computed(() => {
    const anchor = this.date();
    const months = this.adapter.getMonthNames('long');
    switch (this.view()) {
      case 'day':
        return this.adapter.format(anchor, 'longDate');
      case 'week': {
        const [start] = this.range();
        const last = this.adapter.addDays(start, DAYS_PER_WEEK - 1);
        return `${this.adapter.format(start, 'mediumDate')} – ${this.adapter.format(last, 'mediumDate')}`;
      }
      default:
        return `${months[this.adapter.getMonth(anchor)]} ${this.adapter.getYear(anchor)}`;
    }
  });

  /**
   * The adapter contract is "names ordered from `getFirstDayOfWeek()` onwards",
   * so the list is ALREADY rotated. Rotating it again here put every column one
   * day out for every locale whose week does not start on Sunday — invisible in
   * en-US, wrong everywhere else. `wr-calendar` consumes the same call directly.
   */
  protected readonly weekdayNames = computed(() => this.adapter.getDayOfWeekNames('short'));

  protected readonly switcher = computed(() => this.views().map(view => ({ view, label: this.viewLabels[view] })));

  // ----------------------------------------------------------- month model

  protected readonly weeks = computed<readonly MonthWeek[]>(() => {
    const days = this.days();
    const events = this.visible();
    const weeks: MonthWeek[] = [];
    const month = this.adapter.getMonth(this.date());

    for (let w = 0; w * DAYS_PER_WEEK < days.length; w++) {
      const row = days.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK);
      const { chips, hidden } = this.bandLayout(events, row, this.maxLanes());

      weeks.push({
        key: this.iso(row[0]),
        days: row.map((date, col) => ({
          date,
          key: this.iso(date),
          day: String(this.adapter.getDate(date)),
          label: this.adapter.format(date, 'longDate'),
          inMonth: this.adapter.getMonth(date) === month,
          isToday: this.adapter.isSameDay(date, this.adapter.today()),
          bands: chips.filter(chip => chip.column === col),
          hidden: hidden[col],
        })),
      });
    }

    return weeks;
  });

  // ------------------------------------------------------------ time model

  protected readonly columns = computed<readonly ColumnHeader[]>(() => {
    const weekdays = this.adapter.getDayOfWeekNames('short');
    const first = this.adapter.getFirstDayOfWeek();
    return this.days().map(date => ({
      key: this.iso(date),
      date,
      // `weekdays` is indexed from the week's first day; `getDayOfWeek` is
      // absolute (0 = Sunday). Mixing the two spaces named Monday "Tue".
      weekday: weekdays[(this.adapter.getDayOfWeek(date) - first + DAYS_PER_WEEK) % DAYS_PER_WEEK],
      day: String(this.adapter.getDate(date)),
      label: this.adapter.format(date, 'longDate'),
      isToday: this.adapter.isSameDay(date, this.adapter.today()),
    }));
  });

  /** The all-day band above the time grid — same layout as a month week. */
  protected readonly allDayBands = computed<readonly BandChip[]>(() => {
    const days = this.days();
    const events = this.visible().filter(e => e.allDay === true || this.spansWholeDay(e));
    return this.bandLayout(events, days, Number.POSITIVE_INFINITY).chips;
  });

  protected readonly allDayCells = computed<
    readonly { key: string; date: Date; label: string; bands: readonly BandChip[] }[]
  >(() => {
    const days = this.days();
    const chips = this.allDayBands();
    return days.map((date, col) => ({
      key: this.iso(date),
      date,
      label: `${this.allDayLabel} — ${this.adapter.format(date, 'longDate')}`,
      bands: chips.filter(chip => chip.column === col),
    }));
  });

  protected readonly hasAllDay = computed(() => this.allDayBands().length > 0);

  protected readonly rows = computed<readonly TimeRow[]>(() => {
    const slot = Math.max(5, this.slotMinutes());
    const from = Math.max(0, Math.min(23, this.dayStartHour())) * 60;
    const to = Math.max(from + slot, Math.min(24, this.dayEndHour()) * 60);
    const days = this.days();
    const placed = this.timeLayout(days, slot);
    const rows: TimeRow[] = [];

    for (let minutes = from; minutes < to; minutes += slot) {
      rows.push({
        key: String(minutes),
        minutes,
        major: minutes % 60 === 0,
        label: minutes % 60 === 0 ? this.clock(minutes) : '',
        cells: days.map((date, col) => ({
          key: `${this.iso(date)}:${minutes}`,
          date,
          label: `${this.clock(minutes)} — ${this.adapter.format(date, 'longDate')}`,
          chips: placed[col].filter(chip => chip.slotMinutes === minutes).map(chip => chip.chip),
        })),
      });
    }

    return rows;
  });

  // ------------------------------------------------------------------ nav

  protected step(direction: -1 | 1): void {
    const anchor = this.date();
    switch (this.view()) {
      case 'day':
        this.date.set(this.adapter.addDays(anchor, direction));
        break;
      case 'week':
        this.date.set(this.adapter.addDays(anchor, direction * DAYS_PER_WEEK));
        break;
      default:
        this.date.set(this.adapter.addMonths(anchor, direction));
    }
  }

  protected goToday(): void {
    this.date.set(this.adapter.today());
  }

  protected setView(view: WrCalendarView): void {
    this.view.set(view);
  }

  /** “+N more” opens that day — the overflow is only ever a month-view problem. */
  protected openDay(date: Date): void {
    this.date.set(date);
    this.view.set('day');
  }

  // -------------------------------------------------------------- pointer

  protected onChipPointerDown(event: PointerEvent, chipEvent: WrCalendarEvent, kind: 'move' | 'resize'): void {
    if (!this.canDrag(chipEvent) || event.button !== 0) return;

    const cell = this.cellUnder(event.clientX, event.clientY);
    if (!cell) return;

    // The chip must stop swallowing hit-tests, or `elementFromPoint` reports
    // the chip itself for the whole drag and the target never changes.
    try {
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // Capture is an optimisation — it keeps the release on this element even
      // when the pointer leaves it. A pointer that is already gone throws here,
      // and losing capture is not a reason to lose the drag.
    }
    event.preventDefault();
    event.stopPropagation();

    this.drag.set({
      event: chipEvent,
      kind,
      originDate: cell.date,
      originMinutes: cell.minutes,
      pointerId: event.pointerId,
    });
  }

  protected onPointerUp(event: PointerEvent): void {
    const state = this.drag();
    this.drag.set(null);
    if (state?.pointerId !== event.pointerId) return;

    const cell = this.cellUnder(event.clientX, event.clientY);
    if (!cell) return;

    const dayDelta = this.daysBetween(state.originDate, cell.date);
    const minuteDelta = cell.minutes < 0 || state.originMinutes < 0 ? 0 : cell.minutes - state.originMinutes;
    if (dayDelta === 0 && minuteDelta === 0) return;

    const { event: source, kind } = state;
    if (kind === 'resize') {
      const end = this.shift(source.end, dayDelta, minuteDelta);
      // A resize that would end at or before the start is a no-op, not an
      // inverted event.
      if (end.getTime() <= source.start.getTime()) return;
      this.eventChange.emit({ event: source, start: source.start, end, kind });
      return;
    }

    this.eventChange.emit({
      event: source,
      start: this.shift(source.start, dayDelta, minuteDelta),
      end: this.shift(source.end, dayDelta, minuteDelta),
      kind,
    });
  }

  protected onChipClick(event: WrCalendarEvent): void {
    this.eventClick.emit(event);
  }

  protected onCellClick(date: Date, minutes: number): void {
    this.slotClick.emit(this.slotAt(date, minutes));
  }

  // ------------------------------------------------------------- keyboard

  protected onChipKeyDown(event: KeyboardEvent, chipEvent: WrCalendarEvent): void {
    if (event.key === 'Escape') {
      this.focusCell(event);
      return;
    }

    if (!event.altKey || !this.canDrag(chipEvent)) return;

    const slot = Math.max(5, this.slotMinutes());
    const inTime = this.view() !== 'month';
    let days = 0;
    let minutes = 0;

    switch (event.key) {
      case 'ArrowLeft':
        days = -1;
        break;
      case 'ArrowRight':
        days = 1;
        break;
      case 'ArrowUp':
        if (inTime) minutes = -slot;
        else days = -DAYS_PER_WEEK;
        break;
      case 'ArrowDown':
        if (inTime) minutes = slot;
        else days = DAYS_PER_WEEK;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.eventChange.emit({
      event: chipEvent,
      start: this.shift(chipEvent.start, days, minutes),
      end: this.shift(chipEvent.end, days, minutes),
      kind: 'move',
    });
  }

  protected onGridKeyDown(event: KeyboardEvent): void {
    // Handled per cell, not on the grid: the element carrying the keyboard
    // should be the one that actually holds focus. Chips sit inside cells and
    // own their keys, so let anything originating in one bubble straight past.
    if (event.target !== event.currentTarget) return;

    const [day, minutes] = this.cursorCell();
    const columns = this.days().length;
    const rows = this.rows();
    const inTime = this.view() !== 'month';
    let next: readonly [number, number];

    switch (event.key) {
      case 'ArrowLeft':
        next = [Math.max(0, day - 1), minutes];
        break;
      case 'ArrowRight':
        next = [Math.min(columns - 1, day + 1), minutes];
        break;
      case 'ArrowUp':
        next = inTime ? [day, this.stepRow(minutes, -1, rows)] : [Math.max(0, day - DAYS_PER_WEEK), minutes];
        break;
      case 'ArrowDown':
        next = inTime
          ? [day, this.stepRow(minutes, 1, rows)]
          : [day + DAYS_PER_WEEK < columns ? day + DAYS_PER_WEEK : day, minutes];
        break;
      case 'Home':
        next = [day - (day % DAYS_PER_WEEK), minutes];
        break;
      case 'End':
        next = [Math.min(columns - 1, day - (day % DAYS_PER_WEEK) + DAYS_PER_WEEK - 1), minutes];
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const cell = event.target as HTMLElement;
        const chip = cell.querySelector<HTMLElement>('.wr-event-calendar__chip');
        if (chip) chip.focus();
        else this.onCellClick(this.days()[day], minutes);
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    this.cursor.set(next);
    this.focusCursor(event.currentTarget as HTMLElement);
  }

  protected isCursor(day: number, minutes: number): boolean {
    const [d, m] = this.cursorCell();
    return d === day && m === minutes;
  }

  // --------------------------------------------------------------- layout

  /**
   * Greedy lane packing for day-spanning chips. Sorted by start then by length,
   * each segment takes the first lane its columns are free in — the classic
   * interval-graph colouring, and the reason a long event keeps one lane across
   * the whole week instead of stair-stepping.
   *
   * `limit` caps the visible lanes; anything past it is reported per column so
   * the cell can say how much it is hiding.
   */
  private bandLayout(
    events: readonly WrCalendarEvent[],
    days: readonly Date[],
    limit: number
  ): { chips: readonly BandChip[]; hidden: readonly number[] } {
    const first = days[0];
    const last = this.adapter.addDays(days[days.length - 1], 1);
    const lanes: number[][] = [];
    const chips: BandChip[] = [];
    const hidden = days.map(() => 0);

    for (const event of events) {
      if (event.end.getTime() <= first.getTime() || event.start.getTime() >= last.getTime()) continue;

      const from = Math.max(0, this.daysBetween(first, this.startOfDay(event.start)));
      // An exclusive end landing exactly on midnight belongs to the previous
      // day — otherwise every all-day event paints one column too wide.
      const endDay = this.startOfDay(new Date(event.end.getTime() - 1));
      const to = Math.min(days.length - 1, this.daysBetween(first, endDay));
      if (to < from) continue;

      let lane = lanes.findIndex(taken => taken.every(col => col < from || col > to));
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      for (let col = from; col <= to; col++) lanes[lane].push(col);

      if (lane >= limit) {
        for (let col = from; col <= to; col++) hidden[col]++;
        continue;
      }

      chips.push({
        key: `${String(event.id)}:${from}`,
        event,
        column: from,
        span: to - from + 1,
        lane,
        continuesBefore: event.start.getTime() < first.getTime(),
        continuesAfter: event.end.getTime() > last.getTime(),
      });
    }

    return { chips, hidden };
  }

  /**
   * Column layout inside one day: events that overlap in time share the width.
   * Clusters are built by a running high-water mark — a new cluster starts the
   * moment an event begins after everything before it has ended.
   */
  private timeLayout(days: readonly Date[], slot: number): readonly { chip: TimeChip; slotMinutes: number }[][] {
    const from = Math.max(0, Math.min(23, this.dayStartHour())) * 60;
    const to = Math.max(from + slot, Math.min(24, this.dayEndHour()) * 60);
    const timed = this.visible().filter(e => !e.allDay && !this.spansWholeDay(e));

    return days.map(day => {
      const dayStart = this.startOfDay(day);
      const windowStart = dayStart.getTime() + from * 60_000;
      const windowEnd = dayStart.getTime() + to * 60_000;

      const onDay = timed
        .filter(e => e.end.getTime() > windowStart && e.start.getTime() < windowEnd)
        .map(event => ({
          event,
          from: Math.max(windowStart, event.start.getTime()),
          to: Math.min(windowEnd, event.end.getTime()),
        }))
        .sort((a, b) => {
          const byStart = a.from - b.from;
          return byStart !== 0 ? byStart : b.to - a.to;
        });

      const out: { chip: TimeChip; slotMinutes: number }[] = [];
      let cluster: typeof onDay = [];
      let highWater = -1;

      const flush = (): void => {
        for (const [index, item] of cluster.entries()) {
          const minutes = Math.floor((item.from - dayStart.getTime()) / 60_000);
          const slotStart = from + Math.floor((minutes - from) / slot) * slot;
          const length = (item.to - item.from) / 60_000;

          out.push({
            slotMinutes: slotStart,
            chip: {
              key: `${String(item.event.id)}:${minutes}`,
              event: item.event,
              top: ((minutes - slotStart) / slot) * 100,
              height: (length / slot) * 100,
              left: (index / cluster.length) * 100,
              width: (1 / cluster.length) * 100,
              continuesBefore: item.event.start.getTime() < windowStart,
              continuesAfter: item.event.end.getTime() > windowEnd,
            },
          });
        }
        cluster = [];
      };

      for (const item of onDay) {
        if (cluster.length > 0 && item.from >= highWater) flush();
        cluster.push(item);
        highWater = Math.max(highWater, item.to);
      }
      flush();

      return out;
    });
  }

  // --------------------------------------------------------------- chrome

  protected chipLabel(event: WrCalendarEvent): string {
    const time = event.allDay ? this.allDayLabel : this.adapter.format(event.start, 'time');
    return `${event.title}, ${time}`;
  }

  protected chipTime(event: WrCalendarEvent): string {
    return event.allDay ? this.allDayLabel : this.adapter.format(event.start, 'time');
  }

  protected canDrag(event: WrCalendarEvent): boolean {
    return this.editable() && event.editable !== false;
  }

  // --------------------------------------------------------------- helpers

  private slotAt(date: Date, minutes: number): WrCalendarSlot {
    if (minutes < 0) {
      const start = this.startOfDay(date);
      return { start, end: this.adapter.addDays(start, 1), allDay: true };
    }
    const start = new Date(this.startOfDay(date).getTime() + minutes * 60_000);
    return { start, end: new Date(start.getTime() + Math.max(5, this.slotMinutes()) * 60_000), allDay: false };
  }

  /** The `[data-cell]` under the pointer, or `null` outside the grid. */
  private cellUnder(x: number, y: number): { date: Date; minutes: number } | null {
    const el = this.document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell-date]');
    if (!el) return null;
    // Epoch millis rather than a formatted date: `new Date('2026-08-08')` is
    // parsed as UTC and lands on the previous day west of Greenwich.
    const stamp = Number(el.dataset['cellDate']);
    if (!Number.isFinite(stamp)) return null;
    return { date: new Date(stamp), minutes: Number(el.dataset['cellMinutes'] ?? -1) };
  }

  /** Value of a cell's `data-cell-date`. @internal */
  protected stamp(date: Date): number {
    return this.startOfDay(date).getTime();
  }

  private focusCursor(from: HTMLElement): void {
    const [day, minutes] = this.cursorCell();
    from.closest('[role="grid"]')?.querySelector<HTMLElement>(`[data-cell-index="${day}:${minutes}"]`)?.focus();
  }

  private focusCell(event: KeyboardEvent): void {
    event.preventDefault();
    (event.target as HTMLElement).closest<HTMLElement>('[data-cell-date]')?.focus();
  }

  /**
   * Move one time row, treating the all-day band as the row above the first —
   * otherwise the band is mouse-only, which is the kind of gap that makes a
   * keyboard user give up on the whole grid.
   */
  private stepRow(minutes: number, direction: -1 | 1, rows: readonly TimeRow[]): number {
    if (minutes === -1) return direction === 1 ? (rows[0]?.minutes ?? -1) : -1;

    const index = rows.findIndex(row => row.minutes === minutes);
    if (index === -1) return rows[0]?.minutes ?? -1;
    if (index === 0 && direction === -1) return this.hasAllDay() ? -1 : minutes;

    return rows[Math.min(rows.length - 1, index + direction)].minutes;
  }

  private shift(date: Date, days: number, minutes: number): Date {
    return new Date(this.adapter.addDays(date, days).getTime() + minutes * 60_000);
  }

  private startOfDay(date: Date): Date {
    return this.adapter.setTime(date, 0, 0, 0);
  }

  private startOfWeek(date: Date): Date {
    const first = this.adapter.getFirstDayOfWeek();
    const offset = (this.adapter.getDayOfWeek(date) - first + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    return this.startOfDay(this.adapter.addDays(date, -offset));
  }

  /** Whole days apart — computed on the day floor, so DST cannot round it off. */
  private daysBetween(from: Date, to: Date): number {
    const a = this.startOfDay(from);
    const b = this.startOfDay(to);
    return Math.round((b.getTime() - a.getTime()) / (MINUTES_PER_DAY * 60_000));
  }

  private spansWholeDay(event: WrCalendarEvent): boolean {
    return event.end.getTime() - event.start.getTime() >= MINUTES_PER_DAY * 60_000;
  }

  private clock(minutes: number): string {
    const date = this.adapter.setTime(this.adapter.today(), Math.floor(minutes / 60), minutes % 60, 0);
    return this.adapter.format(date, 'time');
  }

  private iso(date: Date): string {
    return `${this.adapter.getYear(date)}-${this.adapter.getMonth(date) + 1}-${this.adapter.getDate(date)}`;
  }
}
