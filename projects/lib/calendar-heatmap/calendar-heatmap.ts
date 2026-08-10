/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WR_DATE_LOCALE } from 'ngwr/date-adapter';
import { useI18nText } from 'ngwr/i18n';

import type { WrHeatmapDatum } from './interfaces';

interface Cell {
  readonly iso: string;
  readonly value: number;
  readonly intensity: number;
  readonly week: number;
  readonly day: number;
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
 * GitHub-style year-grid heatmap. One column per ISO week, one row per
 * weekday — cells coloured by `value` relative to the data set's max.
 *
 * @example
 * ```html
 * <wr-calendar-heatmap [data]="contributions" />
 * <wr-calendar-heatmap [data]="data" [endDate]="today" [weeks]="26" color="#10b981" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/calendar-heatmap
 */
@Component({
  selector: 'wr-calendar-heatmap',
  templateUrl: './calendar-heatmap.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-calendar-heatmap' },
})
export class WrCalendarHeatmap {
  readonly data = input<readonly WrHeatmapDatum[]>([]);

  /**
   * Accessible name of the whole grid. Its cells are bare spans whose `title` a screen
   * reader on a role-less element does not read, so the map used to be several hundred
   * anonymous nodes with no name. Falls back to `calendarHeatmap.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'calendarHeatmap.label', 'Calendar heatmap');

  /** Last day to render. @default today */
  readonly endDate = input<string | Date | null>(null);

  /** Number of weeks (columns) to render. @default 53 */
  readonly weeks = input(53, { transform: (v: unknown): number => Math.max(4, coerceNumberProperty(v, 53)) });

  /** Cell side in CSS pixels. @default 11 */
  readonly cellSize = input(11, { transform: (v: unknown): number => Math.max(4, coerceNumberProperty(v, 11)) });

  /** Pixel gap between cells. @default 2 */
  readonly cellGap = input(2, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 2)) });

  /** Cell fill colour at full intensity. @default primary */
  readonly color = input<string>('var(--wr-color-primary)');

  /** Background colour for zero-value days. @default light tint */
  readonly emptyColor = input<string>('rgba(var(--wr-color-light-rgb), 0.5)');

  /** Show the weekday + month labels around the grid. @default true */
  readonly showLabels = input(true, { transform: coerceBooleanProperty });

  private readonly locale = inject(WR_DATE_LOCALE);

  /**
   * Weekday names from the locale rather than a hard-coded English list — the row order is
   * Sunday-first, matching the grid's own alignment, so 7 Jan 2024 (a Sunday) is the
   * reference. Rows without a label stay blank on purpose: seven labels do not fit.
   */
  protected readonly weekdayLabels = computed<readonly string[]>(() => {
    const formatter = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
    const sunday = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, row) => {
      if (!LABELLED_ROWS.has(row)) return '';
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + row);
      return formatter.format(day);
    });
  });

  private readonly monthNames = computed<readonly string[]>(() => {
    const formatter = new Intl.DateTimeFormat(this.locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, month) => formatter.format(new Date(2024, month, 15)));
  });

  protected readonly cells = computed<readonly Cell[]>(() => {
    const end = this.endDate() ? parseInput(this.endDate()!) : new Date();
    end.setHours(0, 0, 0, 0);
    const weeks = this.weeks();
    const totalDays = weeks * 7;

    // Build value lookup.
    const map = new Map<string, number>();
    for (const d of this.data()) {
      const iso = toIso(parseInput(d.date));
      map.set(iso, (map.get(iso) ?? 0) + d.value);
    }
    const max = [...map.values()].reduce((a, b) => Math.max(a, b), 0);

    // Walk backwards from end day; arrange into columns by week, rows by weekday.
    const out: Cell[] = [];
    const start = new Date(end);
    start.setDate(end.getDate() - totalDays + 1);
    // Align start so column 0 begins on a Sunday (matches GitHub).
    start.setDate(start.getDate() - start.getDay());

    const cursor = new Date(start);
    let column = 0;
    while (cursor <= end) {
      for (let row = 0; row < 7; row++) {
        const iso = toIso(cursor);
        const value = map.get(iso) ?? 0;
        const intensity = max > 0 ? Math.min(1, value / max) : 0;
        out.push({ iso, value, intensity, week: column, day: row });
        cursor.setDate(cursor.getDate() + 1);
      }
      column++;
    }
    return out;
  });

  protected readonly monthLabels = computed(() => {
    // Pull the first cell of each visible month → render a label centered
    // over its column.
    const cells = this.cells();
    const seen = new Set<string>();
    return cells
      .filter(cell => {
        const date = new Date(`${cell.iso}T00:00:00`);
        if (date.getDate() !== 1) return false;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(cell => ({
        label: this.monthNames()[new Date(`${cell.iso}T00:00:00`).getMonth()],
        week: cell.week,
      }));
  });

  protected readonly columnCount = computed(() => {
    const cells = this.cells();
    return cells.length === 0 ? 0 : cells[cells.length - 1].week + 1;
  });

  protected colorFor(intensity: number): string {
    if (intensity === 0) return this.emptyColor();
    return this.color();
  }

  protected opacityFor(intensity: number): number {
    if (intensity === 0) return 1;
    // 4 levels — match the GitHub aesthetic.
    if (intensity < 0.25) return 0.25;
    if (intensity < 0.5) return 0.5;
    if (intensity < 0.75) return 0.75;
    return 1;
  }
}

export type { WrHeatmapDatum } from './interfaces';
