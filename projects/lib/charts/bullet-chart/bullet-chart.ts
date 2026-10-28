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
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { chartAxis, useChartNumbers } from 'ngwr/charts/core';
import { readI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { useChartTooltip } from 'ngwr/popover';
import { clamp, round } from 'ngwr/utils';

/**
 * Instance counter for the sub-label's id, which the drawing's `aria-describedby` names.
 * Counted rather than `randomId()`, so the prerendered id is the one the browser renders
 * again — the reason `wr-tabs` and `wr-graph` count.
 */
let bulletUid = 0;

/** A finite number, or `null` for anything else: a missing reading is drawn as none, never as zero. */
const finiteOrNull = (v: unknown): number | null => {
  const value = coerceNumberProperty(v, Number.NaN);
  return Number.isFinite(value) ? value : null;
};

/** A computed colour that paints nothing — a bar not laid out, or no stylesheet loaded. */
const TRANSPARENT = /^(?:transparent|rgba\(0, 0, 0, 0\))$/;

/** The least room kept between two tick labels, in px. */
const TICK_GAP = 8;

/** The tick counts the scale tries, most first, while its labels overlap: what `chartAxis` aims for. */
const TICK_COUNTS = [4, 3, 2, 1] as const;

/** A share of the scale for an inline style, to four decimals with `-0` folded to `0`, so the style stays short. */
const short = (value: number): number => round(value, 4) || 0;

/** One qualitative band as drawn: where it starts and how much of the scale it covers, both as shares from 0 to 1. */
interface Band {
  /** Its position in the sorted `ranges`, which decides its shade. */
  readonly index: number;
  readonly start: number;
  readonly size: number;
  /** How far its shade has moved from the strongest grey towards the faintest, as a CSS percentage. */
  readonly mix: string;
}

/** A tick of the scale: its label, its share of the scale, and which end of the scale it sits on, if either. */
interface Tick {
  readonly label: string;
  readonly at: number;
  readonly edge: 'start' | 'end' | null;
}

/** What a browser has laid out, in px: the drawing's width, and a tick label's width per character. */
interface Measured {
  readonly width: number;
  readonly char: number;
}

/**
 * Bullet chart: one measure against a target, over qualitative bands — Stephen Few's
 * bullet graph, the compact replacement for a dashboard gauge. Horizontal, one line high.
 * HTML and CSS only — no external dependency.
 *
 * @example
 * ```html
 * <wr-bullet-chart label="Revenue" subLabel="USD, thousands" [value]="270" [target]="250" [ranges]="[150, 225, 300]" />
 * ```
 *
 * **What is drawn.** `ranges` are the upper limits of the qualitative bands — poor,
 * satisfactory, good — drawn as stepped greys from the theme's neutral roles, the
 * strongest nearest zero and each band after it fainter, so they read as steps in
 * LIGHTNESS and survive greyscale. The value is a bar a third of the line high, from zero;
 * the target is a perpendicular marker. The two are told apart by shape, not by colour,
 * and both are drawn in the text colour, which keeps 3:1 against the strongest band in
 * either theme where the primary blue does not.
 *
 * **The scale** starts at zero, or lower where a value, the target or a range limit is
 * negative, and ends at `max` — by default the largest of the value, the target and the
 * ranges, exactly, so the last band reaches the end. A value past a fixed `max` is drawn
 * to the end and announced as itself. A narrow drawing prints fewer ticks, so no two of
 * their labels touch. Under RTL the chart mirrors, as a progress bar does:
 * the label is on the right and the bar grows leftwards.
 *
 * **What a screen reader gets.** The drawing is one `role="img"` named by a sentence —
 * "Revenue: 270 of target 250" (`bulletChart.summary`) — and described by the sub-label.
 * The label and the sub-label beside it are `aria-hidden`, since the sentence and the
 * description already carry them, and so are the scale's ticks. The bands have no names,
 * so they are not announced: say what they mean in `ariaLabel` where it matters. There is
 * no data table, since there is one number, and no tab stop.
 *
 * @see https://ngwr.dev/charts/bullet-chart
 */
@Component({
  selector: 'wr-bullet-chart',
  templateUrl: './bullet-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-bullet-chart',
    // The label column exists only when there is something to put in it; without one the
    // drawing takes the whole width rather than leaving a gap where a column would be.
    '[class.wr-bullet-chart--labelled]': 'labelled()',
  },
})
export class WrBulletChart {
  /**
   * The measure. A value that is not a finite number — `null` while it loads — draws no
   * bar, and the chart is announced as having no value rather than as zero.
   */
  readonly value = input.required<number | null, unknown>({ transform: finiteOrNull });

