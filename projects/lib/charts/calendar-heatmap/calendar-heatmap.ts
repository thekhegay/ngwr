/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { WrChartScale, type WrChartLegendPosition } from 'ngwr/charts/chart-legend';
import { WrChartState, WrChartTable, type WrChartTableData, useChartNumbers, useChartState } from 'ngwr/charts/core';
import { wrDateLocale } from 'ngwr/date';
import { useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

import type { WrHeatmapDatum } from './types';

interface Cell {
  readonly iso: string;
  /** The day as the reader's locale writes it — see `cellTitle`. */
  readonly date: Date;
  readonly value: number;
  readonly intensity: number;
  /** Its step on the scale: 0 for a day of nothing, 1 to 5 for a day of something. */
  readonly level: number;
  /** The paint of its level, written on the square. */
  readonly paint: string;
  readonly week: number;
  readonly day: number;
}

/**
 * The steps of the sequential scale a day of something is painted with, lowest first: the
 * chart's own hooks, which the stylesheet points at `--wr-chart-seq-1` to `-5`. Written
 * out, so each hook is read by name.
 */
const STEPS = [
  'var(--wr-calendar-heatmap-step-1)',
  'var(--wr-calendar-heatmap-step-2)',
  'var(--wr-calendar-heatmap-step-3)',
  'var(--wr-calendar-heatmap-step-4)',
  'var(--wr-calendar-heatmap-step-5)',
] as const;

/** A day in the form the data usually gives it, which sorts as a date does: `2026-03-09`. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Every `Intl.DateTimeFormat` the calendars have asked for, by locale and options. */
const DATE_FORMATS = new Map<string, Intl.DateTimeFormat>();

/**
 * The `Intl.DateTimeFormat` for `locale` and `options`, built once for the page: every
 * calendar built four of its own, 0.4 ms an instance, and a formatter holds no state.
 */
function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = DATE_FORMATS.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    DATE_FORMATS.set(key, format);
  }
  return format;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseInput(value: string | Date): Date {
  return value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
}

/** Which rows carry a weekday label: three of seven, or they do not fit. */
const LABELLED_ROWS = new Set([1, 3, 5]);

/**
 * A day's contribution, with anything non-finite read as `0`.
 *
 * One `NaN` used to flatten the entire rendered window rather than its own day:
 * `Math.max(a, NaN)` is `NaN`, so the data set's maximum became `NaN`, `max > 0`
 * was false, and every cell fell to intensity 0 — a map that reads as a stretch
 * with no activity at all. The bad day also printed the literal text `NaN` in its
 * `title`.
 */
function amount(raw: number): number {
  return Number.isFinite(raw) ? raw : 0;
}

/**
 * GitHub-style year-grid heatmap. One column per ISO week, one row per
 * weekday — cells coloured by `value` relative to the largest day drawn.
 *
 * **The scale.** A day of something takes one of five levels by its share of the largest
 * day, painted with the chart theme's sequential scale: `--wr-chart-seq-1`, a tint of the
 * first palette colour, up to `--wr-chart-seq-5`, the colour itself. `color` steps the same
 * five from a colour of the chart's own. A day of nothing is the theme's track, and every
 * square carries a faint edge, so the lowest level still reads on a dark surface. A scale
 * key under the grid shows the levels from 0 to the largest day (`showLegend`,
 * `legendPosition`).
 *
 * **Empty, loading, error.** With no data the grid keeps its squares and says "No data"
 * under them; `loading` and `error` put their own message there.
 *
 * **A year does not reflow.** Its 53 columns are a fixed cell size, so in a container
 * narrower than the grid the host scrolls sideways. While it does, it is a tab stop with
 * the shared focus ring, so the keyboard can scroll it too — WebKit makes no scroller
 * focusable by itself — and it opens on the inline END, the newest weeks, rather than on
 * the oldest. The stop carries no name of its own: focus lands on the grid's picture,
 * named by `ariaLabel`.
 *
 * **What a screen reader gets.** The grid is one named `role="img"` and every square is
 * hidden, so the days' values are not in text anywhere unless `dataTable` renders them;
 * without it, say what the year shows in `ariaLabel`.
 *
 * @example
 * ```html
 * <wr-calendar-heatmap [data]="contributions" />
 * <wr-calendar-heatmap [data]="data" [endDate]="today" [weeks]="26" color="#10b981" />
 * ```
 *
 * @see https://ngwr.dev/charts/calendar-heatmap
 */
