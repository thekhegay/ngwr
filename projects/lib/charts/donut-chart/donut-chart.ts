/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, type ElementRef, ViewEncapsulation, computed, input, model, viewChild } from '@angular/core';

import { WR_CHART_LEGEND_BLOCK, WrChartLegend, type WrChartLegendItem } from 'ngwr/charts/chart-legend';
import { chartColor, useChartNumbers } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';

import type { WrDonutSegment } from './types';

/**
 * A segment's contribution to the ring. `Math.max(0, NaN)` is NaN, and the running total
 * carries it forward — so one non-finite datum used to take out its own arc AND every arc
 * after it, writing the literal text `NaN` into the path `d`.
 */
function weight(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Donut chart. Set `thickness` to 0 for a solid pie. Optional center
 * text via inputs.
 *
 * @example
 * ```html
 * <wr-donut-chart [segments]="[
 *   { label: 'Used', value: 60 },
 *   { label: 'Free', value: 40 }
 * ]" centerLabel="Disk" centerValue="60%" />
 * ```
 *
 * The legend is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), and with
 * `toggleableLegend` its rows show and hide their slices through `hiddenSegments`.
 *
 * @see https://ngwr.dev/charts/donut-chart
 */
@Component({
  selector: 'wr-donut-chart',
  templateUrl: './donut-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-donut-chart' },
  imports: [WrChartLegend],
  // The legend's rows keep the classes this chart drew before it drew them through
  // `WrChartLegend`: `.wr-donut-chart__legend-item`, `__swatch`, `__legend-label` and
  // `__legend-value`.
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-donut-chart' }],
})
export class WrDonutChart {
  /**
   * The slices, drawn clockwise from twelve o'clock. A segment with no `color`
   * takes the next entry from the chart's fallback palette.
   */
  readonly segments = input<readonly WrDonutSegment[]>([]);

  /**
   * Accessible name of the drawing. The arcs carry no text and the legend is optional, so
   * with `showLegend: false` this and the centre text are the whole of what a screen reader
   * gets. Falls back to `donutChart.label`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'donutChart.label', 'Donut chart');

  /** Diameter in CSS pixels. @default 200 */
  readonly size = input(200, { transform: (v: unknown): number => Math.max(48, coerceNumberProperty(v, 200)) });

  /** Inner-ring thickness as a percent of radius (0–100). `0` = solid pie. @default 30 */
  readonly thickness = input(30, {
    transform: (v: unknown): number => Math.min(100, Math.max(0, coerceNumberProperty(v, 30))),
  });

  /** Show the legend under the chart. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /**
   * Make each legend row a toggle button that shows and hides its slice, through
   * `hiddenSegments`. A row is a `<button aria-pressed>`, pressed while its slice is
   * shown, so the legend becomes one tab stop per slice. @default false
   */
  readonly toggleableLegend = input(false, { transform: coerceBooleanProperty });

  /**
   * The positions in `segments` of the slices that are hidden. Positions rather than
   * labels, since two slices may share a label. A toggleable legend writes it, and a
   * host may bind it with or without one: `[(hiddenSegments)]`.
   *
   * A hidden slice is left out of the ring, and the slices still shown RE-NORMALISE:
   * they share the whole ring between them, each at its share of their own total. A
   * donut reads as the parts of the whole it draws, so leaving the hidden slice's arc
   * as a gap would show a whole that no longer adds up, and turning a slice off is how
   * a reader asks "of the rest, how much is each?". The tooltip cannot open on a slice
   * that is not drawn. The legend keeps the hidden slice's row, struck through and with
   * its own value, so it can be shown again; the row says "hidden" to a screen reader as
   * well, through `aria-pressed` on a toggle and a visually hidden word otherwise. The
   * centre text is printed as given, so a host that writes a total there works it out
   * from this list. A position past the end of `segments` is kept and ignored.
   */
  readonly hiddenSegments = model<readonly number[]>([]);

  /** Bold value text in the center. */
  readonly centerValue = input<string>('');

  /** Smaller label under the value. */
  readonly centerLabel = input<string>('');

  /**
   * Show a tooltip with the slice's label and value on hover. Pointer only — the
   * legend prints the same numbers, and with `showLegend` off `ariaLabel` is where
   * to say them. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /**
   * Writes every value in the legend and the tooltip. `null` uses `Intl.NumberFormat`
   * in `LOCALE_ID`. The centre text is printed as given.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** Each value as the legend and the tooltip print it: exact, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly hidden = computed(() => new Set(this.hiddenSegments()));

  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('svg');

  // Drawn in a 100×100 viewBox.
  private readonly outerR = 50;

  protected readonly innerR = computed(() => {
    const thickness = this.thickness();
    // 0 = solid pie: fill all the way to the center, not a zero-width ring.
    if (thickness === 0) return 0;
    return this.outerR * (1 - thickness / 100);
  });

  /** The sum the ring is divided by: the slices still shown (see `hiddenSegments`). */
  protected readonly total = computed(() => {
    const hidden = this.hidden();
    const sum = this.segments().reduce((acc, s, i) => acc + (hidden.has(i) ? 0 : weight(s.value)), 0);
    return sum > 0 ? sum : 1;
  });

