/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, afterNextRender, computed, input, model, signal } from '@angular/core';

import { WrIcon } from 'ngwr/icon';

import type { WrSegmentedOption } from './interfaces';

/**
 * Single-choice picker rendered as a segmented control. Two-way binds
 * the selected `value`.
 *
 * @example
 * ```html
 * <wr-segmented
 *   [options]="[
 *     { value: 'day',  label: 'Day' },
 *     { value: 'week', label: 'Week' },
 *     { value: 'month', label: 'Month' },
 *   ]"
 *   [(value)]="range"
 * />
 * ```
 *
 * @see https://ngwr.dev/reference/components/segmented
 */
export type WrSegmentedSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-segmented',
  templateUrl: './segmented.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', '[style]': 'thumbStyle()', role: 'group' },
  imports: [WrIcon],
})
export class WrSegmented<T = unknown> {
  /** The segments to render. */
  readonly options = input.required<readonly WrSegmentedOption<T>[]>();

  /** Two-way bindable selected value. */
  readonly value = model<T | null>(null);

  /** Disable the whole control. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrSegmentedSize>('md');

  /** Index of the selected option, or `-1` when nothing is selected. */
  protected readonly selectedIndex = computed(() => {
    const v = this.value();
    return this.options().findIndex(o => o.value === v);
  });

  /** Flips true after the first paint so the thumb only animates user-driven changes, not the initial snap. */
  private readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => this.mounted.set(true));
  }

  protected readonly classes = computed(() => {
    const parts = ['wr-segmented'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-segmented--${size}`);
    if (this.disabled()) parts.push('wr-segmented--disabled');
    if (this.selectedIndex() < 0) parts.push('wr-segmented--unselected');
    if (this.mounted()) parts.push('wr-segmented--mounted');
    return parts.join(' ');
  });

  /** Inline CSS vars driving the sliding thumb position. */
  protected readonly thumbStyle = computed<Record<string, string>>(() => {
    const i = Math.max(0, this.selectedIndex());
    const count = Math.max(1, this.options().length);
    return {
      '--wr-segmented-thumb-index': `${i}`,
      '--wr-segmented-thumb-count': `${count}`,
    };
  });

  protected isSelected(option: WrSegmentedOption<T>): boolean {
    return this.value() === option.value;
  }

  protected select(option: WrSegmentedOption<T>): void {
    if (this.disabled() || option.disabled || this.isSelected(option)) return;
    this.value.set(option.value);
  }

  protected trackByValue(_: number, option: WrSegmentedOption<T>): unknown {
    return option.value;
  }
}
