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
} from '@angular/core';

import { useI18nText } from 'ngwr/i18n';
import type { WrColor } from 'ngwr/theme';
import { wrCheckStyles } from 'ngwr/utils';

import type { WrProgressMark } from './types';

/** Least clear space between two mark labels, in pixels, before the later one is hidden. */
const LABEL_GAP = 4;

/** Size of a `<wr-progress>`. */
export type WrProgressSize = 'sm' | 'md' | 'lg';

/**
 * Horizontal progress bar.
 *
 * @example
 * ```html
 * <wr-progress [value]="42" />
 * <wr-progress color="success" [value]="80" />
 * <wr-progress indeterminate />
 * <wr-progress size="sm" [value]="40" [marks]="[{ value: 25, label: 'Q1' }, { value: 50, label: 'Q2' }]" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/progress
 */
@Component({
  selector: 'wr-progress',
  templateUrl: './progress.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'indeterminate() ? null : clamped()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    class: 'wr-progress',
    '[class]': 'classes()',
  },
})
export class WrProgress {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('progress');

    afterRenderEffect({
      read: () => {
        this.labelledMarks();
        this.fitLabels();
      },
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.fitLabels());
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Accessible name — `role="progressbar"` needs one. Falls back to `progress.label`. */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = useI18nText(this.ariaLabel, 'progress.label', 'Progress');

  /**
   * Bar color.
   *
   * @default 'primary'
   */
  readonly color = input<WrColor>('primary');

  /**
   * Bar thickness: 4px, 8px or 12px, through `--wr-progress-height`.
   *
   * @default 'md'
   */
  readonly size = input<WrProgressSize>('md');

  /**
   * Progress value, clamped to `[0, 100]`.
   *
   * @default 0
   */
  readonly value = input(0, { transform: (v: unknown): number => coerceNumberProperty(v, 0) });

  /**
   * Show that work is running without saying how far it has got: the bar sweeps,
   * `value` is ignored and `aria-valuenow` is left off, which is how a
   * progressbar says its value is unknown.
   *
   * @default false
   */
  readonly indeterminate = input(false, { transform: coerceBooleanProperty });

  /**
   * Points drawn on the track: a tick at each `value`, on the 0 to 100 scale of
   * `value`, and its `label` under the bar when it has one. A mark outside the
   * range, or with no number, is not drawn. Positions mirror under `dir="rtl"`.
   *
   * A label stays inside the bar: centred on its tick mid-track, leaning inward
   * towards the ends. One that would touch the label before it is hidden and
   * its tick kept, so the earlier mark wins.
   *
   * Marks do not change what the progressbar announces. The ticks are hidden
   * from assistive tech and ARIA treats the content of a progressbar as
   * presentational, so a label that matters also belongs in `ariaLabel`.
   * `indeterminate` draws no marks: it has no scale to place them on.
   *
   * @example
   * ```html
   * <wr-progress [value]="40" [marks]="[{ value: 25, label: '1 Mar' }, { value: 75, label: '1 Sep' }]" />
   * ```
   *
   * @default []
   */
  readonly marks = input<readonly WrProgressMark[]>([]);

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, this.value())));

  /** The marks inside the range, in value order: none while the value is unknown. */
  protected readonly drawnMarks = computed(() =>
    this.indeterminate()
      ? []
      : this.marks()
          .filter(mark => mark.value >= 0 && mark.value <= 100)
          .sort((a, b) => a.value - b.value)
          // The label's row: the free space beside the text, shared in the mark's own ratio.
          .map(mark => ({ ...mark, columns: `${mark.value}fr auto ${100 - mark.value}fr` }))
  );
  protected readonly labelledMarks = computed(() => this.drawnMarks().filter(mark => !!mark.label));

  /** Indexes into `labelledMarks` of the labels hidden for touching the one before. */
  protected readonly crowded = signal<ReadonlySet<number>>(new Set());

  protected readonly classes = computed(() => {
    const parts = [`wr-progress--${this.color()}`];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-progress--${size}`);
    if (this.indeterminate()) parts.push('wr-progress--indeterminate');
    if (this.drawnMarks().length) parts.push('wr-progress--marks');
    if (this.labelledMarks().length) parts.push('wr-progress--mark-labels');
    return parts.join(' ');
  });

  /** Hide each label that would touch the last one still shown. Measured, so it follows the bar's width. */
  private fitLabels(): void {
    const hidden = new Set<number>();
    let last: DOMRect | null = null;
    this.host.querySelectorAll('.wr-progress__mark-text').forEach((text, index) => {
      const rect = text.getBoundingClientRect();
      // Not laid out (a hidden pane, a detached host): nothing to compare.
      if (!rect.width) return;
      if (last && rect.left < last.right + LABEL_GAP && last.left < rect.right + LABEL_GAP) hidden.add(index);
      else last = rect;
    });

    const current = this.crowded();
    if (hidden.size !== current.size || [...hidden].some(index => !current.has(index))) this.crowded.set(hidden);
  }
}
