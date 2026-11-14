/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, input, model, output } from '@angular/core';

import { wrChartMarkerPath } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { wrCheckStyles } from 'ngwr/utils';

import { WrChartLegendPart } from './internal/chart-legend-part';
import { WR_CHART_LEGEND_BLOCK } from './tokens';
import type { WrChartLegendItem, WrChartLegendPosition, WrChartLegendToggle, WrChartMarker } from './types';

/** The radius of a marker drawn as the whole key, in the swatch's own units: a 12-unit box. */
const MARKER_RADIUS = 5;

/** The radius of a marker drawn on the middle of a line key, whose box is 16 by 2. */
const LINE_MARKER_RADIUS = 3.5;

/** Which of the three keys a row draws. */
type Key = 'line' | 'marker' | 'dot';

/**
 * One row as the template draws it: everything it binds, worked out once per change of
 * `items`. The template reads nothing off the item itself.
 */
interface Row {
  readonly label: string;
  readonly color: string;
  readonly key: Key;
  /** The dash of a line key, `null` for a solid line or another key. */
  readonly dash: string | null;
  readonly marker: WrChartMarker | null;
  /** The marker's path at the size its key draws it, `null` with no marker. */
  readonly path: string | null;
  /** The value printed after the label, `null` for none. */
  readonly value: string | null;
}

/**
 * A chart's key: one row per series, each a swatch, a name and an optional value.
 * It stands on its own for a key that several charts share — one legend above a row
 * of sparklines — and the bar, line, donut, meter group, scatter and radar charts
 * draw their own legends with it.
 *
 * It sits on a `<ul>` the way `button[wr-btn]` sits on a `<button>`, and renders the
 * `<li>`s, so the list is the consumer's element: its class, its placement, its
 * name. The swatch follows what tells the series apart in the chart: a dot, a line
 * in the series' `dash`, or the series' `marker`. A dot is a span painted with an
 * inline background, a line or a marker is an SVG, and every key is `aria-hidden`:
 * the row's text is its name.
 *
 * **`position` says where the legend sits beside its chart**: `top`, `bottom`, `start`
 * or `end`, or `none` to draw nothing. Above and below it is a wrapping row; at inline
 * start or end it is a column. A chart that draws its own legend forwards its
 * `legendPosition` here and places the list; a legend that stands alone is placed by
 * the app, and `position` only picks the row or the column.
 *
 * **Hovering a row dims the rest of its chart.** Every row carries `data-wr-series`
 * with its position, the attribute a chart puts on that series' marks, so the chart's
 * hover fades every other series while the pointer is on a row.
 *
 * **Toggling is opt-in.** With `toggleable`, every row is a
 * `<button type="button" aria-pressed>` that shows and hides its series: pressed
 * means shown, and `hiddenSeries` holds the positions of the hidden ones. The rows
 * stay in the tab order, one stop each, rather than becoming one toolbar stop with
 * arrow keys: the toolbar pattern needs `role="toolbar"`, which would take the
 * `<ul>`'s list role and with it the "list, 5 items" a reader hears, while each row
 * is an independent toggle — the Button pattern, Tab plus Space or Enter — and a
 * chart's series rarely outnumber the five colours it cycles through. A legend
 * draws nothing hidden by itself: the chart reads `hiddenSeries`.
 *
 * **A hidden row says so in both modes.** On a toggle it is `aria-pressed="false"`;
 * on a legend that does not toggle, where a host has hidden the series from
 * elsewhere, the row carries a visually hidden word after its name
 * (`chartLegend.hidden`, "hidden"), since the strike-through and the faded key reach
 * no one who cannot see them.
 *
 * @example
 * ```html
 * <ul
 *   wr-chart-legend
 *   [items]="[
 *     { label: 'Visits', color: 'var(--wr-color-primary)', value: '1,204' },
 *     { label: 'Signups', color: 'var(--wr-color-success)', value: '86' }
 *   ]"
 * ></ul>
 *
 * <ul wr-chart-legend toggleable [items]="series" [(hiddenSeries)]="hidden"></ul>
 * ```
 *
 * @see https://ngwr.dev/charts/chart-legend
 */