  /**
   * The comparative measure, drawn as a marker across the line. `null`, or anything that
   * is not a finite number, draws none and leaves it out of the accessible name.
   * @default null
   */
  readonly target = input<number | null, unknown>(null, { transform: finiteOrNull });

  /**
   * The upper limit of each qualitative band, in any order: `[150, 225, 300]` draws a band
   * from the scale's start to 150, one from 150 to 225 and one from 225 to 300. They are
   * sorted, a repeated limit counts once, and one that is not a finite number is dropped.
   * The band nearest zero is the strongest grey and each one after it fainter, between
   * `--wr-bullet-chart-range-start` and `--wr-bullet-chart-range-end`. Few recommends no
   * more than five.
   *
   * The first band is everything below the first limit, so it has room only where the
   * scale reaches below that limit. A negative first limit lower than both the value and
   * the target is where the scale starts, which leaves that band no room: it is not drawn,
   * and the drawing opens with the second band and its paler grey. Where the scale runs on
   * past the last limit, a rule marks where the last band ends.
   */
  readonly ranges = input<readonly number[]>([]);

  /**
   * The end of the scale. `0` takes the largest of `value`, `target` and `ranges`, so the
   * last band reaches the end; a value above `0` fixes it, and anything past it is drawn to
   * the end — the accessible name and the tooltip still give its own figure. @default 0
   */
  readonly max = input(0, {
    transform: (v: unknown): number => {
      const value = coerceNumberProperty(v, 0);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    },
  });

  /**
   * What is measured, shown at inline start beside the drawing, ellipsised past
   * `--wr-bullet-chart-label-max-width`. It heads the tooltip and opens the accessible
   * name; without it the name opens with `bulletChart.label` ("Bullet chart").
   */
  readonly label = input<string | null>(null);

  /**
   * A line under the label — the unit, the period. The drawing is described by it
   * (`aria-describedby`), so a screen reader hears it after the name.
   */
  readonly subLabel = input<string | null>(null);

  /**
   * Accessible name of the drawing, in place of the sentence the chart writes itself —
   * "Revenue: 270 of target 250". Give one where the bands mean something a reader needs,
   * since they have no names of their own.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Writes every number the chart shows: the scale's ticks, the tooltip and the
   * accessible name. `null` uses `Intl.NumberFormat` in `LOCALE_ID`, with compact ticks
   * (`1.2K`) unless the full numbers are shorter.
   */
  readonly valueFormat = input<((value: number) => string) | null>(null);

  /** Show the scale's ticks under the drawing. @default true */
  readonly showScale = input(true, { transform: coerceBooleanProperty });

  /**
   * Show a tooltip with the label, the value and the target while the pointer is over the
   * drawing. Pointer only: the accessible name says the same. @default true
   */
  readonly tooltip = input(true, { transform: coerceBooleanProperty });

  /** The exact figures and the scale's compact ticks, in `LOCALE_ID` unless `valueFormat` is given. */
  private readonly numbers = useChartNumbers(this.valueFormat);

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The drawing's laid-out width and a tick label's width per character, once a browser
   * has measured them: whether the ticks fit is a question of pixels. Until then — on the
   * server and in the first paint — the scale draws its usual count.
   */
  private readonly measured = signal<Measured | null>(null);