@Component({
  selector: 'wr-calendar-heatmap',
  templateUrl: './calendar-heatmap.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the scale key's room from the grid.
    class: 'wr-calendar-heatmap wr-chart--legend',
    // A colour of the chart's own for the highest level, which the stylesheet then steps
    // the lower ones from. Without one the levels are the chart theme's sequential scale.
    '[class.wr-calendar-heatmap--tinted]': 'color() !== null',
    '[style.--wr-calendar-heatmap-scale-color]': 'color()',
    // A tab stop only while the year is wider than its container: see `scrollable`.
    '[attr.tabindex]': 'scrollable() ? 0 : null',
  },
  imports: [WrChartScale, WrChartState, WrChartTable],
})
export class WrCalendarHeatmap {
  /**
   * One entry per day — `{ date, value }`. Days you pass nothing for render as
   * empty cells, so a sparse array is the normal shape rather than a gap. Rows outside
   * the weeks drawn are skipped, and do not move the scale.
   */
  readonly data = input<readonly WrHeatmapDatum[]>([]);

  /**
   * Accessible name of the whole grid. Its cells are bare spans whose `title` a screen
   * reader on a role-less element does not read, so the map used to be several hundred
   * anonymous nodes with no name. Falls back to `calendarHeatmap.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'calendarHeatmap.label', 'Calendar heatmap');

  private readonly cellText = useI18nFormatter('calendarHeatmap.cell', '{{date}}: {{count}}');

  /**
   * A cell's tooltip, with both halves formatted and the sentence in the catalog.
   *
   * It used to be `` `${cell.iso}: ${cell.value}` `` — a raw ISO date beside an
   * unformatted number, joined by a hard-coded `': '`. Three things were wrong
   * at once and none of them are visible from the template: `2026-09-10` is not
   * how most of the world writes a date, `1234` is not how every locale groups
   * digits (`ar-SA` does not even use these ones), and the separator and order
   * were frozen into a shape a translator could not reach.
   *
   * Both halves go through `Intl`: the date in `WR_DATE_LOCALE`, which the weekday
   * and month labels use too and which follows Angular's `LOCALE_ID` unless
   * `withDates()` pins it, and the count in `LOCALE_ID` itself — or through
   * `valueFormat` — as every chart writes its numbers. The key ships as
   * `{{date}}: {{count}}` everywhere, so nothing reorders today and every locale can.
   */
  protected cellTitle(cell: { readonly date: Date; readonly value: number }): string {
    return this.cellText({ date: this.dateFormat().format(cell.date), count: this.numbers.value(cell.value) });
  }

  /**
   * The formatters, built once. They were built per call, and with `tooltip` off
   * the template asks for every square's title on every pass — so each `mousemove`
   * over the grid, which still marks the view for check, built 740 of them: 44,400
   * for 60 moves, measured in dev mode at 907–931ms against 348–358ms with the
   * tooltip on.
   */
  private readonly dateFormat = computed(() => dateFormat(this.locale, { dateStyle: 'medium' }));

  /**
   * Every square's `title`, and only while the tooltip is off — the tooltip carries the
   * same sentence, and the browser would open a second copy a moment later. Worked out
   * when the days or the catalog change, not on every pass of the template.
   */
  protected readonly titles = computed(() => (this.tooltip() ? null : this.cells().map(cell => this.cellTitle(cell))));

  /** Last day to render. @default today */
  readonly endDate = input<string | Date | null>(null);

  /** Number of weeks (columns) to render. @default 53 */
  readonly weeks = input(53, { transform: (v: unknown): number => Math.max(4, coerceNumberProperty(v, 53)) });

  /**
   * Cell side in CSS pixels. Twelve with a gap of three reads as a grid of days; the
   * eleven and two it was before 16.5 ran the squares together. @default 12
   */
  readonly cellSize = input(12, { transform: (v: unknown): number => Math.max(4, coerceNumberProperty(v, 12)) });