@Component({
  selector: 'ul[wr-chart-legend]',
  templateUrl: './chart-legend.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-chart-legend',
    // Written out because `list-style: none` (styles/_index.scss) drops the implicit
    // list semantics in Safari, and with them the list's `aria-label`.
    role: 'list',
    '[class.wr-chart-legend--toggleable]': 'toggleable()',
    '[class.wr-chart-legend--top]': "position() === 'top'",
    '[class.wr-chart-legend--bottom]': "position() === 'bottom'",
    '[class.wr-chart-legend--start]': "position() === 'start'",
    '[class.wr-chart-legend--end]': "position() === 'end'",
    '[class.wr-chart-legend--none]': "position() === 'none'",
    '[attr.aria-label]': 'label()',
  },
  imports: [NgTemplateOutlet, WrChartLegendPart],
})
export class WrChartLegend {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/chart-legend');
  }

  /** One row per series, in the chart's order. */
  readonly items = input<readonly WrChartLegendItem[]>([]);

  /**
   * Where the legend sits beside its chart. `top` and `bottom` lay the rows out in a
   * wrapping line, `start` and `end` in a column, and `none` draws nothing - the
   * list stays in the DOM, hidden, so `hiddenSeries` keeps working from outside.
   * @default 'bottom'
   */
  readonly position = input<WrChartLegendPosition>('bottom');

  /**
   * Make each row a toggle button that shows and hides its series, through
   * `hiddenSeries` and `toggled`. @default false
   */
  readonly toggleable = input(false, { transform: coerceBooleanProperty });

  /**
   * The positions in `items` of the series that are hidden, ascending. Positions
   * rather than labels: two series may share a label, and a label translated into
   * another language would no longer match the one it hid. A position past the end
   * of `items` is kept and ignored, so a series coming back finds its state.
   *
   * Written by a click on a `toggleable` row; read in either mode, so a legend that
   * does not toggle still shows a series hidden from elsewhere as hidden.
   */
  readonly hiddenSeries = model<readonly number[]>([]);

  /**
   * Accessible name of the list. A `toggleable` legend falls back to
   * `chartLegend.toggleLabel` ("Toggle series visibility"), which tells a reader
   * what its buttons do; one that does not toggle has no name unless given one.
   */
  readonly ariaLabel = input<string | null>(null);

  /** Emits when a reader shows or hides a series from a `toggleable` legend, after `hiddenSeries` moves. */
  readonly toggled = output<WrChartLegendToggle>();

  private readonly toggleLabel = useI18nText(this.ariaLabel, 'chartLegend.toggleLabel', 'Toggle series visibility');

  /**
   * The word a hidden row of a legend that does not toggle carries after its name,
   * visually hidden: the strike-through and the faded key are the eye's half of the
   * state, and a toggle row's `aria-pressed` is the other half there. Falls back to
   * `chartLegend.hidden`, then `'hidden'`.
   */
  readonly hiddenLabel = input<string | null>(null);

  protected readonly resolvedHiddenLabel = useI18nText(this.hiddenLabel, 'chartLegend.hidden', 'hidden');

  protected readonly label = computed(() => (this.ariaLabel() || this.toggleable() ? this.toggleLabel() : null));

  private readonly block = inject(WR_CHART_LEGEND_BLOCK, { optional: true, host: true });

  private readonly hidden = computed(() => new Set(this.hiddenSeries()));

  /** Whether the series at `index` is hidden. */
  protected isHidden(index: number): boolean {
    return this.hidden().has(index);
  }

  /**
   * The host chart's own class for each part of a row, or nothing outside a chart. Fixed
   * for the legend's life, so they are written once: asked for in the template, each was
   * built again for every part of every row on every pass over the chart, which a chart
   * makes whenever its own view is checked.
   */
  protected readonly parts = {
    item: this.block ? `${this.block}__legend-item` : '',
    swatch: this.block ? `${this.block}__swatch` : '',
    label: this.block ? `${this.block}__legend-label` : '',
    value: this.block ? `${this.block}__legend-value` : '',
  };

  /**
   * The rows as drawn, one per item: which key each draws and its marker's path, built
   * when `items` changes rather than on every pass. A path is a string of a dozen
   * numbers, and fifty series built fifty of them for every hover of their chart.
   */
  protected readonly rows = computed<readonly Row[]>(() =>
    this.items().map(item => {
      const marker = item.marker ?? null;
      const key: Key = item.dash !== undefined ? 'line' : marker ? 'marker' : 'dot';
      return {
        label: item.label,
        color: item.color,
        key,
        // `''` is a solid line: no dash to write.
        dash: item.dash === undefined || item.dash === '' ? null : item.dash,
        marker,
        path: marker ? wrChartMarkerPath(marker, key === 'line' ? LINE_MARKER_RADIUS : MARKER_RADIUS) : null,
        value: item.value ?? null,
      };
    })
  );

  /** Shows or hides the series at `index`, then says so. */
  protected toggle(index: number): void {
    const current = this.hiddenSeries();
    const hide = !current.includes(index);
    this.hiddenSeries.set(hide ? [...current, index].sort((a, b) => a - b) : current.filter(i => i !== index));
    this.toggled.emit({ index, label: this.items()[index]?.label ?? '', hidden: hide });
  }
}

export type { WrChartLegendItem, WrChartLegendPosition, WrChartLegendToggle, WrChartMarker } from './types';
