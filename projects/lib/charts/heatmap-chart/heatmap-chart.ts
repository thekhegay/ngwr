/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  type ElementRef,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { WrChartTable, type WrChartTableData, useChartNumbers } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { clamp } from 'ngwr/utils';

import type { WrHeatmapMatrix } from './types';

/** The scale's bounds: the lowest and the highest value a step is drawn for. */
interface Scale {
  readonly min: number;
  readonly max: number;
}

/**
 * Which column names are drawn: every `every`-th, from the first, up to `last`. The rest
 * are in the markup still, drawn nowhere.
 */
interface Thinning {
  readonly every: number;
  readonly last: number;
}

/** Every name drawn: what the chart starts with, and keeps on the server and in jsdom. */
const ALL_NAMES: Thinning = { every: 1, last: Number.POSITIVE_INFINITY };

/** One cell as the chart draws it. */
interface Cell {
  readonly row: number;
  readonly column: number;
  /** Its value, or `null` for an empty cell: no data, which is not zero. */
  readonly value: number | null;
  /**
   * Its step's place on the scale, from 0 (the lowest step) to 1 (the colour itself),
   * rounded so the inline style stays short. `null` for an empty cell.
   */
  readonly level: number | null;
  /** The number printed in the cell with `showValues`, compact from a thousand; `''` when it prints none. */
  readonly text: string;
}

/** A value as a step reads it: a finite number, or `null` for an empty cell. */
const valueOf = (raw: unknown): number | null => (typeof raw === 'number' && Number.isFinite(raw) ? raw : null);

/** A bound input: a finite number, or `null` for "from the data". */
const boundOf = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const value = coerceNumberProperty(v, Number.NaN);
  return Number.isFinite(value) ? value : null;
};

/** A level to four decimals, with `-0` folded to `0`, so the inline style stays short. */
const short = (value: number): number => Math.round(value * 1e4) / 1e4 || 0;

/**
 * Heatmap chart: a matrix of values, a row per category on one side and a column per
 * category on the other, each cell painted a step of one colour by its value. For where
 * two categories meet — weekday by hour, region by month, feature by release. For a year
 * of days, `<wr-calendar-heatmap>` lays them out as a calendar. HTML and CSS only — no
 * external dependency.
 *
 * @example
 * ```html
 * <wr-heatmap-chart
 *   [rows]="['Mon', 'Tue', 'Wed']"
 *   [columns]="['Morning', 'Afternoon', 'Evening']"
 *   [data]="[
 *     [12, 30, 8],
 *     [18, null, 11],
 *     [9, 41, 15]
 *   ]"
 *   showValues
 * />
 * ```
 *
 * **The scale.** It runs from `min` to `max`, each the data's own unless given, and is cut
 * into `steps` equal bands. A cell takes its band's step: the lowest is a faint tint of
 * `color` and the highest is `color` itself, every step between mixed from the two in
 * OKLab, whose lightness moves evenly, so the steps look evenly spaced in either colour
 * scheme. A value outside a given `min` or `max` takes the end step; the tooltip and the
 * data table still give its own figure. A legend under the matrix keys the steps from the
 * scale's minimum to its maximum. A scale with no span — every value the same, an
 * all-zero matrix included — has one step, the lowest, and the legend keys that one.
 *
 * **An empty cell is no data, never zero.** A `null`, a value that is not a finite number,
 * or one a shorter row does not reach is drawn hatched and outlined, not as the lowest
 * step, and the legend keys it while any cell is empty (`noDataLabel`).
 *
 * **Colour is the only thing that encodes a value here, by nature** — a heatmap is a
 * picture of where the values are high and low, and its steps are told apart by
 * lightness alone. So the value has a second channel in TEXT: `showValues` prints each
 * number in its cell, where it fits, and `dataTable` renders the whole matrix as a table a
 * screen reader walks. With neither, say what the chart shows in `ariaLabel`. A printed
 * value is black or white, whichever reads better on its own cell, the pick the theme's
 * `-contrast` tokens make.
 *
 * **What a screen reader gets.** The cells are one named `role="img"`; the row and column
 * names are real text beside it, and the legend is hidden, as an axis' ticks are on every
 * chart here. The numbers are in text only in the tooltip, which is pointer only, and in
 * the table `dataTable` renders. No part of the chart is a tab stop.
 *
 * **Names that do not fit.** Where the column names are wider than their columns — an hour
 * per column, on a phone — the chart draws every second, third or later name, the first
 * included, each starting at its own column, and leaves the rest out of sight: measured in
 * the browser after render and again whenever the chart is resized. The names left out
 * are still read by a screen reader, and the tooltip and the data table name every column.
 * A row name is cut with an ellipsis at `--wr-heatmap-chart-row-label-max-width`.
 *
 * The matrix follows `direction`, the way a table does: under RTL the row names are on
 * the right and the first column is the rightmost.
 *
 * @see https://ngwr.dev/charts/heatmap-chart
 */