  /** The drawing's width as the observer last reported it, in px; 0 until it has. */
  private trackWidth = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Measured after render, so nothing here touches the DOM before a browser has one.
    afterNextRender(() => {
      const track = this.track()?.nativeElement;
      if (!track || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        const width = entry.contentRect.width;
        // A hidden chart measures nothing; keep the last reading rather than thin to it.
        if (width <= 0) return;
        this.trackWidth = width;
        this.measure();
      });
      observer.observe(track);
      let destroyed = false;
      destroyRef.onDestroy(() => {
        destroyed = true;
        observer.disconnect();
      });
      // A web font arriving after the first measurement widens the labels and leaves the
      // drawing as wide as it was, so the observer never hears of it.
      if ('fonts' in document) {
        void document.fonts.ready.then(() => {
          if (!destroyed) this.measure();
        });
      }
    });
    // Labels that first appear after the drawing was measured — `showScale` switched on —
    // have never been measured either, and the drawing's width does not change for them.
    // Only while no width per character is known: measuring again on every change of the
    // ticks would take it off the labels a thinner scale prints, and could thin back and
    // forth between two counts.
    afterRenderEffect(() => {
      if (this.ticks().length === 0 || this.measured()) return;
      this.measure();
    });
  }

  /**
   * Read a tick label's width per character off the labels as laid out, and keep it with
   * the drawing's width. Per character, from the label that is widest for its length: the
   * digits are tabular, so the figure holds for the labels a coarser scale would print too.
   */
  private measure(): void {
    const width = this.trackWidth;
    if (width <= 0) return;
    let char = 0;
    for (const label of this.host.nativeElement.querySelectorAll('.wr-bullet-chart__tick-label')) {
      const length = label.textContent?.trim().length ?? 0;
      if (length > 0) char = Math.max(char, label.getBoundingClientRect().width / length);
    }
    const last = untracked(this.measured);
    // No label laid out — `showScale` off — measures nothing: keep what is known.
    if (char <= 0) char = last?.char ?? 0;
    if (char <= 0 || (last?.width === width && last.char === char)) return;
    this.measured.set({ width, char });
  }

  /** The id of the sub-label, which describes the drawing. */
  protected readonly subLabelId = `wr-bullet-chart-${bulletUid++}-sub-label`;

  /** Whether there is a label column to draw. */
  protected readonly labelled = computed(() => !!this.label() || !!this.subLabel());

  /** The range limits as drawn: finite, sorted, and each once. */
  private readonly limits = computed(() =>
    [...new Set(this.ranges().filter(limit => Number.isFinite(limit)))].sort((a, b) => a - b)
  );

  /**
   * The scale. It starts at zero, or at the lowest of the value, the target and the first
   * range limit where that is below zero, and ends at a fixed `max` or else at the largest
   * of the three. With nothing above the start to reach, the empty 0 to 1 frame.
   */
  private readonly scale = computed(() => {
    const value = this.value() ?? 0;
    const target = this.target() ?? 0;
    const limits = this.limits();
    const min = Math.min(0, value, target, limits[0] ?? 0);
    const explicit = this.max();
    const max = explicit > 0 ? explicit : Math.max(0, value, target, limits.at(-1) ?? 0);
    return max > min ? { min, max } : { min: 0, max: 1 };
  });

  /** A number's share of the scale from its start, held to the scale. */
  private share(value: number): number {
    const { min, max } = this.scale();
    return clamp((value - min) / (max - min), 0, 1);
  }

  /**
   * The bands, from the scale's start: each from the limit before it — the first from the
   * scale's start, so a negative value sits in the first band — to its own limit, held to
   * the scale. A band the scale leaves no room for is not drawn, and keeps its shade for
   * the bands that are: shades follow the limits given, not the bands that fit.
   */
  protected readonly bands = computed<readonly Band[]>(() => {
    const limits = this.limits();
    const { min } = this.scale();
    const last = limits.length - 1;
    return limits.flatMap((limit, index) => {
      // Both ends rounded before the size is taken between them, so a band ends exactly
      // where the next begins, and the last one exactly at 1 — where the rule past it is
      // clipped.
      const start = short(this.share(index === 0 ? min : limits[index - 1]));
      const end = short(this.share(limit));
      if (end <= start) return [];
      const mix = last === 0 ? 0 : (index / last) * 100;
      return [{ index, start, size: short(end - start), mix: `${round(mix, 2)}%` }];
    });
  });

  /**
   * The value's bar, from zero to the value — leftwards of zero for a negative one — or
   * `null` with no value. A zero is still drawn, as a sliver, since it is a reading.
   */
  protected readonly bar = computed(() => {
    const value = this.value();
    if (value === null) return null;
    const zero = this.share(0);
    const at = this.share(value);
    return { start: short(Math.min(zero, at)), size: short(Math.abs(at - zero)), negative: value < 0 };
  });

  /** The target marker's share of the scale, or `null` with no target. */
  protected readonly targetAt = computed(() => {
    const target = this.target();
    return target === null ? null : short(this.share(target));
  });

  /**
   * The scale's ticks, from its start: `chartAxis` over the scale with the ticks it would
   * draw past either end left out, so the scale ends where `max` says rather than on the
   * next round number. Decided for the whole scale, as an axis' ticks are
   * (`useChartNumbers().ticks`). A tick on either end is aligned inwards, so its label
   * stays over the drawing — and once a browser has measured it, so is a tick near an end
   * whose centred label would reach past it.
   *
   * A narrow drawing gets fewer: once a browser has measured it, the scale aims for four
   * gaps, then three, two and one, and keeps the first whose labels stand at least 8px
   * apart, each as wide as its characters at the measured width per character.
   */
  protected readonly ticks = computed<readonly Tick[]>(() => {
    if (!this.showScale()) return [];
    const measured = this.measured();
    let ticks: readonly Tick[] = [];
    for (const count of TICK_COUNTS) {
      ticks = this.ticksFor(count, measured);
      if (!measured || this.fits(ticks, measured)) break;
    }
    return ticks;
  });

  /**
   * The scale's ticks for `chartAxis` aiming at `count` gaps. A tick on an end is aligned
   * inwards; with a measurement, so is one whose label, centred on it, would cross an end.
   */
  private ticksFor(count: number, measured: Measured | null): readonly Tick[] {
    const { min, max } = this.scale();
    const axis = chartAxis(min, max, { includeZero: true, tickCount: count });
    const values = axis.ticks.filter(tick => tick >= min - 1e-9 && tick <= max + 1e-9).reverse();
    const labels = this.numbers.ticks(values, axis.step);
    return values.map((value, i) => {
      const at = short(this.share(value));
      const half = measured ? (labels[i].length * measured.char) / 2 : 0;
      const x = measured ? at * measured.width : 0;
      const edge =
        at <= 0 || (measured && x - half < 0)
          ? 'start'
          : at >= 1 || (measured && x + half > measured.width)
            ? 'end'
            : null;
      return { label: labels[i], at, edge };
    });
  }

  /** Whether each tick label ends at least `TICK_GAP` before the next begins, placed as the stylesheet places them. */
  private fits(ticks: readonly Tick[], { width, char }: Measured): boolean {
    let end = Number.NEGATIVE_INFINITY;
    for (const tick of ticks) {
      const at = tick.at * width;
      const size = tick.label.length * char;
      const start = tick.edge === 'start' ? at : tick.edge === 'end' ? at - size : at - size / 2;
      if (start < end + TICK_GAP) return false;
      end = start + size;
    }
    return true;
  }

  /** The accessible name's subject: the label, else the catalog's name for the chart. */
  private readonly subject = useI18nText(this.label, 'bulletChart.label', 'Bullet chart');

  private readonly summaryText = useI18nFormatter('bulletChart.summary', '{{label}}: {{value}} of target {{target}}');

  private readonly summaryNoTargetText = useI18nFormatter('bulletChart.summaryNoTarget', '{{label}}: {{value}}');

  private readonly summaryNoValueText = useI18nFormatter(
    'bulletChart.summaryNoValue',
    '{{label}}: no value, target {{target}}'
  );

  private readonly noValueText = useI18nFormatter('bulletChart.noValue', '{{label}}: no value');

  /** The tooltip's name for the target's row. */
  private readonly targetWord = readI18nText('bulletChart.target', 'Target');

  /**
   * The drawing's accessible name: `ariaLabel`, or a sentence with the value and the
   * target written as the tooltip writes them — one of four, so a missing value or target
   * is said rather than left as a gap in a template.
   */
  protected readonly resolvedAriaLabel = computed(() => {
    const custom = this.ariaLabel();
    if (custom) return custom;
    const label = this.subject();
    const value = this.value();
    const target = this.target();
    if (value === null) {
      return target === null
        ? this.noValueText({ label })
        : this.summaryNoValueText({ label, target: this.numbers.value(target) });
    }
    return target === null
      ? this.summaryNoTargetText({ label, value: this.numbers.value(value) })
      : this.summaryText({ label, value: this.numbers.value(value), target: this.numbers.value(target) });
  });

  /**
   * One tooltip for the whole chart: the label as its heading with the value beside it and
   * the bar's own paint as the swatch, then a row for the target. It points at the end of
   * the bar from above — or at the target with no value — so the arrow marks the reading.
   * The label is the `label` input, never the catalog's fallback, which names the kind of
   * chart rather than the measure. With neither a value nor a target there is nothing to
   * say, and it does not open.
   */
  protected readonly tip = useChartTooltip(this.tooltip, () => {
    const track = this.track()?.nativeElement;
    const value = this.value();
    const target = this.target();
    if (!track || (value === null && target === null)) return null;
    const box = track.getBoundingClientRect();
    const at = this.share(value ?? target!);
    // The drawing mirrors under RTL, so its start is the box's right edge there.
    const rtl = getComputedStyle(track).direction === 'rtl';
    // The bar's paint as laid out, whatever its hook was set to: the chip renders under
    // `<body>`, where the chart's own custom properties do not reach.
    const bar = value === null ? null : track.querySelector('.wr-bullet-chart__bar');
    const paint = bar ? getComputedStyle(bar).backgroundColor : '';
    return {
      datum: {
        label: this.label() ?? undefined,
        value: value === null ? '' : this.numbers.value(value),
        color: paint && !TRANSPARENT.test(paint) ? paint : undefined,
        rows: target === null ? [] : [{ label: this.targetWord(), value: this.numbers.value(target) }],
      },
      anchor: { x: rtl ? box.right - at * box.width : box.left + at * box.width, y: box.top },
    };
  });
}
