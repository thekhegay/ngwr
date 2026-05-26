/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input } from '@angular/core';

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
 * @see https://ngwr.dev/docs/components/radio
 */
@Component({
  selector: 'wr-radio',
  templateUrl: './radio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  private readonly group = inject(WR_RADIO_GROUP, { optional: true });

  constructor() {
    if (!this.group) {
      throw new Error('[NGWR] <wr-radio> must be used inside <wr-radio-group>.');
    }
  }

  protected readonly name = computed(() => this.group?.name() ?? '');
  protected readonly checked = computed(() => this.group?.value() === this.value());
  protected readonly disabled = computed(() => this.group?.isDisabled() ?? false);

  protected readonly classes = computed(() => {
    const parts = ['wr-radio'];
    if (this.checked()) parts.push('wr-radio--checked');
    if (this.disabled()) parts.push('wr-radio--disabled');
    if (this.icon()) parts.push('wr-radio--has-icon');
    return parts.join(' ');
  });

  protected onSelect(): void {
    this.group?.select(this.value());
  }

  protected onBlur(): void {
    this.group?.touch();
  }
}