@Component({
  selector: 'wr-heatmap-chart',
  templateUrl: './heatmap-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-heatmap-chart',
    // The highest step's colour, which every lower step is mixed from: read by the cells
    // and the legend's swatches.
    '[style.--wr-heatmap-chart-scale-color]': 'color()',
  },
  imports: [WrChartTable],
})
export class WrHeatmapChart {
  /**
   * The values, rows × columns: one array per row, in the order of `rows`, each with one
   * value per column, in the order of `columns`. A `null`, a value that is not a finite
   * number, or one past the end of a shorter row is an EMPTY cell — no data, drawn hatched
   * and outlined rather than as the lowest step.
   */
  readonly data = input<WrHeatmapMatrix>([]);

  /**
   * The rows' names, top to bottom, beside the matrix at inline start. The matrix is as
   * tall as the longer of this list and `data`; a row with no name here is named by its
   * position, from 1. A name wider than `--wr-heatmap-chart-row-label-max-width` (10rem)
   * is cut with an ellipsis, and the tooltip and the data table carry it whole.
   */
  readonly rows = input<readonly string[]>([]);

  /**
   * The columns' names, from inline start, above the matrix. The matrix is as wide as the
   * longer of this list and the longest row of `data`; a column with no name here is named
   * by its position, from 1. Where the names are wider than their columns, the chart draws
   * every second, third or later one and leaves the rest out of sight, still read by a
   * screen reader; the tooltip and the data table name every column. A single column too
   * narrow for its name cuts it with an ellipsis.
   */
  readonly columns = input<readonly string[]>([]);

  /**
   * The colour of the highest step: any CSS colour, `var(--wr-…)` included. Every lower
   * step is mixed from it toward the surface, the lowest a faint tint.
   * @default 'var(--wr-color-primary)'
   */
  readonly color = input<string>('var(--wr-color-primary)');

  /**
   * The value of the lowest step. `null` takes the lowest value in `data`; a value given
   * holds the scale there, and a cell below it takes the lowest step. @default null
   */
  readonly min = input<number | null, unknown>(null, { transform: boundOf });

  /**
   * The value of the highest step. `null` takes the highest value in `data`; a value given
   * holds the scale there, and a cell above it takes the highest step. Bounds given in the
   * wrong order are swapped. A scale with no span — every value the same, or `min` equal
   * to `max` — has one step, the lowest: every value is drawn on it, an all-zero matrix
   * as a faint tint rather than as the peak, and the legend keys that one step.
   * @default null
   */
  readonly max = input<number | null, unknown>(null, { transform: boundOf });

  /**
   * How many steps the scale is cut into, each an equal share of it from `min` to `max`:
   * whole numbers from 2 to 10. Fewer steps are easier to tell apart; the value text and
   * the data table carry what the steps round. @default 5
   */
  readonly steps = input(5, {
    transform: (v: unknown): number => {
      const value = Math.round(coerceNumberProperty(v, 5));
      return Number.isFinite(value) ? clamp(value, 2, 10) : 5;
    },
  });

  /**
   * Print each value in its cell, compact from a thousand (`1.2K`). A value is printed
   * whole or not at all: one wider than its cell is left out rather than cut, and the
   * tooltip and the data table still carry it. Black or white, whichever reads better on
   * the cell — picked with CSS relative colour syntax; a browser without it (Firefox
   * before 128) prints the value on a small chip of the surface in the chart's text
   * colour instead, which reads on every step. An empty cell prints nothing.
   * @default false
   */
  readonly showValues = input(false, { transform: coerceBooleanProperty });

  /** Show the colour-scale legend under the matrix, from `min` to `max`, with a key for an empty cell while there is one. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /**
   * Show a tooltip for the cell under the pointer: its row's name, its column's name and
   * its value, or `noDataLabel` for an empty cell. Pointer only — the data table is where
   * the same numbers are for a keyboard or a screen reader. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every number the chart shows: the values in the cells, the legend, the tooltip
   * and the data table. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, compact in the
   * cells from a thousand up.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /**
   * Render the chart's figures as a table that only assistive technology reaches: a row
   * per row, headed by its name, and a column per column, every value written the way the
   * tooltip writes it, and an empty cell as `noDataLabel`.
   *
   * The cells are one named `role="img"`, which hides everything inside it, so without the
   * table the numbers are nowhere a screen reader can walk. It is rendered beside the
   * matrix, clipped to nothing: it takes no room, draws nothing and holds no tab stop.
   * @default false
   */
  readonly dataTable = input(false, { transform: coerceBooleanProperty });

