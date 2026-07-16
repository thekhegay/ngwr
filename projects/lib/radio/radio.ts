/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { WrIcon, type WrIconName } from 'ngwr/icon';
import { randomId } from 'ngwr/utils';

import { WR_RADIO_GROUP } from './tokens';

/**
 * Single-choice option. Must be a child of `<wr-radio-group>`.
 *
 * @example
 * ```html
 * <wr-radio-group [(ngModel)]="size">
 *   <wr-radio value="sm">Small</wr-radio>
 *   <wr-radio value="md">Medium</wr-radio>
 *   <wr-radio value="lg">Large</wr-radio>
 * </wr-radio-group>
 * ```
 *
 * @see https://ngwr.dev/reference/components/radio
 */
export type WrRadioSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'wr-radio',
  templateUrl: './radio.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIcon],
})
export class WrRadio {
  /** Stable id used to associate the native input with its label. */
  readonly id = input<string>(randomId('wr-radio'));

  /** Value selected when this radio is checked. */
  readonly value = input.required<unknown>();

  /**
   * Optional icon name rendered inside the dot when checked, in place of the
   * default solid circle. Use any registered NGWR icon.
   */
  readonly icon = input<WrIconName | null>(null);

  /** Control size — shares the `--wr-control-*` contract. @default 'md' */
  readonly size = input<WrRadioSize>('md');

  /**
   * Disable just this option. The group can also be disabled as a whole via
   * `<wr-radio-group disabled>`; either source disables this radio.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  private readonly group = inject(WR_RADIO_GROUP, { optional: true });

  constructor() {
    if (!this.group) {
      throw new Error('[NGWR] <wr-radio> must be used inside <wr-radio-group>.');
    }
  }

  protected readonly name = computed(() => this.group?.name() ?? '');
  protected readonly checked = computed(() => this.group?.value() === this.value());
  /** Effective disabled — this option's own `disabled` or the group's. */
  protected readonly isDisabled = computed(() => this.disabled() || (this.group?.isDisabled() ?? false));

  protected readonly classes = computed(() => {
    const parts = ['wr-radio'];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-radio--${size}`);
    if (this.checked()) parts.push('wr-radio--checked');
    if (this.isDisabled()) parts.push('wr-radio--disabled');
    if (this.icon()) parts.push('wr-radio--has-icon');
    return parts.join(' ');
  });

  protected onSelect(): void {
    if (this.isDisabled()) return;
    this.group?.select(this.value());
  }

  protected onBlur(): void {
    this.group?.touch();
  }
}
