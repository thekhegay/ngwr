/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import { Component, type ElementRef, ViewEncapsulation, computed, input, model, viewChild } from '@angular/core';

import {
  WR_CHART_LEGEND_BLOCK,
  WrChartLegend,
  type WrChartLegendItem,
  type WrChartLegendPosition,
} from 'ngwr/charts/chart-legend';
import { WrChartState, useChartHover, useChartNumbers, useChartState, wrChartColor } from 'ngwr/charts/core';
import { useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { wrCheckStyles } from 'ngwr/utils';

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
 * How wide a slice's hover target is at least, along the outer edge, in CSS px. A
 * slice narrower than that — a share of a percent or two, which at the default 200px
 * is a few px of arc — is a target no pointer lands on, so it gets a wider one; see
 * `hits`.
 */
const HIT_PX = 12;

/**
 * The widest that target may grow, in radians, whatever the chart's size: on a 48px
 * chart 12px of arc is a third of a quarter turn, which would take too much of the
 * slices beside it.
 */
const MAX_HIT_ANGLE = Math.PI / 12;

/**
 * Donut chart, and with `pie` a pie chart. Optional center text via inputs.
 *
 * @example
 * ```html
 * <wr-donut-chart [segments]="[
 *   { label: 'Used', value: 60 },
 *   { label: 'Free', value: 40 }
 * ]" centerLabel="Disk" centerValue="60%" />
 *
 * <wr-donut-chart [segments]="segments" pie />
 * ```
 *
 * **The look is the chart theme's.** A slice with no `color` takes the next colour of
 * the shared palette (`--wr-chart-1` to `--wr-chart-8`), and every two slices are parted
 * by a line in `--wr-chart-separator`, 1px at any `size`. Hovering a slice or a legend
 * row dims the others.
 *
 * **The legend** is a `ul[wr-chart-legend]` (`ngwr/charts/chart-legend`), placed by
 * `legendPosition` and left out for a single slice unless `showLegend` asks for it. With
 * `toggleableLegend` its rows show and hide their slices through `hiddenSegments`.
 *
 * **Empty, loading, error.** With nothing to draw the chart keeps its ring as a track
 * and says "No data"; `loading` and `error` put their own message there in place of the
 * slices.
 *
 * @see https://ngwr.dev/charts/donut-chart
 */
@Component({
  selector: 'wr-donut-chart',
  templateUrl: './donut-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    // `wr-chart--legend`: the shared rule that keeps the legend's room from the drawing.
    class: 'wr-donut-chart wr-chart--legend',
    '[class.wr-donut-chart--pie]': 'pie()',
    '[class.wr-chart--legend-side]': 'legendShown() && legendSide()',
  },
  imports: [NgTemplateOutlet, WrChartLegend, WrChartState],
  // The legend's rows keep the classes this chart drew before it drew them through
  // `WrChartLegend`: `.wr-donut-chart__legend-item`, `__swatch`, `__legend-label` and
  // `__legend-value`.
  viewProviders: [{ provide: WR_CHART_LEGEND_BLOCK, useValue: 'wr-donut-chart' }],
})
export class WrDonutChart {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('charts/donut-chart');
    // One listener pair for the whole chart: a slice and a sliver's wider target each
    // carry `data-wr-index`, and `data-wr-series` for the dim.
    useChartHover({ enter: index => this.tip.enter(index), leave: event => this.tip.leave(event) });
  }

  /**
   * The slices, drawn clockwise from twelve o'clock. A segment with no `color`
   * takes the next colour of the chart palette, `--wr-chart-1` to `--wr-chart-8`.
   */
  readonly segments = input<readonly WrDonutSegment[]>([]);

  /**
   * Accessible name of the drawing. The arcs carry no text and the legend is optional, so
   * with `showLegend: false` this and the centre text are the whole of what a screen reader
   * gets. Falls back to `donutChart.label`, or to `donutChart.pieLabel` with `pie`.
   */
  readonly ariaLabel = input<string | null>(null);

  private readonly donutLabel = useI18nText(this.ariaLabel, 'donutChart.label', 'Donut chart');
  private readonly pieLabel = useI18nText(this.ariaLabel, 'donutChart.pieLabel', 'Pie chart');

  protected readonly resolvedAriaLabel = computed(() => (this.pie() ? this.pieLabel() : this.donutLabel()));

  /** Diameter in CSS pixels. @default 200 */
  readonly size = input(200, { transform: (v: unknown): number => Math.max(48, coerceNumberProperty(v, 200)) });

  /**
   * Inner-ring thickness as a percent of radius (0–100). `0` fills to the centre, and
   * keeps the centre text; `pie` ignores it. @default 30
   */
  readonly thickness = input(30, {
    transform: (v: unknown): number => Math.min(100, Math.max(0, coerceNumberProperty(v, 30))),
  });

  /**
   * Draw a pie chart: every slice fills to the centre, whatever `thickness` says, and
   * the host takes the `wr-donut-chart--pie` modifier. A pie has no hole to print in, so
   * `centerValue` and `centerLabel` are not rendered. Everything else is the donut's: the
   * slices run clockwise from twelve o'clock, with the same gap between them, the legend
   * and its toggle, and the tooltip — which in a pie also opens from a wider, invisible
   * target over a slice too thin to point at (see `tooltip`). The drawing's name falls
   * back to `donutChart.pieLabel`. @default false
   */
  readonly pie = input(false, { transform: coerceBooleanProperty });

  /**
   * Show the legend. `'auto'` shows it when there is something to tell apart - two
   * segments or more - and leaves it out for a single one; `true` shows it for one
   * segment too. @default 'auto'
   */
  readonly showLegend = input<boolean | 'auto', unknown>('auto', {
    transform: (value: unknown): boolean | 'auto' => (value === 'auto' ? 'auto' : coerceBooleanProperty(value)),
  });

  /**
   * Where the legend sits: `bottom` or `top` of the chart as a wrapping row, `start` or
   * `end` of it as a column, or `none` for no legend at all - `hiddenSegments` still
   * hides a slice from outside. @default 'bottom'
   */
  readonly legendPosition = input<WrChartLegendPosition>('bottom');

  /**
   * A request for the chart's data is in flight: the slices give way to the loading
   * message, over the ring drawn as a track. @default false
   */
  readonly loading = input(false, { transform: coerceBooleanProperty });

  /**
   * The chart's data failed to load: the slices give way to the error message. `loading`
   * wins while both are set. @default false
   */
  readonly error = input(false, { transform: coerceBooleanProperty });

  /** The message shown when there is nothing to draw. Falls back to `chart.empty`, then `'No data'`. */
  readonly emptyLabel = input<string | null>(null);

  /** The message shown while `loading`. Falls back to `chart.loading`, then `'Loading…'`. */
  readonly loadingLabel = input<string | null>(null);

  /** The message shown on `error`. Falls back to `chart.error`, then `'Could not load'`. */
  readonly errorLabel = input<string | null>(null);

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

  /** Bold value text in the center. Not rendered with `pie`, which has no hole to hold it. */
  readonly centerValue = input<string>('');

  /** Smaller label under the value. Not rendered with `pie`, which has no hole to hold it. */
  readonly centerLabel = input<string>('');

  /**
   * Whether the centre text renders: some is given, there is a hole to print it in, and
   * no state's message is there instead.
   */
  protected readonly showCenter = computed(
    () => !this.pie() && !this.state() && (!!this.centerValue() || !!this.centerLabel())
  );

  /**
   * Show a tooltip with the slice's label and value on hover. Pointer only — the
   * legend prints the same numbers, and with `showLegend` off `ariaLabel` is where
   * to say them. With `pie`, a slice too thin to land a pointer on, a sliver of a few
   * degrees, is hovered over a wider strip than it draws, through an invisible
   * `.wr-donut-chart__hit` over the pie: widened toward 12px of outer arc (15° on a chart
   * under about 92px) out of what the wider slices beside it can spare, each of which keeps
   * that much of its own. A sliver whose neighbours are slivers too, or have little to
   * spare, gets a narrower target or none, and is read in the legend. The ring draws no
   * such target. @default true
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
    // A pie, or a thickness of 0: fill all the way to the center, not a zero-width ring.
    if (this.pie() || thickness === 0) return 0;
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
        // The segment's own figure, which a negative one keeps although it draws nothing:
        // the weight is the arc's, not the data's, and printing it named a "0" the data
        // never had. A value that is not a number has no figure to print.
        text: Number.isFinite(s.value) ? this.numbers.value(s.value) : '',
        color: s.color ?? wrChartColor(i),
        hidden: isHidden,
        path: isHidden ? '' : this.arcPath(startAngle, endAngle),
        percent: (share / total) * 100,
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2,
      };
    });
  });

  /**
   * In a pie, a wider hover target for every slice too thin to land a pointer on: an
   * invisible wedge over the slice, drawn above the pie, widened toward `HIT_PX` of outer
   * arc (`MAX_HIT_ANGLE` at most, which binds below about 92px) out of the wider slices
   * beside it.
   *
   * A wider slice gives away only what it can spare: it keeps `HIT_PX` of outer arc of its
   * own (the same `MAX_HIT_ANGLE` cap), however many slivers reach into it, so a slice
   * that was easy to point at stays easy, and its middle, where its own chip points, is
   * never covered. Two slivers reaching into one slice from either side split what it
   * spares. A sliver asks half its shortfall of each wider neighbour, or all of it of the
   * only one; what one side cannot give, the other gives if it can. Between two slivers
   * side by side the boundary stays their shared edge, so of a run of slivers only the two
   * at its ends grow, and the legend is where the rest are read — as it is for a sliver
   * whose neighbours have little to spare, which gets the narrower target they leave it.
   * A slice that draws nothing — a zero, or a hidden slice — has nothing to point at and
   * gets no target, and nor does one with no wider neighbour.
   *
   * Pie only, and only while the tooltip is on, which is all it is for: the ring draws
   * exactly what it drew before `pie` existed. The wedge is filled with nothing and
   * hit-tested through `pointer-events="fill"`, which reads its interior whatever its
   * paint and never its unpainted stroke, so its edges are the ones computed here; it
   * paints in no theme and in no forced-colors palette.
   */
  protected readonly hits = computed(() => {
    if (!this.pie() || !this.tooltip() || this.state()) return [];
    const min = Math.min(MAX_HIT_ANGLE, HIT_PX / (this.size() / 2));
    const drawn = this.slices()
      .map((slice, index) => ({ index, start: slice.startAngle, end: slice.endAngle }))
      .filter(slice => slice.end - slice.start > 0);
    const count = drawn.length;
    if (count < 2) return [];
    const width = drawn.map(slice => slice.end - slice.start);
    const thin = width.map(w => w < min);
    const prev = (k: number): number => (k - 1 + count) % count;
    const next = (k: number): number => (k + 1) % count;
    // What each wider slice can give away and still keep `min` of its own.
    const spare = width.map((w, k) => (thin[k] ? 0 : w - min));
    // How far each sliver asks to reach on each side: into a wider neighbour only.
    const ask = width.map((w, k) => {
      if (!thin[k]) return { before: 0, after: 0 };
      const before = !thin[prev(k)];
      const after = !thin[next(k)];
      const share = (min - w) / (before && after ? 2 : 1);
      return { before: before ? share : 0, after: after ? share : 0 };
    });
    const reach = width.map(() => ({ before: 0, after: 0 }));
    // A wider slice is reached into by the sliver before it, past its own end, and by the
    // one after it, past its own start — the same sliver from both sides when there are
    // only two slices. Each gets what it asks while the two fit in the spare; past that,
    // at least half of it, and more where the other asks for less.
    width.forEach((_, j) => {
      if (thin[j]) return;
      const fromBefore = thin[prev(j)] ? ask[prev(j)].after : 0;
      const fromAfter = thin[next(j)] ? ask[next(j)].before : 0;
      const claims = (fromBefore > 0 ? 1 : 0) + (fromAfter > 0 ? 1 : 0);
      if (claims === 0) return;
      const fair = spare[j] / claims;
      const toBefore = Math.min(fromBefore, Math.max(fair, spare[j] - fromAfter));
      const toAfter = Math.min(fromAfter, Math.max(fair, spare[j] - fromBefore));
      if (toBefore > 0) reach[prev(j)].after = toBefore;
      if (toAfter > 0) reach[next(j)].before = toAfter;
      spare[j] = Math.max(0, spare[j] - toBefore - toAfter);
    });
    // What one side could not give, the other side gives out of what it has left.
    width.forEach((w, k) => {
      if (!thin[k]) return;
      let short = min - w - reach[k].before - reach[k].after;
      for (const [side, j] of [
        ['before', prev(k)],
        ['after', next(k)],
      ] as const) {
        if (short <= 0 || thin[j]) continue;
        const more = Math.min(short, spare[j]);
        reach[k][side] += more;
        spare[j] -= more;
        short -= more;
      }
    });
    return drawn.flatMap((slice, k) => {
      const { before, after } = reach[k];
      if (!thin[k] || before + after <= 0) return [];
      return [{ index: slice.index, path: this.arcPath(slice.start - before, slice.end + after) }];
    });
  });

  /**
   * The legend's rows: every slice, hidden ones included, each with its own figure — a
   * negative one included, which draws no slice — and no value at all for a segment whose
   * value is not a number.
   */
  protected readonly legendItems = computed<readonly WrChartLegendItem[]>(() =>
    this.slices().map(({ label, color, text }) => ({ label, color, value: text === '' ? null : text }))
  );

  /**
   * Whether the chart draws its legend: unless `legendPosition` is `none` or `showLegend`
   * is off, and under `showLegend="auto"` only with two segments or more, since a single
   * slice has nothing to tell apart.
   */
  protected readonly legendShown = computed(() => {
    const show = this.showLegend();
    const rows = this.legendItems().length;
    if (show === false || rows === 0 || this.legendPosition() === 'none') return false;
    return show === true || rows > 1;
  });

  /** Whether the legend comes before the drawing, in the DOM as on screen: above it, or at inline start. */
  protected readonly legendFirst = computed(() => {
    const position = this.legendPosition();
    return position === 'top' || position === 'start';
  });

  /** Whether the legend sits beside the drawing rather than above or below it. */
  protected readonly legendSide = computed(() => {
    const position = this.legendPosition();
    return position === 'start' || position === 'end';
  });

  /**
   * Whether the chart has nothing to draw: no segment, or none with a share to take. A
   * slice hidden from the legend still counts, so hiding every slice is not "No data".
   */
  private readonly empty = computed(() => this.segments().every(s => weight(s.value) === 0));

  /** What the chart shows in place of its slices, or `null` while it draws them. */
  protected readonly state = useChartState({
    loading: this.loading,
    error: this.error,
    empty: this.empty,
    emptyLabel: this.emptyLabel,
    loadingLabel: this.loadingLabel,
    errorLabel: this.errorLabel,
  });

  /**
   * The whole ring, or the whole disc of a pie, as one path: the frame the chart keeps
   * while it has no slice to draw - under a state, or with every slice hidden.
   */
  protected readonly track = computed(() =>
    this.state() || this.slices().every(slice => !slice.path) ? this.arcPath(0, Math.PI * 2) : null
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
    // No slice is drawn under a state, so a chip open on one lets go.
    if (!slice?.path || !svg || this.state()) return null;
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