  /** Pixel gap between cells. @default 3 */
  readonly cellGap = input(3, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 3)) });

  /**
   * The colour of the highest level: any CSS colour, `var(--wr-…)` included. The four
   * levels under it are stepped from it toward the surface, as the chart theme steps its
   * own scale. `null` paints the levels with the theme's sequential scale,
   * `--wr-chart-seq-1` to `-5`, which an app retints for every chart at once.
   * @default null
   */
  readonly color = input<string | null>(null);

  /**
   * Background colour for zero-value days. `null` takes `--wr-calendar-heatmap-empty`,
   * the chart theme's track. @default null
   */
  readonly emptyColor = input<string | null>(null);

  /** Show the scale key: the levels from 0 to the largest day. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /**
   * Where the scale key sits: under the grid, over it, or `none` for no key at all. It
   * keeps to the inline end, where the newest weeks are, so it stays in sight while the
   * year scrolls. @default 'bottom'
   */
  readonly legendPosition = input<Exclude<WrChartLegendPosition, 'start' | 'end'>>('bottom');

  /**
   * A request for the days is in flight: the grid keeps its squares, all empty, and the
   * loading message sits under them. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The days failed to load: the grid keeps its squares, all empty, with the error
   * message under them. `loading` wins while both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown with no data. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

  /** Show the weekday + month labels around the grid. @default true */
  readonly showLabels = input(true, { transform: coerceBooleanProperty });

  /**
   * Show a tooltip with the day and its count on hover. It is the sentence the
   * square's `title` carried, so the `title` is written only while this is off —
   * or the browser would open a second copy a moment later. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes each day's count in the tooltip, the `title` and the data table. `null` uses
   * `Intl.NumberFormat` in `LOCALE_ID`.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /**
   * Render the days' values as a table that only assistive technology reaches: a row per
   * week, headed by its dates, and a column per weekday, each day's count written the way
   * the tooltip writes it. A day after the last one drawn is an empty cell.
   *
   * The grid is one named `role="img"`, which hides everything inside it, so without the
   * table the values are nowhere a screen reader can walk. It is rendered beside the grid,
   * clipped to nothing: it takes no room, draws nothing and holds no tab stop.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /** A day's count as the tooltip, the `title` and the data table write it, in `LOCALE_ID`: never compact. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly daysEl = viewChild<ElementRef<HTMLElement>>('days');

  private readonly gridEl = viewChild<ElementRef<HTMLElement>>('grid');

  /**
   * Whether the year is wider than the host, which then scrolls it — and is a tab stop
   * while it does. `axe`'s `scrollable-region-focusable` named the scroller with no stop
   * at all, and in WebKit, which makes no scroller focusable by itself, a keyboard could
   * not reach the newest weeks. Measured in the browser after render and on every resize;
   * `false` on the server and in jsdom, which lay nothing out.
   */
  protected readonly scrollable = signal(false);

  private readonly dateLocale = wrDateLocale();

  private get locale(): string {
    return this.dateLocale();
  }

  /**
   * Weekday names from the locale rather than a hard-coded English list — the row order is
   * Sunday-first, matching the grid's own alignment, so 7 Jan 2024 (a Sunday) is the
   * reference. Rows without a label stay blank on purpose: seven labels do not fit.
   */
  protected readonly weekdayLabels = computed<readonly string[]>(() => {
    const formatter = dateFormat(this.locale, { weekday: 'short' });
    const sunday = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, row) => {
      if (!LABELLED_ROWS.has(row)) return '';
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + row);
      return formatter.format(day);
    });
  });

  private readonly monthNames = computed<readonly string[]>(() => {
    const formatter = dateFormat(this.locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, month) => formatter.format(new Date(2024, month, 15)));
  });

  protected readonly cells = computed<readonly Cell[]>(() => {
    const end = this.endDate() ? parseInput(this.endDate()!) : new Date();
    end.setHours(0, 0, 0, 0);
    const weeks = this.weeks();
    // A state shows the grid as its frame: every square empty.
    const data = this.state() && this.state()?.kind !== 'empty' ? [] : this.data();

    // Walk backwards from end day; arrange into columns by week, rows by weekday.
    const out: Cell[] = [];
    // Exactly `weeks` columns, the last of them the week `end` falls in, every
    // column starting on a Sunday (matches GitHub).
    //
    // Counted in WEEKS rather than in days. It used to allocate `weeks * 7`
    // days and then align the start back to a Sunday, which adds up to six
    // more — so any alignment at all produced one column more than asked for:
    // 54 for the default 53, with `--wr-calendar-heatmap-columns` reporting 54 and a
    // container sized from `weeks * (cellSize + cellGap)` one column short.
    const start = new Date(end);
    start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7);

    // Build value lookup, from the rows inside the window only. Ten years of days handed
    // to a year's calendar parsed every one of them, 19 ms for ten thousand rows, to keep
    // 371. A day written `2026-03-09` sorts as a date does, so one outside the window is
    // told by a string compare and never parsed; a week of margin at the start keeps a
    // day the calendar rolls over (`2026-02-31` is 3 March) where it was. A `Date` is
    // told by its time. The largest day is taken over the rows kept.
    const from = new Date(start);
    from.setDate(start.getDate() - 7);
    const firstIso = toIso(from);
    const lastIso = toIso(end);
    const firstTime = start.getTime();
    const lastTime = end.getTime() + 86_400_000;
    const map = new Map<string, number>();
    let max = 0;
    for (const d of data) {
      const { date } = d;
      if (typeof date === 'string') {
        if (ISO_DAY.test(date) && (date < firstIso || date > lastIso)) continue;
      } else {
        const time = date.getTime();
        if (time < firstTime || time >= lastTime) continue;
      }
      const iso = toIso(parseInput(date));
      const sum = (map.get(iso) ?? 0) + amount(d.value);
      map.set(iso, sum);
    }
    const startIso = toIso(start);
    for (const [iso, sum] of map) if (iso >= startIso && iso <= lastIso && sum > max) max = sum;

    const empty = this.emptyColor() ?? 'var(--wr-calendar-heatmap-empty)';
    const cursor = new Date(start);
    let column = 0;
    while (cursor <= end) {
      for (let row = 0; row < 7; row++) {
        // Stop at `end`. The inner loop always walks a whole week, so once the
        // cursor crossed `end` mid-week it kept going to Saturday — up to six
        // days AFTER the last day to render, drawn as ordinary `value: 0`
        // squares and indistinguishable from a past day of no activity. With
        // the default that is today plus five future days.
        if (cursor > end) break;
        const iso = toIso(cursor);
        const value = map.get(iso) ?? 0;
        // Clamped at the BOTTOM as well as the top. A negative value produced a
        // negative intensity, which is not zero — so `colorFor` painted it in
        // the accent colour and `opacityFor` put it in the lightest band,
        // rendering a day of negative activity exactly like a day of light
        // activity, and unlike the empty day it should have matched. The scale
        // has no negative half; the honest floor is "nothing".
        const intensity = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
        // Five levels over the days of something, the largest day on the fifth; a day of
        // nothing has none, and is painted as the track.
        const level = intensity === 0 ? 0 : Math.min(STEPS.length, Math.ceil(intensity * STEPS.length - 1e-9));
        const paint = level === 0 ? empty : STEPS[level - 1];
        out.push({ iso, date: new Date(cursor), value, intensity, level, paint, week: column, day: row });
        cursor.setDate(cursor.getDate() + 1);
      }
      column++;
    }
    return out;
  });

  /** Every weekday's full name, Sunday first as the rows are: the data table's columns. */
  private readonly weekdayNames = computed<readonly string[]>(() => {
    const formatter = dateFormat(this.locale, { weekday: 'long' });
    return Array.from({ length: 7 }, (_, row) => formatter.format(new Date(2024, 0, 7 + row)));
  });

  /**
   * The figures for `dataTable`: the grid's name as the caption, a column per weekday and
   * a row per week, headed by the week's first and last day drawn — `formatRange`, so the
   * locale writes the span its own way — and every day's count as the tooltip writes it.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const range = this.dateFormat();
    const weeks: (Cell | undefined)[][] = [];
    for (const cell of this.cells()) (weeks[cell.week] ??= [])[cell.day] = cell;
    return {
      caption: this.resolvedAriaLabel(),
      columns: this.weekdayNames(),
      groups: [
        {
          rows: weeks.map(days => {
            const drawn = days.filter((day): day is Cell => day !== undefined);
            return {
              header: range.formatRange(drawn[0].date, drawn[drawn.length - 1].date),
              cells: Array.from({ length: 7 }, (_, d) => (days[d] ? this.numbers.value(days[d].value) : '')),
            };
          }),
        },
      ],
    };
  });

  protected readonly monthLabels = computed(() => {
    // Pull the first cell of each visible month → render a label centered
    // over its column.
    const cells = this.cells();
    const seen = new Set<string>();
    // Off the date each cell already carries: its ISO string was parsed again here, twice
    // for a month's first day, 371 string parses a pass.
    return cells
      .filter(({ date }) => {
        if (date.getDate() !== 1) return false;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(cell => ({ label: this.monthNames()[cell.date.getMonth()], week: cell.week }));
  });

  /** The largest day drawn, which the highest level stands for; 0 with no day of something. */
  private readonly peak = computed(() => this.cells().reduce((max, cell) => Math.max(max, cell.value), 0));

  /**
   * The scale key: a day of nothing, then the five levels, between 0 and the largest day
   * as the tooltip writes a count. With no day of something it keys the empty square alone.
   */
  protected readonly legend = computed(() => {
    const peak = this.peak();
    const empty = this.emptyColor() ?? 'var(--wr-calendar-heatmap-empty)';
    return {
      min: this.numbers.value(0),
      max: peak > 0 ? this.numbers.value(peak) : null,
      steps: peak > 0 ? [empty, ...STEPS] : [empty],
    };
  });

  /** Whether the chart draws its scale key: with `showLegend`, unless `legendPosition` is `none`. */
  protected readonly legendShown = computed(() => this.showLegend() && this.legendPosition() !== 'none');

  /** What the chart shows under its grid in place of the scale key, or `null` while it draws its days. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: computed(() => this.data().length === 0),
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  protected readonly columnCount = computed(() => {
    const cells = this.cells();
    return cells.length === 0 ? 0 : cells[cells.length - 1].week + 1;
  });

  /** Each day's position in `cells()`, for the square the pointer lands on. */
  private readonly indexByIso = computed(() => new Map(this.cells().map((cell, index) => [cell.iso, index])));

  /**
   * One tooltip for the whole year, pointing at the hovered day: above its square,
   * below it when there is no room above, and slid along the viewport edge for the
   * first and last weeks with the arrow still on the square. A listener on the grid
   * rather than one per square: a year is 371 of them.
   *
   * The box is the square's LAYOUT box rather than its client rect. The hovered square
   * grows by `:hover` over a transition, and a rect read part way through it would
   * move the chip by up to a fifth of a square depending on when it was measured;
   * the scale is centred, so the layout box is the rect's centre and the square's
   * own size.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const cell = this.cells()[index];
    // The squares are the container's only children, drawn in `cells()` order.
    const square = cell ? this.daysEl()?.nativeElement.children.item(index) : null;
    if (!cell || !(square instanceof HTMLElement)) return null;
    const rect = square.getBoundingClientRect();
    const width = square.offsetWidth;
    const height = square.offsetHeight;
    return {
      datum: { value: this.cellTitle(cell) },
      anchor: {
        x: (rect.left + rect.right - width) / 2,
        y: (rect.top + rect.bottom - height) / 2,
        width,
        height,
      },
    };
  });

  /**
   * Which square the pointer is on, from a `mousemove` on the grid. Over the gap
   * between two squares it is on none, and the tooltip starts to leave.
   */
  private onCellsPointer(event: MouseEvent): void {
    const iso = (event.target as Element | null)?.closest<HTMLElement>('.wr-calendar-heatmap__cell')?.dataset['date'];
    const index = iso === undefined ? undefined : this.indexByIso().get(iso);
    if (index === undefined) this.tip.leave(event);
    else this.tip.enter(index);
  }

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/calendar-heatmap');
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    // Measured after render, in a browser, and again whenever the host or the grid changes
    // size: the host when its container does, the grid when `weeks` or `cellSize` does.
    // The observer's first report is the first measurement, so a year that boots narrower
    // than its container opens on its newest weeks, and so does one that starts to
    // overflow later — a chart that booted hidden, a window made narrow. A host that
    // already scrolled is left where the reader put it.
    // The pointer, heard on the days by two listeners of the chart's own rather than the
    // template's: a template listener checks the whole year again on every event. These
    // run nothing unless the square under the pointer changes.
    afterNextRender(() => {
      const days = this.daysEl()?.nativeElement;
      if (!days) return;
      const move = (event: MouseEvent): void => this.onCellsPointer(event);
      const leave = (event: MouseEvent): void => this.tip.leave(event);
      days.addEventListener('mousemove', move);
      days.addEventListener('mouseleave', leave);
      destroyRef.onDestroy(() => {
        days.removeEventListener('mousemove', move);
        days.removeEventListener('mouseleave', leave);
      });
    });

    // The ring round the day the tooltip reads, set by hand on that one square.
    let ringed: Element | null = null;
    effect(() => {
      const active = this.tip.active();
      const next = active === null ? null : (this.daysEl()?.nativeElement.children.item(active) ?? null);
      if (next === ringed) return;
      ringed?.classList.remove('wr-calendar-heatmap__cell--active');
      next?.classList.add('wr-calendar-heatmap__cell--active');
      ringed = next;
    });

    afterNextRender(() => {
      const grid = this.gridEl()?.nativeElement;
      if (typeof ResizeObserver === 'undefined') return;
      const measure = (): void => {
        const overflows = host.scrollWidth > host.clientWidth;
        if (overflows && !this.scrollable()) WrCalendarHeatmap.scrollToEnd(host);
        this.scrollable.set(overflows);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(host);
      if (grid) observer.observe(grid);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Scrolls the host to its inline end, where the newest weeks are: the right in LTR and
   * the left under RTL, where `scrollLeft` runs from 0 down to minus the overflow. The
   * value is clamped by the browser, so either sign of the whole width lands on the end.
   */
  private static scrollToEnd(host: HTMLElement): void {
    const rtl = getComputedStyle(host).direction === 'rtl';
    host.scrollLeft = rtl ? -host.scrollWidth : host.scrollWidth;
  }
}

export type { WrHeatmapDatum } from './types';