  /**
   * Resolved slices ready for the template — each carries its arc path.
   *
   * Angles are in the drawing's own frame, where 0 is three o'clock and a positive
   * angle turns clockwise, because y runs downwards. The ring starts a quarter turn
   * back from there, at twelve o'clock, which is where the input's JSDoc always said
   * it started and where a reader looks for the first slice; it used to start at three.
   */
  protected readonly slices = computed(() => {
    const total = this.total();
    const hidden = this.hidden();
    const origin = -Math.PI / 2;
    let cumulative = 0;
    return this.segments().map((s, i) => {
      const value = weight(s.value);
      const isHidden = hidden.has(i);
      // A hidden slice takes no turn of the ring, so the next slice starts where the last
      // shown one ended.
      const share = isHidden ? 0 : value;
      const startAngle = origin + (cumulative / total) * Math.PI * 2;
      cumulative += share;
      const endAngle = origin + (cumulative / total) * Math.PI * 2;
      return {
        label: s.label,
        value,
        text: this.numbers.value(value),
        color: s.color ?? chartColor(i),
        hidden: isHidden,
        path: isHidden ? '' : this.arcPath(startAngle, endAngle),
        percent: (share / total) * 100,
        midAngle: (startAngle + endAngle) / 2,
      };
    });
  });

  /** The legend's rows: every slice, hidden ones included, each with its value. */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.slices().map(({ label, color, text }) => ({ label, color, value: text }))
  );

  /**
   * One tooltip for the whole chart, pointing at the hovered slice: at the middle of
   * its OUTER arc, on the side that part of the ring faces — above for a slice whose
   * middle is in the top quarter, below for the bottom one, beside it for the two at
   * three and nine o'clock. From there the chip sits clear of the ring, and the way
   * onto it runs straight out of the slice that opened it, over nothing else.
   *
   * Not the slice's `<path>` element: its box is most of the ring for any slice past
   * a quarter, so the chip would point at the middle of the chart. And not the middle
   * of the band: a chip there lies over the ring, under a pointer resting on it —
   * measured in Chromium, the inner half of a lower slice landed on its own chip. A
   * tiny slice keeps its own mid-angle, so the arrow says which sliver it is.
   */
  protected readonly tip = useChartTooltip(this.tooltip, index => {
    const slice = this.slices()[index];
    const svg = this.svg()?.nativeElement;
    if (!slice?.path || !svg) return null;
    const box = svg.getBoundingClientRect();
    // The drawing's y runs downwards, so a positive sine is the lower half.
    const cos = Math.cos(slice.midAngle);
    const sin = Math.sin(slice.midAngle);
    const side = Math.abs(cos) > Math.abs(sin) ? (cos > 0 ? 'right' : 'left') : sin > 0 ? 'bottom' : 'top';
    return {
      datum: { label: slice.label, value: slice.text, color: slice.color },
      anchor: {
        x: box.left + ((50 + this.outerR * cos) / 100) * box.width,
        y: box.top + ((50 + this.outerR * sin) / 100) * box.height,
      },
      side,
    };
  });

  // Helpers

  /** SVG path for one donut slice using outer and inner arcs. */
  private arcPath(start: number, end: number): string {
    const cx = 50;
    const cy = 50;
    const ro = this.outerR;
    const ri = this.innerR();
    const sweep = end - start;
    if (sweep <= 0) return '';
    // Full-circle slice — two halves so the arc can render.
    if (sweep >= Math.PI * 2 - 1e-6) {
      const path = [
        `M ${cx + ro} ${cy}`,
        `A ${ro} ${ro} 0 1 1 ${cx - ro} ${cy}`,
        `A ${ro} ${ro} 0 1 1 ${cx + ro} ${cy}`,
      ];
      if (ri > 0) {
        path.push(`M ${cx + ri} ${cy}`, `A ${ri} ${ri} 0 1 0 ${cx - ri} ${cy}`, `A ${ri} ${ri} 0 1 0 ${cx + ri} ${cy}`);
      }
      return path.join(' ');
    }
    const largeArc = sweep > Math.PI ? 1 : 0;
    const sox = cx + ro * Math.cos(start);
    const soy = cy + ro * Math.sin(start);
    const eox = cx + ro * Math.cos(end);
    const eoy = cy + ro * Math.sin(end);
    if (ri === 0) {
      return `M ${cx} ${cy} L ${sox.toFixed(2)} ${soy.toFixed(2)} A ${ro} ${ro} 0 ${largeArc} 1 ${eox.toFixed(2)} ${eoy.toFixed(2)} Z`;
    }
    const eix = cx + ri * Math.cos(end);
    const eiy = cy + ri * Math.sin(end);
    const six = cx + ri * Math.cos(start);
    const siy = cy + ri * Math.sin(start);
    return [
      `M ${sox.toFixed(2)} ${soy.toFixed(2)}`,
      `A ${ro} ${ro} 0 ${largeArc} 1 ${eox.toFixed(2)} ${eoy.toFixed(2)}`,
      `L ${eix.toFixed(2)} ${eiy.toFixed(2)}`,
      `A ${ri} ${ri} 0 ${largeArc} 0 ${six.toFixed(2)} ${siy.toFixed(2)}`,
      'Z',
    ].join(' ');
  }
}

export type { WrDonutSegment } from './types';
