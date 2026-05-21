/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, model } from '@angular/core';

import { WrIconComponent } from 'ngwr/icon';

import type { WrSegmentedOption } from './types';

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
 * @see https://ngwr.dev/docs/components/segmented
 */
@Component({
  selector: 'wr-segmented',
  templateUrl: './segmented.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()', role: 'group' },
  imports: [WrIconComponent],
})
export class WrSegmentedComponent<T = unknown> {
  /** The segments to render. */
  readonly options = input.required<readonly WrSegmentedOption<T>[]>();

  /** Two-way bindable selected value. */
  readonly value = model<T | null>(null);

  /** Disable the whole control. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  protected readonly classes = computed(() => {
    const parts = ['wr-segmented'];
    if (this.disabled()) parts.push('wr-segmented--disabled');
    return parts.join(' ');
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
