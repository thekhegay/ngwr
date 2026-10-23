/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, input, model, output, signal } from '@angular/core';

import { chartMarkerPath } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';

import { WrChartLegendPart } from './internal/chart-legend-part';
import { WR_CHART_LEGEND_BLOCK } from './tokens';
import type { WrChartLegendItem, WrChartLegendToggle, WrChartMarker } from './types';

const NO_OVERRIDE = signal<string | null>(null).asReadonly();

/**
 * A chart's key: one row per series, each a swatch, a name and an optional value.
 * It stands on its own for a key that several charts share — one legend above a row
 * of sparklines — and the line, donut, meter group, scatter and radar charts draw
 * their own legends with it.
 *
 * It sits on a `<ul>` the way `button[wr-btn]` sits on a `<button>`, and renders the
 * `<li>`s, so the list is the consumer's element: its class, its placement, its
 * name. The swatch follows what tells the series apart in the chart: a dot, a line
 * in the series' `dash`, or the series' `marker`. A dot is a span painted with an
 * inline background, a line or a marker is an SVG, and every key is `aria-hidden`:
 * the row's text is its name.
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
    '[attr.aria-label]': 'label()',
  },
  imports: [NgTemplateOutlet, WrChartLegendPart],
})
export class WrChartLegend {
  /** One row per series, in the chart's order. */
  readonly items = input<readonly WrChartLegendItem[]>([]);

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
   * state, and a toggle row's `aria-pressed` is the other half there. Catalog-only
   * rather than an input, as `stepper.completed` is: one word shared by every row,
   * which an app rewords once in its catalog.
   */
  protected readonly hiddenText = useI18nText(NO_OVERRIDE, 'chartLegend.hidden', 'hidden');

  protected readonly label = computed(() => (this.ariaLabel() || this.toggleable() ? this.toggleLabel() : null));

  private readonly block = inject(WR_CHART_LEGEND_BLOCK, { optional: true, host: true });

  private readonly hidden = computed(() => new Set(this.hiddenSeries()));

  /** Whether the series at `index` is hidden. */
  protected isHidden(index: number): boolean {
    return this.hidden().has(index);
  }

  /** The host chart's own class for one part of a row, or nothing outside a chart. */
  protected part(name: 'legend-item' | 'swatch' | 'legend-label' | 'legend-value'): string {
    return this.block ? `${this.block}__${name}` : '';
  }

  /** A marker's path, as large as a circle of radius `r` in the swatch's own units. */
  protected markerPath(shape: WrChartMarker, r: number): string {
    return chartMarkerPath(shape, r);
  }

  /** Shows or hides the series at `index`, then says so. */
  protected toggle(index: number): void {
    const current = this.hiddenSeries();
    const hide = !current.includes(index);
    this.hiddenSeries.set(hide ? [...current, index].sort((a, b) => a - b) : current.filter(i => i !== index));
    this.toggled.emit({ index, label: this.items()[index]?.label ?? '', hidden: hide });
  }
}

export type { WrChartLegendItem, WrChartLegendToggle, WrChartMarker } from './types';