  /**
   * Accessible name of the matrix. Its cells carry no text a screen reader reaches, so this
   * is where to say what the chart shows — or turn on `dataTable`. Falls back to
   * `heatmapChart.label`, which is also the data table's caption.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * What an empty cell is called, in the tooltip, the legend's key and the data table —
   * "Closed", "Not measured". Falls back to `heatmapChart.noData`.
   */
  readonly noDataLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'heatmapChart.label', 'Heatmap chart');

  protected readonly resolvedNoDataLabel = useI18nText(this.noDataLabel, 'heatmapChart.noData', 'No data');

  /** The cells' compact text and the exact figures, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  /** A row or column with no name is named by its position, written in `LOCALE_ID`. */
  private readonly positions = new Intl.NumberFormat(inject(LOCALE_ID));

  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  private readonly columnStrip = viewChild<ElementRef<HTMLElement>>('columnStrip');

  /** The column names' strip's width, as last observed: what measures the names again on a resize. */
  private readonly stripWidth = signal(0);

  /**
   * Which column names are drawn. Every one until the browser has measured them, so the
   * server and the first paint carry every name, cut where it does not fit.
   */
  protected readonly thinning = signal<Thinning>(ALL_NAMES, {
    equal: (a, b) => a.every === b.every && a.last === b.last,
  });

  /** How many rows and columns the matrix has: the longer of the names and the data, each way. */
  protected readonly shape = computed(() => {
    const data = this.data();
    let columnCount = this.columns().length;
    for (const row of data) columnCount = Math.max(columnCount, row?.length ?? 0);
    return { rowCount: Math.max(this.rows().length, data.length), columnCount };
  });

  /** Every row's name, its position for a row the names do not reach. */
  protected readonly rowLabels = computed(() => {
    const names = this.rows();
    return Array.from({ length: this.shape().rowCount }, (_, r) => names[r] ?? this.positions.format(r + 1));
  });

  /** Every column's name, its position for a column the names do not reach. */
  protected readonly columnLabels = computed(() => {
    const names = this.columns();
    return Array.from({ length: this.shape().columnCount }, (_, c) => names[c] ?? this.positions.format(c + 1));
  });

  /** Every cell's value, row by row, `null` where it is empty. */
  private readonly values = computed(() => {
    const data = this.data();
    const { rowCount, columnCount } = this.shape();
    return Array.from({ length: rowCount }, (_, r) =>
      Array.from({ length: columnCount }, (__, c) => valueOf(data[r]?.[c]))
    );
  });

  /**
   * The scale: `min` and `max` where given, the data's own lowest and highest value where
   * not, in order. `null` while there is nothing to scale — no value, and a bound missing.
   */
  protected readonly scale = computed<Scale | null>(() => {
    let lo = this.min();
    let hi = this.max();
    if (lo === null || hi === null) {
      const values = this.values()
        .flat()
        .filter((v): v is number => v !== null);
      if (values.length > 0) {
        lo ??= Math.min(...values);
        hi ??= Math.max(...values);
      }
    }
    if (lo === null || hi === null) return null;
    return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
  });

  /**
   * Every cell, row by row: its value, its step, and the text it prints. The step is the
   * value's band — the scale cut into `steps` equal shares — as a place from 0 to 1; a
   * scale with no span has one step, the lowest, and puts every value on it.
   */
  protected readonly cells = computed<readonly Cell[]>(() => {
    const scale = this.scale();
    const steps = this.steps();
    const print = this.showValues();
    return this.values().flatMap((row, r) =>
      row.map((value, c): Cell => {
        if (value === null || scale === null) return { row: r, column: c, value, level: null, text: '' };
        const span = scale.max - scale.min;
        // The epsilon keeps a value ON a band's edge in the band above it: 0.3 × 10 is
        // 2.9999999999999996 in floating point.
        const band = span === 0 ? 0 : Math.floor(clamp((value - scale.min) / span, 0, 1) * steps + 1e-9);
        return {
          row: r,
          column: c,
          value,
          level: short(Math.min(band, steps - 1) / (steps - 1)),
          text: print ? this.numbers.label(value) : '',
        };
      })
    );
  });

  /** Whether any cell is empty, which is when the legend keys the hatching. */
  protected readonly hasEmpty = computed(() => this.cells().some(cell => cell.value === null));

  /**
   * The legend's scale: its two ends, compact from a thousand as the cells print a value,
   * and one swatch per step, each at its place on the scale. A scale with no span has one
   * step, so one swatch and one label, and `max` is `null`. `null` with nothing to scale,
   * when the legend keys an empty cell alone.
   */
  protected readonly legend = computed(() => {
    const scale = this.scale();
    if (scale === null) return null;
    if (scale.min === scale.max) return { min: this.numbers.label(scale.min), max: null, levels: [0] };
    const steps = this.steps();
    return {
      min: this.numbers.label(scale.min),
      max: this.numbers.label(scale.max),
      levels: Array.from({ length: steps }, (_, k) => short(k / (steps - 1))),
    };
  });

  /**
   * The figures for `dataTable`: the matrix's name as the caption, a column per column and
   * a row per row, every value written as the tooltip writes it and an empty cell as
   * `noDataLabel`.
   */
  protected readonly tableData = computed<WrChartTableData>(() => {
    const empty = this.resolvedNoDataLabel();
    return {
      caption: this.resolvedAriaLabel(),
      columns: this.columnLabels(),
      groups: [
        {
          rows: this.values().map((row, r) => ({
            header: this.rowLabels()[r],
            cells: row.map(value => (value === null ? empty : this.numbers.value(value))),
          })),
        },
      ],
    };
  });

  /**
   * One tooltip for the whole matrix, pointing at the cell under the pointer: the row's
   * name as its heading, and a line with the column's name and the value — the order a
   * table is read in. A listener on the matrix rather than one per cell.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const cell = this.cells()[index];
    // The cells are the container's only children, drawn in `cells()` order.
    const anchor = cell ? this.grid()?.nativeElement.children.item(index) : null;
    if (!cell || !anchor) return null;
    return {
      datum: {
        label: this.rowLabels()[cell.row],
        value: '',
        rows: [
          {
            label: this.columnLabels()[cell.column],
            value: cell.value === null ? this.resolvedNoDataLabel() : this.numbers.value(cell.value),
          },
        ],
      },
      anchor,
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    // The names are measured after render, in a browser: again when they change, and when
    // the observer below reports a new width. Never on the server, which keeps every name
    // — said here as well as by the render hooks, which a server-platform test still runs.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterRenderEffect(() => {
      this.stripWidth();
      this.columnLabels();
      this.thinning.set(this.measureColumnNames());
    });

    // The strip's width is what decides how many names fit. A hidden chart reports 0 and
    // draws every name, and showing it again is a change of width, so it is measured afresh
    // even where its width is the one it was hidden at.
    afterNextRender(() => {
      const strip = this.columnStrip()?.nativeElement;
      if (!strip || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => this.stripWidth.set(entry.contentRect.width));
      observer.observe(strip);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Which column names fit: every name while each fits its own column, else every n-th,
   * the smallest n whose room holds the widest name and half an em beside it.
   *
   * A name is shrunk to its text by the stylesheet, so its `scrollWidth` is the whole text,
   * cut or not. The columns' pitch is read off the first two cells, which the grid sizes
   * whatever the names say. The last name drawn has only the columns left to the end,
   * which can be fewer than n: one that does not fit them is left out rather than spill
   * past the chart or be cut. Anything unmeasurable — one column, no cells, no layout —
   * draws every name.
   */
  private measureColumnNames(): Thinning {
    const strip = this.columnStrip()?.nativeElement;
    const cells = this.grid()?.nativeElement.children;
    const count = this.shape().columnCount;
    if (!strip || !cells || count < 2 || cells.length < 2) return ALL_NAMES;
    const first = cells[0].getBoundingClientRect();
    const pitch = Math.abs(cells[1].getBoundingClientRect().left - first.left);
    if (!(pitch > 0)) return ALL_NAMES;
    const gap = Math.max(0, pitch - first.width);
    const widths = Array.from(strip.children, name => name.scrollWidth);
    const space = Math.max(gap, (Number.parseFloat(getComputedStyle(strip).fontSize) || 0) / 2);
    const every = Math.max(1, Math.ceil((Math.max(0, ...widths) + space) / pitch));
    if (every === 1) return ALL_NAMES;
    let last = Math.floor((count - 1) / every) * every;
    if ((widths[last] ?? 0) > (count - last) * pitch - gap) last -= every;
    return { every, last };
  }

  /**
   * The cell under the pointer, heard on the matrix. A MOUSE event, as every chart's is: a
   * tap fires the compatibility `mousemove` and no `pointermove`. Over the gap between two
   * cells it is on none, and the tooltip starts to leave.
   */
  protected onPointerMove(event: MouseEvent): void {
    if (!this.tooltip()) return;
    const cell = (event.target as Element | null)?.closest?.<HTMLElement>('.wr-heatmap-chart__cell');
    const row = Number(cell?.dataset['row']);
    const column = Number(cell?.dataset['column']);
    if (!cell || !Number.isInteger(row) || !Number.isInteger(column)) this.tip.leave(event);
    else this.tip.enter(row * this.shape().columnCount + column);
  }
}

export type { WrHeatmapMatrix } from './types';
